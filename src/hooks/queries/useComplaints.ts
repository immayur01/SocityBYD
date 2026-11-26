import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  InfiniteData,
} from '@tanstack/react-query';
import { complaintsService } from '@/services/complaints';
import {
  Complaint,
  ComplaintVisibility,
  ComplaintCategory,
  ComplaintUrgency,
} from '@/types';

export const COMPLAINTS_QUERY_KEY = ['complaints'];
export const TICKETS_QUERY_KEY = ['my-tickets'];

export function useComplaints(visibility: ComplaintVisibility) {
  const query = useInfiniteQuery({
    queryKey: [...COMPLAINTS_QUERY_KEY, visibility],
    queryFn: ({ pageParam }) =>
      complaintsService.getComplaints(visibility, { before: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const complaints = query.data?.pages.flatMap((page) => page.complaints) ?? [];

  return {
    ...query,
    complaints,
  };
}

/**
 * Optimistic Complaint Upvote Mutation:
 * Instantly toggles is_upvoted and increments/decrements upvotes_count on ticket.
 */
export function useToggleComplaintUpvote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (complaintId: string) => complaintsService.toggleUpvote(complaintId),
    onMutate: async (complaintId: string) => {
      await queryClient.cancelQueries({ queryKey: COMPLAINTS_QUERY_KEY });

      const previousData = queryClient.getQueriesData<
        InfiniteData<{ complaints: Complaint[]; nextCursor: string | null }>
      >({ queryKey: COMPLAINTS_QUERY_KEY });

      queryClient.setQueriesData<
        InfiniteData<{ complaints: Complaint[]; nextCursor: string | null }>
      >({ queryKey: COMPLAINTS_QUERY_KEY }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            complaints: page.complaints.map((c) => {
              if (c.id === complaintId) {
                const nextIsUpvoted = !c.is_upvoted;
                const nextCount = nextIsUpvoted
                  ? c.upvotes_count + 1
                  : Math.max(0, c.upvotes_count - 1);
                return {
                  ...c,
                  is_upvoted: nextIsUpvoted,
                  upvotes_count: nextCount,
                };
              }
              return c;
            }),
          })),
        };
      });

      return { previousData };
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: COMPLAINTS_QUERY_KEY });
    },
  });
}

/**
 * File New Complaint Mutation
 */
export function useFileComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      visibility: ComplaintVisibility;
      category: ComplaintCategory;
      urgency: ComplaintUrgency;
      title: string;
      description: string;
      mediaUrl?: string;
    }) => complaintsService.fileComplaint(params),
    onSuccess: (newComplaint) => {
      queryClient.setQueryData<
        InfiniteData<{ complaints: Complaint[]; nextCursor: string | null }>
      >([...COMPLAINTS_QUERY_KEY, newComplaint.visibility], (old) => {
        if (!old) return old;
        const first = old.pages[0];
        if (!first) return old;
        return {
          ...old,
          pages: [
            {
              ...first,
              complaints: [newComplaint, ...first.complaints],
            },
            ...old.pages.slice(1),
          ],
        };
      });

      queryClient.invalidateQueries({ queryKey: COMPLAINTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
    },
  });
}
