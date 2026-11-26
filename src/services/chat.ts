import { supabase, isSupabaseConfigured } from './supabase';
import { ChatMessage, DirectMessageThread, UserProfile } from '@/types';
import {
  INITIAL_COMMUNITY_MESSAGES,
  INITIAL_DM_THREADS,
  CURRENT_USER,
  RESIDENTS_DIRECTORY,
} from './mockData';
import { uploadMediaToR2 } from './storage';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getAuthenticatedUserId } from './auth';

export interface FetchMessagesParams {
  roomType: 'community' | 'dm';
  roomId?: string;
  before?: string; // ISO date cursor
  limit?: number;
}

export interface SendMessageParams {
  roomType: 'community' | 'dm';
  roomId?: string;
  recipientId?: string;
  text: string;
  mediaUri?: string;
  mimeType?: string;
  fileName?: string;
}

export interface RealtimeMessageEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: ChatMessage;
  old?: any;
}

// In-memory fallback caches
let localCommunityMessages: ChatMessage[] = [...INITIAL_COMMUNITY_MESSAGES];
const localDmMessages: Record<string, ChatMessage[]> = {
  'usr-admin-1': [
    {
      id: 'dm-101',
      room_type: 'dm',
      room_id: 'dm-admin-1',
      sender_id: 'usr-admin-1',
      recipient_id: CURRENT_USER.id,
      text: 'Hello Mayur ji, we have reviewed your parking slot issue.',
      reactions: {},
      is_read: true,
      created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
      sender: RESIDENTS_DIRECTORY[1],
    },
    {
      id: 'dm-102',
      room_type: 'dm',
      room_id: 'dm-admin-1',
      sender_id: 'usr-admin-1',
      recipient_id: CURRENT_USER.id,
      text: 'Your parking complaint ticket has been marked resolved.',
      reactions: { '🙏': [CURRENT_USER.id] },
      is_read: true,
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      sender: RESIDENTS_DIRECTORY[1],
    },
  ],
  'usr-cook-1': [
    {
      id: 'dm-201',
      room_type: 'dm',
      room_id: 'dm-cook-1',
      sender_id: 'usr-current-1',
      recipient_id: 'usr-cook-1',
      text: 'Namaste Sunita ji! Can you prepare 2 plates of Puran Poli for dinner?',
      reactions: {},
      is_read: true,
      created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      sender: CURRENT_USER,
    },
    {
      id: 'dm-202',
      room_type: 'dm',
      room_id: 'dm-cook-1',
      sender_id: 'usr-cook-1',
      recipient_id: CURRENT_USER.id,
      text: 'Your Puran Poli order is confirmed! Will deliver to B-402 at 7:30 PM.',
      reactions: { '❤️': [CURRENT_USER.id] },
      is_read: false,
      created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      sender: RESIDENTS_DIRECTORY[2],
    },
  ],
};
let localDmThreads: DirectMessageThread[] = [...INITIAL_DM_THREADS];

// Local cache for sender profiles to avoid duplicate fetches
const profileCache: Map<string, UserProfile> = new Map();
RESIDENTS_DIRECTORY.forEach((r) => profileCache.set(r.id, r));
profileCache.set(CURRENT_USER.id, CURRENT_USER);

async function resolveSenderProfile(senderId: string): Promise<UserProfile> {
  if (profileCache.has(senderId)) {
    return profileCache.get(senderId)!;
  }
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', senderId).single();
      if (data) {
        profileCache.set(senderId, data);
        return data;
      }
    } catch {
      // fallback
    }
  }
  return {
    id: senderId,
    full_name: 'Resident',
    wing: 'Wing A',
    flat_number: '101',
    phone: '',
    email: '',
    role: 'resident',
    created_at: new Date().toISOString(),
  };
}

