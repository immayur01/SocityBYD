import { supabase, isSupabaseConfigured } from './supabase';
import {
  Complaint,
  ComplaintVisibility,
  ComplaintCategory,
  ComplaintUrgency,
} from '@/types';
import { INITIAL_COMPLAINTS, CURRENT_USER } from './mockData';

let localComplaints: Complaint[] = [...INITIAL_COMPLAINTS];

export const complaintsService = {
  async getComplaints(visibility: ComplaintVisibility): Promise<Complaint[]> {
    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from('complaints')
          .select('*, user:profiles(*)')
          .eq('visibility', visibility)
          .order('upvotes_count', { ascending: false })
          .order('created_at', { ascending: false });

        if (visibility === 'admin') {
          query = query.eq('user_id', CURRENT_USER.id);
        }

        const { data, error } = await query;
        if (!error && data) return data;
      } catch {
        // fallback
      }
    }

    return localComplaints
      .filter((c) => {
        if (visibility === 'admin') {
          return c.visibility === 'admin' && c.user_id === CURRENT_USER.id;
        }
        return c.visibility === 'public';
      })
      .sort((a, b) => b.upvotes_count - a.upvotes_count);
  },

  async fileComplaint(params: {
    visibility: ComplaintVisibility;
    category: ComplaintCategory;
    urgency: ComplaintUrgency;
    title: string;
    description: string;
    mediaUrl?: string;
  }): Promise<Complaint> {
    const now = new Date().toISOString();
    const newComplaint: Complaint = {
      id: `comp-${Date.now()}`,
      user_id: CURRENT_USER.id,
      visibility: params.visibility,
      category: params.category,
      urgency: params.urgency,
      title: params.title,
      description: params.description,
      media_url: params.mediaUrl,
      status: 'Open',
      admin_note: undefined,
      upvotes_count: 0,
      is_upvoted: false,
      created_at: now,
      updated_at: now,
      user: CURRENT_USER,
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('complaints').insert(newComplaint).select().single();
        if (!error && data) return { ...data, user: CURRENT_USER };
      } catch {
        // fallback
      }
    }

    localComplaints = [newComplaint, ...localComplaints];
    return newComplaint;
  },

  async toggleUpvote(complaintId: string): Promise<{ isUpvoted: boolean; count: number }> {
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

    if (isSupabaseConfigured) {
      try {
        await supabase.rpc('toggle_complaint_upvote', {
          p_complaint_id: complaintId,
          p_user_id: CURRENT_USER.id,
        });
      } catch {
        // fallback
      }
    }

    return { isUpvoted: newIsUpvoted, count: newCount };
  },

  async getUserTickets(): Promise<Complaint[]> {
    return localComplaints.filter((c) => c.user_id === CURRENT_USER.id);
  },
};
