import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  ScrollView,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus,
  UtensilsCrossed,
  ChefHat,
  X,
  CheckCircle2,
  Image as ImageIcon,
  ShoppingBag,
} from 'lucide-react-native';
import { DishCard } from '@/components/DishCard';
import { FoodListing, DietType } from '@/types';
import { foodService } from '@/services/food';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';

export default function FoodCornerScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { tokens, isDark } = useTheme();

  const [dishes, setDishes] = useState<FoodListing[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Publish Dish state
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [dishName, setDishName] = useState('');
  const [price, setPrice] = useState('');
  const [dietType, setDietType] = useState<DietType>('Pure Veg');
  const [timing, setTiming] = useState('Ready by 7:30 PM (Dinner)');
  const [portions, setPortions] = useState('5');
  const [dishImage, setDishImage] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  // Order Meal state
  const [selectedDish, setSelectedDish] = useState<FoodListing | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [deliveryFlat, setDeliveryFlat] = useState(
    user ? `${user.wing?.replace('Wing ', '')}-${user.flat_number}` : 'B-402'
  );
  const [deliveryNote, setDeliveryNote] = useState('');
  const [ordering, setOrdering] = useState(false);

  const loadDishes = useCallback(async () => {
    try {
      const data = await foodService.getFoodListings();
      setDishes(data);
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    loadDishes();
  }, [loadDishes]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDishes();
    setRefreshing(false);
  };

  const handlePickDishPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!res.canceled && res.assets[0]) {
        setDishImage(res.assets[0].uri);
      }
    } catch {
      showToast('Media Picker', 'Failed to pick photo.', 'error');
    }
  };

  const handlePublishDish = async () => {
    if (!dishName.trim()) {
      showToast('Validation Error', 'Please enter a dish name.', 'error');
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      showToast('Validation Error', 'Please enter a valid price in ₹.', 'error');
      return;
    }
    const numPortions = parseInt(portions, 10);
    if (isNaN(numPortions) || numPortions <= 0) {
      showToast('Validation Error', 'Please specify portions available.', 'error');
      return;
    }

    try {
      setPublishing(true);
      await foodService.publishDish({
        dishName: dishName.trim(),
        price: numPrice,
        dietType,
        timing: timing.trim(),
        portionsAvailable: numPortions,
        imageUrl: dishImage || undefined,
      });

      showToast('Dish Published!', `"${dishName}" is now available in Food Corner!`, 'success');
      setShowPublishModal(false);
      setDishName('');
      setPrice('');
      setDishImage(null);
      await loadDishes();
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to publish dish.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!selectedDish) return;

    if (!deliveryFlat.trim()) {
      showToast('Validation Error', 'Please specify your delivery flat.', 'error');
      return;
    }

    try {
      setOrdering(true);
      await foodService.placeOrder({
        listingId: selectedDish.id,
        quantity: orderQuantity,
        deliveryFlat: deliveryFlat.trim(),
        deliveryNote: deliveryNote.trim(),
      });

      showToast(
        'Meal Ordered!',
        `Order confirmed for ${orderQuantity}x ${selectedDish.dish_name}. Pay on delivery!`,
        'success'
      );
      setSelectedDish(null);
      setOrderQuantity(1);
      setDeliveryNote('');
      await loadDishes();
    } catch (err: any) {
      showToast('Order Failed', err.message || 'Could not place meal order.', 'error');
    } finally {
      setOrdering(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: tokens.bgApp }]}>
      {/* Sub Header */}
      <View style={[styles.subHeader, { borderBottomColor: tokens.borderSubtle }]}>
        <View style={styles.headerInfo}>
          <Text style={[styles.title, { color: tokens.textPrimary }]}>Society Food Corner</Text>
          <Text style={[styles.subtitle, { color: tokens.textMuted }]}>Fresh hygienic meals prepared by resident home cooks</Text>
        </View>

        {/* Publish a Dish CTA Button */}
        <TouchableOpacity
          style={styles.publishTriggerBtn}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowPublishModal(true);
          }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#f59e0b', '#d97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.publishBtnGradient}
          >
            <ChefHat size={16} color="#000000" />
            <Text style={styles.publishTriggerText}>Cook & Earn</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Main Dishes FlashList */}
      <FlashList
        data={dishes}
        renderItem={({ item }) => (
          <DishCard
            dish={item}
            onOrderPress={(dish) => {
              if (Platform.OS !== 'web') Haptics.selectionAsync();
              setSelectedDish(dish);
            }}
          />
        )}
        keyExtractor={(item) => item.id}
        estimatedItemSize={300}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#f59e0b"
            colors={['#f59e0b', '#ec4899']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <UtensilsCrossed size={40} color="#64748b" />
            <Text style={styles.emptyTitle}>No meals listed right now</Text>
            <Text style={styles.emptySubtitle}>
              Are you preparing dinner or snacks today? Tap "Cook & Earn" to list your fresh dish!
            </Text>
          </View>
        }
      />

      {/* ===================== PUBLISH A DISH MODAL ===================== */}
      <Modal visible={showPublishModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <ChefHat size={20} color="#f59e0b" />
                <Text style={styles.modalTitle}>Publish Home-Cooked Dish</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPublishModal(false)} style={styles.closeBtn}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Dish Name */}
              <Text style={styles.formLabel}>Dish Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Maharashtrian Thali, Puran Poli..."
                placeholderTextColor="#64748b"
                value={dishName}
                onChangeText={setDishName}
              />

              {/* Diet Type Selector */}
              <Text style={styles.formLabel}>Food Classification</Text>
              <View style={styles.dietSelectorRow}>
                <TouchableOpacity
                  style={[styles.dietTab, dietType === 'Pure Veg' && styles.dietTabVegActive]}
                  onPress={() => setDietType('Pure Veg')}
                >
                  <View style={[styles.dietCircle, { backgroundColor: '#22c55e' }]} />
                  <Text style={[styles.dietTabText, dietType === 'Pure Veg' && { color: '#ffffff' }]}>
                    Pure Veg
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dietTab, dietType === 'Non-Veg' && styles.dietTabNonVegActive]}
                  onPress={() => setDietType('Non-Veg')}
                >
                  <View style={[styles.dietCircle, { backgroundColor: '#ef4444' }]} />
                  <Text style={[styles.dietTabText, dietType === 'Non-Veg' && { color: '#ffffff' }]}>
                    Non-Veg
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Price & Portions Row */}
              <View style={styles.twoColRow}>
                <View style={[styles.col, { marginRight: 8 }]}>
                  <Text style={styles.formLabel}>Price (₹)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="180"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>

                <View style={[styles.col, { marginLeft: 8 }]}>
                  <Text style={styles.formLabel}>Portions Available</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="5"
                    placeholderTextColor="#64748b"
                    keyboardType="number-pad"
                    value={portions}
                    onChangeText={setPortions}
                  />
                </View>
              </View>

              {/* Ready Timing */}
              <Text style={styles.formLabel}>Ready Timing</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Ready by 7:30 PM (Dinner)"
                placeholderTextColor="#64748b"
                value={timing}
                onChangeText={setTiming}
              />

              {/* Photo Upload */}
              <Text style={styles.formLabel}>Dish Photo</Text>
              <TouchableOpacity
                style={styles.photoUploadBtn}
                onPress={handlePickDishPhoto}
                activeOpacity={0.7}
              >
                <ImageIcon size={20} color="#f59e0b" />
                <Text style={styles.photoUploadText}>
                  {dishImage ? 'Change Dish Photo' : 'Select Dish Photo from Gallery'}
                </Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handlePublishDish}
                disabled={publishing}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#f59e0b', '#d97706']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalSubmitGradient}
                >
                  <Text style={styles.modalSubmitText}>
                    {publishing ? 'Publishing Dish...' : 'Publish to Food Corner →'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===================== ORDER MEAL CONFIRMATION SHEET ===================== */}
      <Modal visible={Boolean(selectedDish)} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.orderSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <ShoppingBag size={20} color="#f59e0b" />
                <Text style={styles.modalTitle}>Order Confirmation</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedDish(null)} style={styles.closeBtn}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {selectedDish && (
              <View>
                {/* Dish summary card */}
                <View style={styles.orderSummaryCard}>
                  <Text style={styles.orderDishName}>{selectedDish.dish_name}</Text>
                  <Text style={styles.orderChefInfo}>
                    Prepared fresh by {selectedDish.chef?.full_name} ({selectedDish.chef?.wing} - {selectedDish.chef?.flat_number})
                  </Text>
                  <Text style={styles.orderTimingInfo}>⏰ {selectedDish.timing}</Text>
                </View>

                {/* Quantity Selector */}
                <View style={styles.quantityRow}>
                  <Text style={styles.formLabel}>Quantity</Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => setOrderQuantity((q) => Math.max(1, q - 1))}
                    >
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{orderQuantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() =>
                        setOrderQuantity((q) =>
                          Math.min(selectedDish.portions_left, q + 1)
                        )
                      }
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Delivery Flat */}
                <Text style={styles.formLabel}>Delivery Flat</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Wing B-402"
                  placeholderTextColor="#64748b"
                  value={deliveryFlat}
                  onChangeText={setDeliveryFlat}
                />

                {/* Delivery Note */}
                <Text style={styles.formLabel}>Special Note (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Less spicy, call before ringing bell..."
                  placeholderTextColor="#64748b"
                  value={deliveryNote}
                  onChangeText={setDeliveryNote}
                />

                {/* Total Amount Pill */}
                <View style={styles.totalRow}>
                  <View>
                    <Text style={styles.totalLabel}>Total Payable Amount</Text>
                    <Text style={styles.totalPaymentNote}>Pay on Delivery (Cash / UPI to Cook)</Text>
                  </View>
                  <Text style={styles.totalAmount}>₹{selectedDish.price * orderQuantity}</Text>
                </View>

                {/* Confirm Order CTA */}
                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={handleConfirmOrder}
                  disabled={ordering}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalSubmitGradient}
                  >
                    <CheckCircle2 size={18} color="#ffffff" />
                    <Text style={[styles.modalSubmitText, { marginLeft: 8 }]}>
                      {ordering ? 'Placing Order...' : 'Place Order (Pay on Delivery)'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerInfo: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 1,
  },
  publishTriggerBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  publishBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  publishTriggerText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 96,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 260,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#181534',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.18)',
    maxHeight: '90%',
  },
  orderSheet: {
    backgroundColor: '#181534',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.18)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    marginLeft: 8,
  },
  closeBtn: {
    padding: 6,
  },
  formLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  formInput: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
  },
  dietSelectorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dietTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dietTabVegActive: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  dietTabNonVegActive: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  dietCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  dietTabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  twoColRow: {
    flexDirection: 'row',
  },
  col: {
    flex: 1,
  },
  photoUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderStyle: 'dashed',
    paddingVertical: 14,
  },
  photoUploadText: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalSubmitBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 20,
    marginBottom: 10,
  },
  modalSubmitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  modalSubmitText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  orderSummaryCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  orderDishName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  orderChefInfo: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  orderTimingInfo: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 10,
    padding: 4,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  qtyValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  totalLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  totalPaymentNote: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '600',
  },
  totalAmount: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
});
