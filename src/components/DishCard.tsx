import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Star, Clock } from 'lucide-react-native';
import { FoodListing } from '@/types';
import { GlassCard } from './GlassCard';
import { useTheme } from '@/context/ThemeContext';

interface DishCardProps {
  dish: FoodListing;
  onOrderPress: (dish: FoodListing) => void;
}

export const DishCard: React.FC<DishCardProps> = ({ dish, onOrderPress }) => {
  const { tokens } = useTheme();
  const isVeg = dish.diet_type === 'Pure Veg';

  return (
    <GlassCard style={styles.cardContainer}>
      {/* Dish Image + Portion badge */}
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: dish.image_url || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600' }}
          style={styles.image}
          contentFit="cover"
        />

        {/* Veg/Non-Veg Indicator Symbol */}
        <View style={styles.dietBadge}>
          <View style={[styles.dietSquare, { borderColor: isVeg ? '#22c55e' : '#ef4444' }]}>
            <View style={[styles.dietDot, { backgroundColor: isVeg ? '#22c55e' : '#ef4444' }]} />
          </View>
        </View>

        {/* Portions left badge */}
        <View style={styles.portionBadge}>
          <Text style={styles.portionText}>
            {dish.portions_left} {dish.portions_left === 1 ? 'portion' : 'portions'} left
          </Text>
        </View>
      </View>

      {/* Dish Details */}
      <View style={styles.detailsContainer}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.dishName, { color: tokens.textPrimary }]}
            numberOfLines={2}
          >
            {dish.dish_name}
          </Text>
          <View style={styles.ratingBadge}>
            <Star size={12} color="#fbbf24" fill="#fbbf24" />
            <Text style={styles.ratingText}>{dish.rating?.toFixed(1) || '4.9'}</Text>
          </View>
        </View>

        {/* Chef & Flat info */}
        <View style={styles.chefRow}>
          <Text style={[styles.chefLabel, { color: tokens.textMuted }]}>By </Text>
          <Text style={[styles.chefName, { color: tokens.textSecondary }]}>
            {dish.chef?.full_name || 'Home Cook'}
          </Text>
          <View
            style={[
              styles.flatPill,
              { backgroundColor: tokens.bgPill, borderColor: tokens.borderSubtle, borderWidth: 1 },
            ]}
          >
            <Text style={[styles.flatText, { color: tokens.textSecondary }]}>
              {dish.chef ? `${dish.chef.wing?.replace('Wing ', '')}-${dish.chef.flat_number}` : 'C-304'}
            </Text>
          </View>
        </View>

        {/* Ready timing */}
        <View style={styles.timingRow}>
          <Clock size={12} color={tokens.textMuted} />
          <Text style={[styles.timingText, { color: tokens.textMuted }]}>{dish.timing}</Text>
        </View>

        {/* Bottom row: Price and Order button */}
        <View
          style={[
            styles.bottomRow,
            { borderTopColor: tokens.borderDivider },
          ]}
        >
          <View style={styles.priceContainer}>
            <Text style={[styles.priceLabel, { color: tokens.textMuted }]}>Price</Text>
            <Text style={[styles.priceValue, { color: tokens.textPrimary }]}>₹{dish.price}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.orderButton,
              {
                backgroundColor: tokens.textPrimary,
              },
            ]}
            onPress={() => onOrderPress(dish)}
            activeOpacity={0.8}
          >
            <Text style={[styles.orderButtonText, { color: tokens.bgApp }]}>Order Meal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  imageWrapper: {
    width: '100%',
    height: 160,
    position: 'relative',
    backgroundColor: '#0f172a',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dietBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 6,
    padding: 4,
  },
  dietSquare: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dietDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  portionBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  portionText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
  },
  detailsContainer: {
    padding: 14,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dishName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ratingText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 3,
  },
  chefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  chefLabel: {
    fontSize: 12,
  },
  chefName: {
    fontSize: 12,
    fontWeight: '600',
  },
  flatPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  flatText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  timingText: {
    fontSize: 11,
    marginLeft: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  priceContainer: {},
  priceLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  orderButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  orderButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
});