export const chatService = {
  /**
   * Upload an attachment to Cloudflare R2
   */
  async uploadChatAttachment(uri: string, mimeType?: string, fileName?: string): Promise<string> {
    return await uploadMediaToR2(uri, 'chat', mimeType, fileName);
  },

  /**
   * Cursor-based pagination for messages (newest first in query, returned chronological)
   */
  async fetchMessages(params: FetchMessagesParams): Promise<{
    messages: ChatMessage[];
    nextCursor: string | null;
  }> {
    const { roomType, roomId = 'community', before, limit = 30 } = params;

    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from('messages')
          .select('*, sender:profiles(*)')
          .eq('room_type', roomType)
          .order('created_at', { ascending: false })
          .limit(limit);

        const currentUserId = await getAuthenticatedUserId();

        if (roomType === 'community') {
          query = query.eq('room_id', roomId);
        } else if (roomType === 'dm') {
          // Both sender and recipient combinations
          query = query.or(
            `and(sender_id.eq.${roomId},recipient_id.eq.${currentUserId}),and(sender_id.eq.${currentUserId},recipient_id.eq.${roomId}),room_id.eq.${roomId}`
          );
        }

        if (before) {
          query = query.lt('created_at', before);
        }

        const { data, error } = await query;
        if (!error && data) {
          const chronological = [...data].reverse();
          const nextCursor = data.length === limit ? data[data.length - 1].created_at : null;
          return { messages: chronological, nextCursor };
        }
      } catch (err) {
        console.warn('[chatService] fetchMessages fallback to local cache:', err);
      }
    }

    // Local in-memory fallback
    let list: ChatMessage[] = [];
    if (roomType === 'community') {
      list = localCommunityMessages.filter((m) => !roomId || m.room_id === roomId || roomId === 'community');
    } else {
      list = localDmMessages[roomId] || [];
    }

    if (before) {
      list = list.filter((m) => new Date(m.created_at) < new Date(before));
    }
    const sliced = list.slice(-limit);
    return {
      messages: sliced,
      nextCursor: list.length > limit ? list[0].created_at : null,
    };
  },

  /**
   * Send a message to Community or 1-on-1 DM.
   * Auto-uploads media to Cloudflare R2 if a local URI is provided.
   */
  async sendMessage(params: SendMessageParams): Promise<ChatMessage> {
    const { roomType, roomId = 'community', recipientId, text, mediaUri, mimeType, fileName } = params;
    const currentUserId = await getAuthenticatedUserId();

    let mediaUrl: string | undefined;
    if (mediaUri) {
      mediaUrl = await this.uploadChatAttachment(mediaUri, mimeType, fileName);
    }

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      room_type: roomType,
      room_id: roomId,
      sender_id: currentUserId || CURRENT_USER.id,
      recipient_id: recipientId,
      text,
      media_url: mediaUrl,
      reactions: {},
      is_read: false,
      created_at: new Date().toISOString(),
      sender: CURRENT_USER,
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('messages').insert({
          room_type: newMessage.room_type,
          room_id: newMessage.room_id,
          sender_id: currentUserId,
          recipient_id: newMessage.recipient_id || null,
          text: newMessage.text,
          media_url: newMessage.media_url || null,
          reactions: newMessage.reactions,
          is_read: newMessage.is_read,
        }).select('*, sender:profiles(*)').single();

        if (error) {
          throw new Error(`Failed to send message: ${error.message}`);
        }

        if (data) {
          return data;
        }
      } catch (err: any) {
        console.warn('[chatService] sendMessage error:', err?.message || err);
        throw err;
      }
    }

    // Local fallback update
    if (roomType === 'community') {
      localCommunityMessages = [...localCommunityMessages, newMessage];
    } else if (recipientId) {
      if (!localDmMessages[recipientId]) localDmMessages[recipientId] = [];
      localDmMessages[recipientId] = [...localDmMessages[recipientId], newMessage];
    }

    return newMessage;
  },

  /**
   * Atomic reaction toggle on JSONB reactions.
   * Realtime will broadcast the update event to other clients.
   */
  async toggleReaction(
    messageId: string,
    emoji: string,
    userId?: string
  ): Promise<ChatMessage | null> {
    const activeUserId = userId || (await getAuthenticatedUserId());

    // 1. Supabase live update if configured
    if (isSupabaseConfigured) {
      try {
        const { data: currentMsg } = await supabase
          .from('messages')
          .select('id, reactions')
          .eq('id', messageId)
          .single();

        if (currentMsg) {
          const reactions = (currentMsg.reactions as Record<string, string[]>) || {};
          const users = reactions[emoji] || [];
          const hasReacted = users.includes(activeUserId);

          let updatedUsers: string[];
          if (hasReacted) {
            updatedUsers = users.filter((u) => u !== activeUserId);
          } else {
            updatedUsers = [...users, activeUserId];
          }

          const updatedReactions = { ...reactions };
          if (updatedUsers.length === 0) {
            delete updatedReactions[emoji];
          } else {
            updatedReactions[emoji] = updatedUsers;
          }

          const { data, error } = await supabase
            .from('messages')
            .update({ reactions: updatedReactions })
            .eq('id', messageId)
            .select('*, sender:profiles(*)')
            .single();

          if (!error && data) return data;
        }
      } catch (e) {
        console.warn('[chatService] Supabase toggleReaction error:', e);
      }
    }

    // 2. Local fallback
    const findAndToggle = (list: ChatMessage[]) => {
      const idx = list.findIndex((m) => m.id === messageId);
      if (idx === -1) return null;
      const msg = { ...list[idx] };
      const current = msg.reactions[emoji] || [];
      const has = current.includes(activeUserId);
      const nextUsers = has ? current.filter((id) => id !== activeUserId) : [...current, activeUserId];
      const nextReactions = { ...msg.reactions };
      if (nextUsers.length === 0) delete nextReactions[emoji];
      else nextReactions[emoji] = nextUsers;
      msg.reactions = nextReactions;
      list[idx] = msg;
      return msg;
    };

    let updated = findAndToggle(localCommunityMessages);
    if (!updated) {
      for (const key of Object.keys(localDmMessages)) {
        updated = findAndToggle(localDmMessages[key]);
        if (updated) break;
      }
    }
    return updated;
  },

  /**
   * Mark all unread messages from a sender as read
   */
  async markMessagesAsRead(senderId: string, recipientId?: string): Promise<void> {
    const activeUserId = recipientId || (await getAuthenticatedUserId());

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('sender_id', senderId)
          .eq('recipient_id', activeUserId)
          .eq('is_read', false);
      } catch (err) {
        console.warn('[chatService] markMessagesAsRead error:', err);
      }
    }

    // Local fallback
    if (localDmMessages[senderId]) {
      localDmMessages[senderId] = localDmMessages[senderId].map((m) =>
        m.sender_id === senderId ? { ...m, is_read: true } : m
      );
    }
  },

  /**
   * Live Supabase Realtime channel subscription.
   * Listens for postgres_changes on public.messages (INSERT and UPDATE).
   * Automatically enriches payload with sender profile.
   */
  subscribeToMessages(
    callback: (event: RealtimeMessageEvent) => void,
    filter?: { roomType?: 'community' | 'dm'; roomId?: string }
  ): () => void {
    if (!isSupabaseConfigured) {
      return () => {};
    }

    const channelName = `public:messages:${filter?.roomType || 'all'}:${filter?.roomId || 'all'}:${Date.now()}`;
    const channel: RealtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const row = (payload.new || payload.old) as any;
          if (!row) return;

          // Apply client-side filter if specific room
          if (filter?.roomType && row.room_type && row.room_type !== filter.roomType) {
            return;
          }
          if (filter?.roomId && row.room_id && row.room_id !== filter.roomId && filter.roomType === 'community') {
            return;
          }

          const newRow = payload.new as any;
          let enriched: ChatMessage = newRow as ChatMessage;
          if (newRow && newRow.sender_id) {
            const senderProfile = await resolveSenderProfile(newRow.sender_id);
            enriched = {
              ...enriched,
              sender: senderProfile,
            };
          }

          callback({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: enriched,
            old: payload.old,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Backwards compatibility methods
  async getCommunityMessages(): Promise<ChatMessage[]> {
    const { messages } = await this.fetchMessages({ roomType: 'community', roomId: 'community', limit: 50 });
    return messages;
  },

  async sendCommunityMessage(text: string, mediaUrl?: string): Promise<ChatMessage> {
    return await this.sendMessage({
      roomType: 'community',
      roomId: 'community',
      text,
      mediaUri: mediaUrl,
    });
  },

  async getDmThreads(): Promise<DirectMessageThread[]> {
    return localDmThreads;
  },

  async getDmMessages(recipientId: string): Promise<ChatMessage[]> {
    const { messages } = await this.fetchMessages({ roomType: 'dm', roomId: recipientId, limit: 50 });
    return messages;
  },

  async sendDmMessage(recipient: UserProfile, text: string, mediaUrl?: string): Promise<ChatMessage> {
    return await this.sendMessage({
      roomType: 'dm',
      roomId: `dm-${recipient.id}`,
      recipientId: recipient.id,
      text,
      mediaUri: mediaUrl,
    });
  },
};
