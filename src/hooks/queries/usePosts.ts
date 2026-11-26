import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  InfiniteData,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { postsService } from '@/services/posts';
import { uploadQueue } from '@/services/uploadQueue';
import { Post, PostComment, PostTag } from '@/types';

export const POSTS_QUERY_KEY = ['posts'];

export function usePosts(filter: 'all' | 'active' | 'expired' = 'active') {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: [...POSTS_QUERY_KEY, filter],
    queryFn: ({ pageParam }) =>
      postsService.getPosts(filter, { before: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  // Automatically prepend or invalidate when a background 48h upload finishes
  useEffect(() => {
    const unsubscribe = uploadQueue.subscribe((newPost) => {
      queryClient.setQueryData<InfiniteData<{ posts: Post[]; nextCursor: string | null }>>(
        [...POSTS_QUERY_KEY, 'active'],
        (old) => {
          if (!old) return old;
          const firstPage = old.pages[0];
          if (!firstPage) return old;
          const exists = firstPage.posts.some((p) => p.id === newPost.id);
          if (exists) return old;
          return {
            ...old,
            pages: [
              {
                ...firstPage,
                posts: [newPost, ...firstPage.posts],
              },
              ...old.pages.slice(1),
            ],
          };
        }
      );
      // Invalidate to guarantee cache consistency
      queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY });
    });

    return unsubscribe;
  }, [queryClient]);

  const posts = query.data?.pages.flatMap((page) => page.posts) ?? [];

  return {
    ...query,
    posts,
  };
}

/**
 * Optimistic Like Mutation:
 * Immediately flips is_liked & increments/decrements likes_count before server responds.
 */
export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => postsService.toggleLike(postId),
    onMutate: async (postId: string) => {
      // Cancel ongoing queries so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: POSTS_QUERY_KEY });

      // Snapshot previous caches
      const previousData = queryClient.getQueriesData<
        InfiniteData<{ posts: Post[]; nextCursor: string | null }>
      >({ queryKey: POSTS_QUERY_KEY });

      // Optimistically update every active filter
      queryClient.setQueriesData<
        InfiniteData<{ posts: Post[]; nextCursor: string | null }>
      >({ queryKey: POSTS_QUERY_KEY }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) => {
              if (post.id === postId) {
                const nextIsLiked = !post.is_liked;
                const nextCount = nextIsLiked
                  ? post.likes_count + 1
                  : Math.max(0, post.likes_count - 1);
                return {
                  ...post,
                  is_liked: nextIsLiked,
                  likes_count: nextCount,
                };
              }
              return post;
            }),
          })),
        };
      });

      return { previousData };
    },
    onError: (_err, _postId, context) => {
      // Rollback on network failure
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Re-sync with server
      queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY });
    },
  });
}

/**
 * Optimistic Comment Mutation:
 * Increments comments_count immediately.
 */
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, text }: { postId: string; text: string }) =>
      postsService.addComment(postId, text),
    onMutate: async ({ postId, text }) => {
      await queryClient.cancelQueries({ queryKey: POSTS_QUERY_KEY });

      const previousData = queryClient.getQueriesData<
        InfiniteData<{ posts: Post[]; nextCursor: string | null }>
      >({ queryKey: POSTS_QUERY_KEY });

      // Optimistically increment comment count on post card
      queryClient.setQueriesData<
        InfiniteData<{ posts: Post[]; nextCursor: string | null }>
      >({ queryKey: POSTS_QUERY_KEY }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) =>
              post.id === postId
                ? { ...post, comments_count: (post.comments_count || 0) + 1 }
                : post
            ),
          })),
        };
      });

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['comments', variables.postId] });
    },
  });
}
