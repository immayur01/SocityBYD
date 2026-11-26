import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { foodService } from '@/services/food';
import { FoodListing, FoodOrder, DietType } from '@/types';

export const FOOD_QUERY_KEY = ['food'];
export const ORDERS_QUERY_KEY = ['my-orders'];

export function useFoodListings() {
  return useQuery({
    queryKey: FOOD_QUERY_KEY,
    queryFn: () => foodService.getFoodListings(),
  });
}

/**
 * Optimistic Order Placement:
 * Instantly decrements `portions_left` on the dish card before server confirms.
 */
export function usePlaceFoodOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      listingId: string;
      quantity: number;
      deliveryFlat: string;
      deliveryNote?: string;
    }) => foodService.placeOrder(params),
    onMutate: async ({ listingId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: FOOD_QUERY_KEY });

      const previousFood = queryClient.getQueryData<FoodListing[]>(FOOD_QUERY_KEY);

      if (previousFood) {
        queryClient.setQueryData<FoodListing[]>(FOOD_QUERY_KEY, (old) => {
          if (!old) return old;
          return old
            .map((dish) => {
              if (dish.id === listingId) {
                const remaining = Math.max(0, dish.portions_left - quantity);
                return {
                  ...dish,
                  portions_left: remaining,
                  is_active: remaining > 0,
                };
              }
              return dish;
            })
            .filter((d) => d.portions_left > 0);
        });
      }

      return { previousFood };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFood) {
        queryClient.setQueryData(FOOD_QUERY_KEY, context.previousFood);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FOOD_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    },
  });
}

/**
 * Publish Dish Mutation
 */
export function usePublishDish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      dishName: string;
      price: number;
      dietType: DietType;
      timing: string;
      portionsAvailable: number;
      imageUrl?: string;
    }) => foodService.publishDish(params),
    onSuccess: (newDish) => {
      queryClient.setQueryData<FoodListing[]>(FOOD_QUERY_KEY, (old) => {
        if (!old) return [newDish];
        return [newDish, ...old];
      });
      queryClient.invalidateQueries({ queryKey: FOOD_QUERY_KEY });
    },
  });
}
