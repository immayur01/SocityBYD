import { supabase, isSupabaseConfigured } from './supabase';
import { FoodListing, FoodOrder, DietType } from '@/types';
import { INITIAL_FOOD_LISTINGS, CURRENT_USER } from './mockData';
import { uploadMediaToR2 } from './storage';
import { getAuthenticatedUserId } from './auth';

let localFoodListings: FoodListing[] = [...INITIAL_FOOD_LISTINGS];
let localOrders: FoodOrder[] = [
  {
    id: 'ord-1',
    listing_id: 'food-1',
    resident_id: CURRENT_USER.id,
    quantity: 2,
    total_amount: 360,
    delivery_flat: 'Flat B-402',
    delivery_note: 'Please bring after 7:45 PM',
    payment_method: 'Pay on Delivery',
    order_status: 'Confirmed',
    created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    dish: INITIAL_FOOD_LISTINGS[0],
  },
];

export const foodService = {
  async getFoodListings(): Promise<FoodListing[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('food_listings')
          .select('*, chef:profiles(*)')
          .eq('is_active', true)
          .gt('portions_left', 0)
          .order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch {
        // fallback
      }
    }
    return localFoodListings.filter((dish) => (dish.portions_left ?? 0) > 0);
  },

  async publishDish(params: {
    dishName: string;
    price: number;
    dietType: DietType;
    timing: string;
    portionsAvailable: number;
    imageUrl?: string;
  }): Promise<FoodListing> {
    const userId = await getAuthenticatedUserId();

    let finalImageUrl = params.imageUrl;
    if (params.imageUrl && !params.imageUrl.startsWith('http')) {
      finalImageUrl = await uploadMediaToR2(params.imageUrl, 'food', 'image/jpeg');
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('food_listings')
        .insert({
          chef_id: userId,
          dish_name: params.dishName,
          price: params.price,
          diet_type: params.dietType,
          timing: params.timing,
          portions_left: params.portionsAvailable,
          image_url: finalImageUrl || null,
          is_active: true,
        })
        .select('*, chef:profiles(*)')
        .single();

      if (error) throw new Error(`Failed to publish dish: ${error.message}`);
      if (data) return data;
    }

    const newDish: FoodListing = {
      id: `food-${Date.now()}`,
      chef_id: userId || CURRENT_USER.id,
      dish_name: params.dishName,
      price: params.price,
      diet_type: params.dietType,
      timing: params.timing,
      portions_left: params.portionsAvailable,
      image_url:
        finalImageUrl ||
        (params.dietType === 'Pure Veg'
          ? 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80'),
      rating: 5.0,
      is_active: true,
      created_at: new Date().toISOString(),
      chef: CURRENT_USER,
    };

    localFoodListings = [newDish, ...localFoodListings];
    return newDish;
  },

  async placeOrder(params: {
    listingId: string;
    quantity: number;
    deliveryFlat: string;
    deliveryNote?: string;
  }): Promise<FoodOrder> {
    const userId = await getAuthenticatedUserId();

    if (isSupabaseConfigured) {
      const { data: dishData, error: dishError } = await supabase
        .from('food_listings')
        .select('*, chef:profiles(*)')
        .eq('id', params.listingId)
        .single();

      if (dishError || !dishData) {
        throw new Error('Dish is no longer available');
      }

      if (dishData.portions_left < params.quantity) {
        throw new Error(`Only ${dishData.portions_left} portion(s) left!`);
      }

      const totalAmount = Number(dishData.price) * params.quantity;

      const { data: orderId, error: rpcError } = await supabase.rpc('place_food_order', {
        p_listing_id: params.listingId,
        p_resident_id: userId,
        p_quantity: params.quantity,
        p_total_amount: totalAmount,
        p_delivery_flat: params.deliveryFlat,
        p_delivery_note: params.deliveryNote || '',
      });

      if (rpcError) {
        throw new Error(`Order failed: ${rpcError.message}`);
      }

      return {
        id: (orderId as string) || `ord-${Date.now()}`,
        listing_id: params.listingId,
        resident_id: userId,
        quantity: params.quantity,
        total_amount: totalAmount,
        delivery_flat: params.deliveryFlat,
        delivery_note: params.deliveryNote,
        payment_method: 'Pay on Delivery',
        order_status: 'Confirmed',
        created_at: new Date().toISOString(),
        dish: dishData,
      };
    }

    const listingIndex = localFoodListings.findIndex((d) => d.id === params.listingId);
    if (listingIndex === -1) throw new Error('Dish is no longer available');

    const dish = localFoodListings[listingIndex];
    if (dish.portions_left < params.quantity) {
      throw new Error(`Only ${dish.portions_left} portion(s) left!`);
    }

    // Atomically decrement portions
    dish.portions_left -= params.quantity;
    if (dish.portions_left === 0) {
      dish.is_active = false;
    }
    localFoodListings[listingIndex] = { ...dish };

    const totalAmount = dish.price * params.quantity;

    const newOrder: FoodOrder = {
      id: `ord-${Date.now()}`,
      listing_id: params.listingId,
      resident_id: CURRENT_USER.id,
      quantity: params.quantity,
      total_amount: totalAmount,
      delivery_flat: params.deliveryFlat,
      delivery_note: params.deliveryNote,
      payment_method: 'Pay on Delivery',
      order_status: 'Confirmed',
      created_at: new Date().toISOString(),
      dish,
    };

    localOrders = [newOrder, ...localOrders];
    return newOrder;
  },

  async getUserOrders(): Promise<FoodOrder[]> {
    return localOrders;
  },
};
