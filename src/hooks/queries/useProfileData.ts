import { useQuery } from '@tanstack/react-query';
import { postsService } from '@/services/posts';
import { foodService } from '@/services/food';
import { complaintsService } from '@/services/complaints';
import { useAuth } from '@/context/AuthContext';
import { Post, FoodOrder, Complaint } from '@/types';

export const MY_POSTS_QUERY_KEY = ['my-posts'];
export const MY_ORDERS_QUERY_KEY = ['my-orders'];
export const MY_TICKETS_QUERY_KEY = ['my-tickets'];

export function useMyPosts() {
  const { user } = useAuth();

  return useQuery<Post[]>({
    queryKey: [...MY_POSTS_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const all = await postsService.getAllPostsFlat('all');
      return all.filter((p) => p.user_id === user.id);
    },
  });
}

export function useMyOrders() {
  const { user } = useAuth();

  return useQuery<FoodOrder[]>({
    queryKey: [...MY_ORDERS_QUERY_KEY, user?.id],
    queryFn: () => (user?.id ? foodService.getUserOrders(user.id) : []),
  });
}

export function useMyTickets() {
  const { user } = useAuth();

  return useQuery<Complaint[]>({
    queryKey: [...MY_TICKETS_QUERY_KEY, user?.id],
    queryFn: () => (user?.id ? complaintsService.getUserTickets(user.id) : []),
  });
}
