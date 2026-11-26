import { supabase, isSupabaseConfigured } from './supabase';
import {
  Complaint,
  ComplaintVisibility,
  ComplaintCategory,
  ComplaintUrgency,
} from '@/types';
import { INITIAL_COMPLAINTS, CURRENT_USER } from './mockData';
import { uploadMediaToR2 } from './storage';
import { getAuthenticatedUserId } from './auth';

function detectMimeType(uri: string): string {
  const clean = uri.toLowerCase().split('?')[0];
  if (clean.endsWith('.pdf')) return 'application/pdf';
  if (clean.endsWith('.mp4')) return 'video/mp4';
  if (clean.endsWith('.mov')) return 'video/quicktime';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
}

let localComplaints: Complaint[] = [...INITIAL_COMPLAINTS];

export const complaintsService = {
  async getComplaints(
    visibility: ComplaintVisibility,
    options?: { before?: string; limit?: number }
  ): Promise<{ complaints: Complaint[]; nextCursor: string | null }> {
    const limit = options?.limit || 20;
    const before = options?.before;

    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from('complaints')
          .select('*, user:profiles(*)')
          .eq('visibility', visibility)
          .order('upvotes_count', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(limit);

        if (visibility === 'admin') {
          const uid = await getAuthenticatedUserId();
          query = query.eq('user_id', uid);
        }

        if (before) {
          query = query.lt('created_at', before);
        }

        const { data, error } = await query;
        if (!error && data) {
          const nextCursor = data.length === limit ? data[data.length - 1].created_at : null;
          return { complaints: data, nextCursor };
        }
        return { complaints: [], nextCursor: null };
      } catch {
        return { complaints: [], nextCursor: null };
      }
    }

    let filtered = localComplaints
      .filter((c) => {
        if (visibility === 'admin') {
          return c.visibility === 'admin' && c.user_id === CURRENT_USER.id;
        }
        return c.visibility === 'public';
      })
      .sort((a, b) => b.upvotes_count - a.upvotes_count);

    if (before) {
      filtered = filtered.filter((c) => new Date(c.created_at) < new Date(before));
    }

    const page = filtered.slice(0, limit);
    const nextCursor = filtered.length > limit ? page[page.length - 1].created_at : null;
    return { complaints: page, nextCursor };
  },

  async getAllComplaintsFlat(visibility: ComplaintVisibility): Promise<Complaint[]> {
    const { complaints } = await this.getComplaints(visibility, { limit: 100 });
    return complaints;
  },

  async fileComplaint(params: {
    visibility: ComplaintVisibility;
    category: ComplaintCategory;
    urgency: ComplaintUrgency;
    title: string;
    description: string;
    mediaUrl?: string;
  }): Promise<Complaint> {
    const userId = await getAuthenticatedUserId();

    let finalMediaUrl = params.mediaUrl;
    if (params.mediaUrl && !params.mediaUrl.startsWith('http')) {
      const mime = detectMimeType(params.mediaUrl);
      finalMediaUrl = await uploadMediaToR2(params.mediaUrl, 'complaints', mime);
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('complaints')
        .insert({
          user_id: userId,
          visibility: params.visibility,
          category: params.category,
          urgency: params.urgency,
          title: params.title,
          description: params.description,
          media_url: finalMediaUrl || null,
          status: 'Open',
        })
        .select('*, user:profiles(*)')
        .single();

      if (error) throw new Error(`Failed to file complaint: ${error.message}`);
      if (data) return { ...data, is_upvoted: false };
    }

    const now = new Date().toISOString();
    const newComplaint: Complaint = {
      id: `comp-${Date.now()}`,
      user_id: userId || CURRENT_USER.id,
      visibility: params.visibility,
      category: params.category,
      urgency: params.urgency,
      title: params.title,
      description: params.description,
      media_url: finalMediaUrl,
      status: 'Open',
      admin_note: undefined,
      upvotes_count: 0,
      is_upvoted: false,
      created_at: now,
      updated_at: now,
      user: CURRENT_USER,
    };

    localComplaints = [newComplaint, ...localComplaints];
    return newComplaint;
  },

  async toggleUpvote(complaintId: string): Promise<{ isUpvoted: boolean; count: number }> {
    const userId = await getAuthenticatedUserId();

    if (isSupabaseConfigured) {
      const { data: isNowUpvoted, error: rpcError } = await supabase.rpc('toggle_complaint_upvote', {
        p_complaint_id: complaintId,
        p_user_id: userId,
      });

      if (rpcError) throw new Error(`Upvote failed: ${rpcError.message}`);

      const { count } = await supabase
        .from('complaint_upvotes')
        .select('*', { count: 'exact', head: true })
        .eq('complaint_id', complaintId);

      return { isUpvoted: Boolean(isNowUpvoted), count: count ?? 0 };
    }

    const compIndex = localComplaints.findIndex((c) => c.id === complaintId);
    if (compIndex === -1) return { isUpvoted: false, count: 0 };

    const comp = localComplaints[compIndex];
    const newIsUpvoted = !comp.is_upvoted;
    const newCount = newIsUpvoted ? comp.upvotes_count + 1 : Math.max(0, comp.upvotes_count - 1);

    localComplaints[compIndex] = {
      ...comp,
      is_upvoted: newIsUpvoted,
      upvotes_count: newCount,
    };

    return { isUpvoted: newIsUpvoted, count: newCount };
  },

  async getUserTickets(userId?: string): Promise<Complaint[]> {
    if (isSupabaseConfigured) {
      try {
        const uid = userId || (await getAuthenticatedUserId());
        if (!uid) return [];
        const { data, error } = await supabase
          .from('complaints')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false });
        if (!error && data) return data;
        return [];
      } catch {
        return [];
      }
    }
    return localComplaints.filter((c) => c.user_id === CURRENT_USER.id);
  },
};
