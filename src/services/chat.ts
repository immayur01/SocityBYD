import { supabase, isSupabaseConfigured } from './supabase';
import { ChatMessage, DirectMessageThread, UserProfile } from '@/types';
import {
  INITIAL_COMMUNITY_MESSAGES,
  INITIAL_DM_THREADS,
  CURRENT_USER,
  RESIDENTS_DIRECTORY,
} from './mockData';

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

export const chatService = {
  async getCommunityMessages(): Promise<ChatMessage[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*, sender:profiles(*)')
          .eq('room_type', 'community')
          .order('created_at', { ascending: true });
        if (!error && data) return data;
      } catch {
        // fallback
      }
    }
    return localCommunityMessages;
  },

  async sendCommunityMessage(text: string, mediaUrl?: string): Promise<ChatMessage> {
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      room_type: 'community',
      room_id: 'community',
      sender_id: CURRENT_USER.id,
      text,
      media_url: mediaUrl,
      reactions: {},
      is_read: true,
      created_at: new Date().toISOString(),
      sender: CURRENT_USER,
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('messages').insert(newMessage);
      } catch {
        // fallback
      }
    }

    localCommunityMessages = [...localCommunityMessages, newMessage];
    return newMessage;
  },

  async toggleReaction(messageId: string, emoji: string): Promise<ChatMessage | null> {
    const msgIndex = localCommunityMessages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return null;

    const msg = { ...localCommunityMessages[msgIndex] };
    const currentUsers = msg.reactions[emoji] || [];
    const hasReacted = currentUsers.includes(CURRENT_USER.id);

    if (hasReacted) {
      msg.reactions[emoji] = currentUsers.filter((id) => id !== CURRENT_USER.id);
      if (msg.reactions[emoji].length === 0) {
        delete msg.reactions[emoji];
      }
    } else {
      msg.reactions[emoji] = [...currentUsers, CURRENT_USER.id];
    }

    localCommunityMessages[msgIndex] = msg;

    if (isSupabaseConfigured) {
      try {
        await supabase.from('messages').update({ reactions: msg.reactions }).eq('id', messageId);
      } catch {
        // fallback
      }
    }

    return msg;
  },

  async getDmThreads(): Promise<DirectMessageThread[]> {
    return localDmThreads;
  },

  async getDmMessages(recipientId: string): Promise<ChatMessage[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*, sender:profiles(*)')
          .eq('room_type', 'dm')
          .or(`sender_id.eq.${recipientId},recipient_id.eq.${recipientId}`)
          .order('created_at', { ascending: true });
        if (!error && data) return data;
      } catch {
        // fallback
      }
    }
    return localDmMessages[recipientId] || [];
  },

  async sendDmMessage(recipient: UserProfile, text: string, mediaUrl?: string): Promise<ChatMessage> {
    const newMessage: ChatMessage = {
      id: `dm-${Date.now()}`,
      room_type: 'dm',
      room_id: `dm-${recipient.id}`,
      sender_id: CURRENT_USER.id,
      recipient_id: recipient.id,
      text,
      media_url: mediaUrl,
      reactions: {},
      is_read: true,
      created_at: new Date().toISOString(),
      sender: CURRENT_USER,
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('messages').insert(newMessage);
      } catch {
        // fallback
      }
    }

    if (!localDmMessages[recipient.id]) {
      localDmMessages[recipient.id] = [];
    }
    localDmMessages[recipient.id] = [...localDmMessages[recipient.id], newMessage];

    // Update threads
    const threadIdx = localDmThreads.findIndex((t) => t.recipient.id === recipient.id);
    if (threadIdx !== -1) {
      localDmThreads[threadIdx] = {
        ...localDmThreads[threadIdx],
        lastMessage: text,
        lastMessageTime: 'Just now',
      };
    } else {
      localDmThreads.unshift({
        id: `dm-${recipient.id}`,
        recipient,
        lastMessage: text,
        lastMessageTime: 'Just now',
        unreadCount: 0,
        isOnline: true,
      });
    }

    return newMessage;
  },
};
