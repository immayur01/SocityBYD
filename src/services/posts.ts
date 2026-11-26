import { supabase, isSupabaseConfigured } from './supabase';
import { Post, PostComment, CommentReply, PostTag } from '@/types';
import { INITIAL_POSTS, CURRENT_USER, RESIDENTS_DIRECTORY } from './mockData';
import { uploadMediaToR2 } from './storage';
import { getAuthenticatedUserId } from './auth';

let localPosts: Post[] = [...INITIAL_POSTS];
const localComments: Record<string, PostComment[]> = {
  'post-1': [
    {
      id: 'comm-1',
      post_id: 'post-1',
      user_id: 'usr-cook-1',
      comment: 'Solar rooftop is a great initiative. Will reduce common meter bills substantially!',
      created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      user: RESIDENTS_DIRECTORY[2],
      likes_count: 5,
      is_liked: false,
      replies: [
        {
          id: 'rep-1',
          comment_id: 'comm-1',
          user_id: 'usr-admin-1',
          reply: 'Yes Sunita ji! Net metering will start from next month.',
          created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
          user: RESIDENTS_DIRECTORY[1],
          likes_count: 2,
          is_liked: true,
        },
      ],
    },
    {
      id: 'comm-2',
      post_id: 'post-1',
      user_id: 'usr-current-1',
      comment: 'Will Wing B terrace be accessible for maintenance during the setup?',
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      user: CURRENT_USER,
      likes_count: 3,
      is_liked: true,
      replies: [],
    },
    {
      id: 'comm-3',
      post_id: 'post-1',
      user_id: 'usr-resident-4',
      comment: 'Looking forward to the AGM discussion on Sunday! 👏',
      created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      user: RESIDENTS_DIRECTORY[5],
      likes_count: 1,
      is_liked: false,
      replies: [],
    },
  ],
  'post-2': [
    {
      id: 'comm-201',
      post_id: 'post-2',
      user_id: 'usr-cook-2',
      comment: 'My kids are so excited for the Diwali lantern workshop! Count us in! 🪔✨',
      created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      user: RESIDENTS_DIRECTORY[3],
      likes_count: 7,
      is_liked: true,
      replies: [],
    },
    {
      id: 'comm-202',
      post_id: 'post-2',
      user_id: 'usr-current-1',
      comment: 'Awesome! We will bring eco-friendly colors for the Rangoli.',
      created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      user: CURRENT_USER,
      likes_count: 4,
      is_liked: false,
      replies: [],
    },
  ],
  'post-3': [
    {
      id: 'comm-301',
      post_id: 'post-3',
      user_id: 'usr-resident-3',
      comment: 'Breathtaking view! The sunset colors look stunning from Wing G.',
      created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      user: RESIDENTS_DIRECTORY[4],
      likes_count: 6,
      is_liked: true,
      replies: [],
    },
  ],
  'post-4': [
    {
      id: 'comm-401',
      post_id: 'post-4',
      user_id: 'usr-admin-1',
      comment: 'The new pathway LED fixtures make the evening walk very pleasant!',
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      user: RESIDENTS_DIRECTORY[1],
      likes_count: 4,
      is_liked: false,
      replies: [],
    },
  ],
};

