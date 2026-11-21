import { supabase, isSupabaseConfigured } from './supabase';
import { Post, PostComment, PostTag } from '@/types';
import { INITIAL_POSTS, CURRENT_USER } from './mockData';

let localPosts: Post[] = [...INITIAL_POSTS];
const localComments: Record<string, PostComment[]> = {
  'post-1': [
    {
      id: 'comm-1',
      post_id: 'post-1',
      user_id: 'usr-cook-1',
      comment: 'Solar rooftop is a great initiative. Will reduce common meter bills substantially!',
      created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      user: {
        id: 'usr-cook-1',
        full_name: 'Sunita Deshmukh',
        wing: 'Wing C',
        flat_number: '304',
        phone: '',
        email: '',
        role: 'resident',
        created_at: '',
      },
    },
  ],
};

export const postsService = {
  async getPosts(filter: 'all' | 'active' | 'expired' = 'active'): Promise<Post[]> {
    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('posts').select('*, author:profiles(*)').order('created_at', { ascending: false });
        const now = new Date().toISOString();
        if (filter === 'active') {
          query = query.gt('expires_at', now);
        } else if (filter === 'expired') {
          query = query.lte('expires_at', now);
        }
        const { data, error } = await query;
        if (!error && data) return data;
      } catch {
        // fallback to local mock
      }
    }

    const now = Date.now();
    return localPosts.filter((post) => {
      const isExpired = new Date(post.expires_at).getTime() <= now;
      if (filter === 'active') return !isExpired;
      if (filter === 'expired') return isExpired;
      return true;
    });
  },

  async createPost(params: {
    tag: PostTag;
    content: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
  }): Promise<Post> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48-hour expiration

    const newPost: Post = {
      id: `post-${Date.now()}`,
      user_id: CURRENT_USER.id,
      tag: params.tag,
      content: params.content,
      media_url: params.mediaUrl,
      media_type: params.mediaType,
      likes_count: 0,
      is_liked: false,
      comments_count: 0,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      author: CURRENT_USER,
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('posts').insert(newPost).select().single();
        if (!error && data) return { ...data, author: CURRENT_USER };
      } catch {
        // fallback
      }
    }

    localPosts = [newPost, ...localPosts];
    return newPost;
  },

  async toggleLike(postId: string): Promise<{ isLiked: boolean; count: number }> {
    const postIndex = localPosts.findIndex((p) => p.id === postId);
    if (postIndex === -1) return { isLiked: false, count: 0 };

    const post = localPosts[postIndex];
    const newIsLiked = !post.is_liked;
    const newCount = newIsLiked ? post.likes_count + 1 : Math.max(0, post.likes_count - 1);

    localPosts[postIndex] = {
      ...post,
      is_liked: newIsLiked,
      likes_count: newCount,
    };

    if (isSupabaseConfigured) {
      try {
        if (newIsLiked) {
          await supabase.from('post_likes').insert({ post_id: postId, user_id: CURRENT_USER.id });
        } else {
          await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', CURRENT_USER.id);
        }
      } catch {
        // fallback
      }
    }

    return { isLiked: newIsLiked, count: newCount };
  },

  async getComments(postId: string): Promise<PostComment[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('post_comments')
          .select('*, user:profiles(*)')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });
        if (!error && data) return data;
      } catch {
        // fallback
      }
    }
    return localComments[postId] || [];
  },

  async addComment(postId: string, text: string): Promise<PostComment> {
    const newComment: PostComment = {
      id: `comm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      post_id: postId,
      user_id: CURRENT_USER.id,
      comment: text,
      created_at: new Date().toISOString(),
      user: CURRENT_USER,
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('post_comments').insert(newComment);
      } catch {
        // fallback
      }
    }

    if (!localComments[postId]) {
      localComments[postId] = [];
    }
    localComments[postId].push(newComment);

    const postIdx = localPosts.findIndex((p) => p.id === postId);
    if (postIdx !== -1) {
      localPosts[postIdx].comments_count = (localPosts[postIdx].comments_count || 0) + 1;
    }

    return newComment;
  },
};
