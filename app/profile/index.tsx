import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Edit3,
  LogOut,
  Newspaper,
  ShoppingBag,
  AlertTriangle,
  X,
  Phone,
  CheckCircle2,
} from 'lucide-react-native';
import { GlassCard } from '@/components/GlassCard';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { island } from '@/context/IslandContext';
import { useTheme } from '@/context/ThemeContext';
import { foodService } from '@/services/food';
import { complaintsService } from '@/services/complaints';
import { postsService } from '@/services/posts';
import { useMyPosts, useMyOrders, useMyTickets } from '@/hooks/queries/useProfileData';
import { FoodOrder, Complaint, Post } from '@/types';
import * as Haptics from 'expo-haptics';

const WING_BUILDING_MAP: Record<string, string> = {
  'Wing A': 'Chintamani',
  'Wing B': 'Mayureshwar',
  'Wing C': 'Chintamani',
  'Wing D': 'Girijatmak',
  'Wing E': 'Vighnahar',
  'Wing F': 'Mahaganapati',
  'Wing G': 'Varadavinayak',
  'Wing H': 'Ballaleshwar',
  'Wing I': 'Chintamani',
  'Wing J': 'Mayureshwar',
  'Wing K': 'Siddhivinayak',
  'Wing L': 'Varadavinayak',
};