export const postsService = {
  async getPosts(
    filter: 'all' | 'active' | 'expired' = 'active',
    options?: { before?: string; limit?: number }
  ): Promise<{ posts: Post[]; nextCursor: string | null }> {
    const limit = options?.limit || 20;
    const before = options?.before;

    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from('posts')
          .select('*, author:profiles(*)')
          .order('created_at', { ascending: false })
          .limit(limit);

        const now = new Date().toISOString();
        if (filter === 'active') {
          query = query.gt('expires_at', now);
        } else if (filter === 'expired') {
          query = query.lte('expires_at', now);
        }

        if (before) {
          query = query.lt('created_at', before);
        }

        const { data, error } = await query;
        if (!error && data) {
          const nextCursor = data.length === limit ? data[data.length - 1].created_at : null;
          return { posts: data, nextCursor };
        }
      } catch {
        // fallback to local mock
      }
    }

    const now = Date.now();
    let filtered = localPosts.filter((post) => {
      const isExpired = new Date(post.expires_at).getTime() <= now;
      if (filter === 'active') return !isExpired;
      if (filter === 'expired') return isExpired;
      return true;
    });

    if (before) {
      filtered = filtered.filter((p) => new Date(p.created_at) < new Date(before));
    }

    const page = filtered.slice(0, limit);
    const nextCursor = filtered.length > limit ? page[page.length - 1].created_at : null;
    return { posts: page, nextCursor };
  },

  async getAllPostsFlat(filter: 'all' | 'active' | 'expired' = 'active'): Promise<Post[]> {
    const { posts } = await this.getPosts(filter, { limit: 100 });
    return posts;
  },

  async uploadMedia(uri: string, filename: string, mimeType?: string): Promise<string> {
    return await uploadMediaToR2(uri, 'posts', mimeType, filename);
  },

  async createPost(params: {
    tag: PostTag;
    content: string;
    title?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'file';
    fileName?: string;
    fileSize?: number;
    eventDate?: string;
    eventLocation?: string;
    announcementPriority?: 'normal' | 'urgent';
  }): Promise<Post> {
    const userId = await getAuthenticatedUserId();

    if (isSupabaseConfigured) {
      const cleanMediaType = params.mediaType === 'file' ? null : (params.mediaType || null);
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          tag: params.tag,
          content: params.content,
          media_url: params.mediaUrl || null,
          media_type: cleanMediaType,
        })
        .select('*, author:profiles(*)')
        .single();

      if (error) {
        throw new Error(`Failed to create post: ${error.message}`);
      }

      if (data) {
        return {
          ...data,
          is_liked: false,
          comments_count: 0,
        };
      }
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48-hour expiration

    const newPost: Post = {
      id: `post-${Date.now()}`,
      user_id: userId || CURRENT_USER.id,
      tag: params.tag,
      title: params.title,
      content: params.content,
      media_url: params.mediaUrl,
      media_type: params.mediaType,
      file_name: params.fileName,
      file_size: params.fileSize,
      event_date: params.eventDate,
      event_location: params.eventLocation,
      announcement_priority: params.announcementPriority,
      likes_count: 0,
      is_liked: false,
      comments_count: 0,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      author: CURRENT_USER,
    };

    localPosts = [newPost, ...localPosts];
    return newPost;
  },

  async toggleLike(postId: string): Promise<{ isLiked: boolean; count: number }> {
    const userId = await getAuthenticatedUserId();

    if (isSupabaseConfigured) {
      const { data: existing } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      const newIsLiked = !existing;
      if (newIsLiked) {
        const { error: insErr } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
        if (insErr) throw new Error(insErr.message);
      } else {
        const { error: delErr } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
        if (delErr) throw new Error(delErr.message);
      }

      const { count } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      return { isLiked: newIsLiked, count: count ?? 0 };
    }

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
    const list = localComments[postId] || [];
    return list.map((c) => ({
      ...c,
      replies: c.replies ? c.replies.map((r) => ({ ...r })) : [],
    }));
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

  async editComment(postId: string, commentId: string, newText: string): Promise<PostComment | null> {
    const list = localComments[postId] || [];
    const target = list.find((c) => c.id === commentId);
    if (!target) return null;
    target.comment = newText;
    target.is_edited = true;
    return { ...target };
  },

  async deleteComment(postId: string, commentId: string): Promise<boolean> {
    if (!localComments[postId]) return false;
    const initialLen = localComments[postId].length;
    localComments[postId] = localComments[postId].filter((c) => c.id !== commentId);
    const deleted = localComments[postId].length < initialLen;

    if (deleted) {
      const postIdx = localPosts.findIndex((p) => p.id === postId);
      if (postIdx !== -1) {
        localPosts[postIdx].comments_count = Math.max(0, (localPosts[postIdx].comments_count || 1) - 1);
      }
    }
    return deleted;
  },

  async toggleCommentLike(postId: string, commentId: string): Promise<{ isLiked: boolean; count: number }> {
    const list = localComments[postId] || [];
    const target = list.find((c) => c.id === commentId);
    if (!target) return { isLiked: false, count: 0 };

    const newIsLiked = !target.is_liked;
    const newCount = newIsLiked ? (target.likes_count || 0) + 1 : Math.max(0, (target.likes_count || 1) - 1);
    target.is_liked = newIsLiked;
    target.likes_count = newCount;
    return { isLiked: newIsLiked, count: newCount };
  },

  async addReply(postId: string, commentId: string, replyText: string): Promise<CommentReply | null> {
    const list = localComments[postId] || [];
    const target = list.find((c) => c.id === commentId);
    if (!target) return null;

    const newReply: CommentReply = {
      id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      comment_id: commentId,
      user_id: CURRENT_USER.id,
      reply: replyText,
      created_at: new Date().toISOString(),
      user: CURRENT_USER,
      likes_count: 0,
      is_liked: false,
    };

    if (!target.replies) {
      target.replies = [];
    }
    target.replies.push(newReply);
    return newReply;
  },

  async toggleReplyLike(
    postId: string,
    commentId: string,
    replyId: string
  ): Promise<{ isLiked: boolean; count: number }> {
    const list = localComments[postId] || [];
    const target = list.find((c) => c.id === commentId);
    if (!target || !target.replies) return { isLiked: false, count: 0 };

    const reply = target.replies.find((r) => r.id === replyId);
    if (!reply) return { isLiked: false, count: 0 };

    const newIsLiked = !reply.is_liked;
    const newCount = newIsLiked ? (reply.likes_count || 0) + 1 : Math.max(0, (reply.likes_count || 1) - 1);
    reply.is_liked = newIsLiked;
    reply.likes_count = newCount;
    return { isLiked: newIsLiked, count: newCount };
  },
};