function getBuildingFlat(wing?: string, flatNumber?: string): string {
  const building = (wing && WING_BUILDING_MAP[wing]) || wing || 'Chintamani';
  const flat = flatNumber ? ` · ${flatNumber.trim()}` : '';
  return `${building}${flat}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut, updateProfile } = useAuth();
  const { showToast } = useToast();
  const { tokens, isDark } = useTheme();

  // Active sub-tab: 'posts' | 'orders' | 'tickets'
  const [activeSubTab, setActiveSubTab] = useState<'posts' | 'orders' | 'tickets'>('orders');

  // React Query cached user records
  const { data: myPosts = [], isLoading: loadingPosts, refetch: refetchPosts } = useMyPosts();
  const { data: myOrders = [], isLoading: loadingOrders, refetch: refetchOrders } = useMyOrders();
  const { data: myTickets = [], isLoading: loadingTickets, refetch: refetchTickets } = useMyTickets();

  const isLoading = loadingPosts || loadingOrders || loadingTickets;
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchPosts(), refetchOrders(), refetchTickets()]);
    setRefreshing(false);
  };

  // Edit Profile modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.full_name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      island.error('Validation Error', 'Name cannot be empty.');
      return;
    }

    try {
      setSavingProfile(true);
      await updateProfile({
        full_name: editName.trim(),
      });
      setShowEditModal(false);
      island.success('Profile Saved', 'Your changes have been saved.');
    } catch {
      island.error('Update Failed', 'Could not save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOut = () => {
    island.confirm({
      title: 'Sign Out',
      description: 'Are you sure you want to sign out of your resident account?',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        island.loading('Signing Out', 'Safely closing session...');
        await signOut();
        island.info('Signed Out', 'You have been safely signed out.');
        router.replace('/(auth)/login');
      },
    });
  };

  if (isLoading) {
    return <SkeletonLoader variant="profile" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: tokens.bgApp, paddingTop: insets.top }]}>
      {/* Top Bar (Clean single-back navigation without duplicate sign-out icon) */}
      <View style={[styles.topBar, { borderBottomColor: tokens.borderSubtle }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={tokens.textPrimary} strokeWidth={1.5} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: tokens.textPrimary }]}>Resident Profile</Text>
        <View style={styles.topRightSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 16, 24) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={tokens.textPrimary}
            colors={[tokens.textPrimary]}
          />
        }
      >
        {/* Resident Profile Card */}
        <GlassCard style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <Image
              source={{
                uri:
                  user?.avatar_url ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
              }}
              style={[styles.avatar, { borderColor: tokens.borderSubtle }]}
            />

            <View style={styles.profileMeta}>
              <Text style={[styles.fullName, { color: tokens.textPrimary }]}>
                {user?.full_name || 'Resident'}
              </Text>

              <Text style={[styles.flatText, { color: tokens.textSecondary }]}>
                {getBuildingFlat(user?.wing, user?.flat_number)}
              </Text>
              <Text style={[styles.roleText, { color: tokens.textMuted }]}>
                {user?.role ? user.role.toUpperCase() : 'RESIDENT'}
              </Text>
            </View>
          </View>

          {/* Contact Details (Phone only, email removed) */}
          <View
            style={[
              styles.contactDetails,
              {
                backgroundColor: isDark ? '#18181B' : '#F4F4F5',
                borderColor: tokens.borderSubtle,
              },
            ]}
          >
            <View style={styles.contactRow}>
              <Phone size={13} color={tokens.textMuted} strokeWidth={1.5} />
              <Text style={[styles.contactText, { color: tokens.textSecondary }]}>
                {user?.phone || '+91 98765 43210'}
              </Text>
            </View>
          </View>

          {/* Inline Edit Profile Button */}
          <TouchableOpacity
            style={[
              styles.editProfileBtn,
              {
                backgroundColor: isDark ? '#18181B' : '#F4F4F5',
                borderColor: tokens.borderSubtle,
              },
            ]}
            onPress={() => {
              setEditName(user?.full_name || '');
              setShowEditModal(true);
            }}
            activeOpacity={0.8}
          >
            <Edit3 size={14} color={tokens.textPrimary} strokeWidth={1.5} />
            <Text style={[styles.editProfileText, { color: tokens.textPrimary }]}>Edit Profile</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Sub-Tabs: My Posts | My Orders | My Tickets */}
        <View
          style={[
            styles.subTabsContainer,
            {
              backgroundColor: isDark ? '#111113' : '#F4F4F5',
              borderColor: tokens.borderSubtle,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.subTab,
              activeSubTab === 'posts' && [
                styles.subTabActive,
                {
                  backgroundColor: isDark ? '#FFFFFF' : '#09090B',
                  borderColor: isDark ? '#FFFFFF' : '#09090B',
                },
              ],
            ]}
            onPress={() => setActiveSubTab('posts')}
          >
            <Newspaper
              size={14}
              color={activeSubTab === 'posts' ? (isDark ? '#000000' : '#FFFFFF') : tokens.textMuted}
              strokeWidth={1.5}
            />
            <Text
              style={[
                styles.subTabText,
                { color: activeSubTab === 'posts' ? (isDark ? '#000000' : '#FFFFFF') : tokens.textMuted },
                activeSubTab === 'posts' && styles.subTabTextActive,
              ]}
            >
              Posts ({myPosts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.subTab,
              activeSubTab === 'orders' && [
                styles.subTabActive,
                {
                  backgroundColor: isDark ? '#FFFFFF' : '#09090B',
                  borderColor: isDark ? '#FFFFFF' : '#09090B',
                },
              ],
            ]}
            onPress={() => setActiveSubTab('orders')}
          >
            <ShoppingBag
              size={14}
              color={activeSubTab === 'orders' ? (isDark ? '#000000' : '#FFFFFF') : tokens.textMuted}
              strokeWidth={1.5}
            />
            <Text
              style={[
                styles.subTabText,
                { color: activeSubTab === 'orders' ? (isDark ? '#000000' : '#FFFFFF') : tokens.textMuted },
                activeSubTab === 'orders' && styles.subTabTextActive,
              ]}
            >
              Orders ({myOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.subTab,
              activeSubTab === 'tickets' && [
                styles.subTabActive,
                {
                  backgroundColor: isDark ? '#FFFFFF' : '#09090B',
                  borderColor: isDark ? '#FFFFFF' : '#09090B',
                },
              ],
            ]}
            onPress={() => setActiveSubTab('tickets')}
          >
            <AlertTriangle
              size={14}
              color={activeSubTab === 'tickets' ? (isDark ? '#000000' : '#FFFFFF') : tokens.textMuted}
              strokeWidth={1.5}
            />
            <Text
              style={[
                styles.subTabText,
                { color: activeSubTab === 'tickets' ? (isDark ? '#000000' : '#FFFFFF') : tokens.textMuted },
                activeSubTab === 'tickets' && styles.subTabTextActive,
              ]}
            >
              Tickets ({myTickets.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeSubTab === 'orders' && (
          <View style={styles.recordsList}>
            {myOrders.length === 0 ? (
              <Text style={[styles.emptyText, { color: tokens.textMuted }]}>
                No meal orders placed yet.
              </Text>
            ) : (
              myOrders.map((order) => (
                <GlassCard key={order.id} style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <Text style={[styles.recordTitle, { color: tokens.textPrimary }]}>
                      {order.dish?.dish_name || 'Home-Cooked Meal'}
                    </Text>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: isDark ? '#18181B' : '#F4F4F5',
                          borderColor: tokens.borderSubtle,
                        },
                      ]}
                    >
                      <Text style={[styles.statusPillText, { color: tokens.textSecondary }]}>
                        {order.order_status}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.recordMeta, { color: tokens.textMuted }]}>
                    Quantity: {order.quantity} · Total: ₹{order.total_amount}
                  </Text>
                  <Text style={[styles.recordDelivery, { color: tokens.textSecondary }]}>
                    Deliver to: {order.delivery_flat} ({order.payment_method})
                  </Text>
                </GlassCard>
              ))
            )}
          </View>
        )}

        {activeSubTab === 'tickets' && (
          <View style={styles.recordsList}>
            {myTickets.length === 0 ? (
              <Text style={[styles.emptyText, { color: tokens.textMuted }]}>
                No complaints filed.
              </Text>
            ) : (
              myTickets.map((ticket) => (
                <GlassCard key={ticket.id} style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <Text style={[styles.recordTitle, { color: tokens.textPrimary }]}>
                      {ticket.title}
                    </Text>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: isDark ? '#18181B' : '#F4F4F5',
                          borderColor: tokens.borderSubtle,
                        },
                      ]}
                    >
                      <Text style={[styles.statusPillText, { color: tokens.textSecondary }]}>
                        {ticket.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.recordMeta, { color: tokens.textMuted }]}>
                    {ticket.category} · Urgency: {ticket.urgency}
                  </Text>
                  {ticket.admin_note ? (
                    <Text style={[styles.recordAdminNote, { color: tokens.textSecondary }]}>
                      Note: {ticket.admin_note}
                    </Text>
                  ) : null}
                </GlassCard>
              ))
            )}
          </View>
        )}

        {activeSubTab === 'posts' && (
          <View style={styles.recordsList}>
            {myPosts.length === 0 ? (
              <Text style={[styles.emptyText, { color: tokens.textMuted }]}>
                No published posts yet.
              </Text>
            ) : (
              myPosts.map((post) => (
                <GlassCard key={post.id} style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <Text style={[styles.recordTag, { color: tokens.textSecondary }]}>
                      {post.tag}
                    </Text>
                    <Text style={[styles.recordLikes, { color: tokens.textMuted }]}>
                      {post.likes_count} Likes
                    </Text>
                  </View>
                  <Text style={[styles.recordBody, { color: tokens.textSecondary }]}>
                    {post.content}
                  </Text>
                </GlassCard>
              ))
            )}
          </View>
        )}

        {/* Flexible bottom spacer pushing Sign Out cleanly to the bottom */}
        <View style={styles.bottomSpacer} />

        {/* Anchored Sign Out CTA button */}
        <TouchableOpacity
          style={[
            styles.signOutBtn,
            {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEE2E2',
              borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA',
            },
          ]}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <LogOut size={16} color="#ef4444" strokeWidth={1.5} />
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal (Name edit only, bio removed) */}
      {showEditModal && (
        <Modal
          visible={true}
          animationType="fade"
          transparent
          onRequestClose={() => setShowEditModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: isDark ? '#121214' : '#FFFFFF',
                  borderColor: tokens.borderSubtle,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: tokens.textPrimary }]}>
                  Edit Resident Profile
                </Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <X size={18} color={tokens.textMuted} strokeWidth={1.5} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Full Name</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#18181B' : '#F4F4F5',
                    borderColor: tokens.borderSubtle,
                    color: tokens.textPrimary,
                  },
                ]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your name"
                placeholderTextColor={tokens.textMuted}
                autoFocus
              />

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  { backgroundColor: isDark ? '#FFFFFF' : '#09090B' },
                ]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
                activeOpacity={0.85}
              >
                <CheckCircle2 size={16} color={isDark ? '#000000' : '#FFFFFF'} strokeWidth={1.5} />
                <Text
                  style={[
                    styles.saveText,
                    { color: isDark ? '#000000' : '#FFFFFF' },
                  ]}
                >
                  {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  topRightSpacer: {
    width: 32,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  profileCard: {
    padding: 16,
    marginBottom: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    marginRight: 14,
  },
  profileMeta: {
    flex: 1,
  },
  fullName: {
    fontSize: 17,
    fontWeight: '600',
  },
  flatText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 2,
  },
  contactDetails: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginTop: 14,
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 12,
    marginLeft: 8,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
  subTabsContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  subTabActive: {
    borderWidth: 1,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  subTabTextActive: {
    fontWeight: '600',
  },
  recordsList: {
    gap: 12,
  },
  recordCard: {
    padding: 16,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recordTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  recordMeta: {
    fontSize: 12,
  },
  recordDelivery: {
    fontSize: 12,
    marginTop: 4,
  },
  recordAdminNote: {
    fontSize: 11,
    marginTop: 4,
  },
  recordTag: {
    fontSize: 12,
    fontWeight: '500',
  },
  recordLikes: {
    fontSize: 12,
  },
  recordBody: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
  bottomSpacer: {
    flex: 1,
    minHeight: 28,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 8,
  },
  signOutBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    height: 44,
    marginTop: 20,
    gap: 8,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
