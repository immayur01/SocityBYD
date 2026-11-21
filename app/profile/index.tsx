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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  ShieldCheck,
  Edit3,
  LogOut,
  Newspaper,
  ShoppingBag,
  AlertTriangle,
  X,
  User,
  Building,
  Phone,
  Mail,
  CheckCircle2,
} from 'lucide-react-native';
import { GlassCard } from '@/components/GlassCard';
import { IntroSplash } from '@/components/IntroSplash';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { foodService } from '@/services/food';
import { complaintsService } from '@/services/complaints';
import { postsService } from '@/services/posts';
import { FoodOrder, Complaint, Post } from '@/types';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut, updateProfile } = useAuth();
  const { showToast } = useToast();

  // Active sub-tab: 'posts' | 'orders' | 'tickets'
  const [activeSubTab, setActiveSubTab] = useState<'posts' | 'orders' | 'tickets'>('orders');

  // User records
  const [myOrders, setMyOrders] = useState<FoodOrder[]>([]);
  const [myTickets, setMyTickets] = useState<Complaint[]>([]);
  const [myPosts, setMyPosts] = useState<Post[]>([]);

  // Edit Profile modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.full_name || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [showReplay, setShowReplay] = useState(false);

  useEffect(() => {
    foodService.getUserOrders().then(setMyOrders);
    complaintsService.getUserTickets().then(setMyTickets);
    postsService.getPosts('all').then((posts) => {
      setMyPosts(posts.filter((p) => p.user_id === user?.id || p.user_id === 'usr-current-1'));
    });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      showToast('Validation Error', 'Name cannot be empty.', 'error');
      return;
    }

    try {
      setSavingProfile(true);
      await updateProfile({
        full_name: editName.trim(),
        bio: editBio.trim(),
      });
      setShowEditModal(false);
    } catch {
      // toast shown in context
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Resident Profile</Text>
        <TouchableOpacity
          style={styles.signOutHeaderBtn}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <LogOut size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Resident Profile Card */}
        <GlassCard style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <Image
              source={{
                uri:
                  user?.avatar_url ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
              }}
              style={styles.avatar}
            />

            <View style={styles.profileMeta}>
              <View style={styles.nameBadgeRow}>
                <Text style={styles.fullName}>{user?.full_name || 'Resident'}</Text>
                <View style={styles.verifiedBadge}>
                  <ShieldCheck size={13} color="#10b981" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              </View>

              <Text style={styles.flatText}>
                {user?.wing || 'Wing B'} • Flat {user?.flat_number || '402'}
              </Text>
              <Text style={styles.roleText}>
                Role: {user?.role ? user.role.toUpperCase() : 'RESIDENT'}
              </Text>
            </View>
          </View>

          {/* Bio */}
          <Text style={styles.bioText}>
            {user?.bio || 'Proud resident of Ashtavinayak Empire Co-op Housing Society.'}
          </Text>

          {/* Contact details */}
          <View style={styles.contactDetails}>
            <View style={styles.contactRow}>
              <Phone size={13} color="#94a3b8" />
              <Text style={styles.contactText}>{user?.phone || '+91 98765 43210'}</Text>
            </View>
            <View style={styles.contactRow}>
              <Mail size={13} color="#94a3b8" />
              <Text style={styles.contactText}>{user?.email || 'resident@ashtavinayak.org'}</Text>
            </View>
          </View>

          {/* Inline Edit Profile Button */}
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => {
              setEditName(user?.full_name || '');
              setEditBio(user?.bio || '');
              setShowEditModal(true);
            }}
            activeOpacity={0.8}
          >
            <Edit3 size={15} color="#c084fc" />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Sub-Tabs: My Posts | My Orders | My Tickets */}
        <View style={styles.subTabsContainer}>
          <TouchableOpacity
            style={[styles.subTab, activeSubTab === 'posts' && styles.subTabActive]}
            onPress={() => setActiveSubTab('posts')}
          >
            <Newspaper
              size={15}
              color={activeSubTab === 'posts' ? '#ec4899' : '#94a3b8'}
            />
            <Text style={[styles.subTabText, activeSubTab === 'posts' && styles.subTabTextActive]}>
              My Posts ({myPosts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTab, activeSubTab === 'orders' && styles.subTabActive]}
            onPress={() => setActiveSubTab('orders')}
          >
            <ShoppingBag
              size={15}
              color={activeSubTab === 'orders' ? '#f59e0b' : '#94a3b8'}
            />
            <Text style={[styles.subTabText, activeSubTab === 'orders' && styles.subTabTextActive]}>
              My Orders ({myOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTab, activeSubTab === 'tickets' && styles.subTabActive]}
            onPress={() => setActiveSubTab('tickets')}
          >
            <AlertTriangle
              size={15}
              color={activeSubTab === 'tickets' ? '#38bdf8' : '#94a3b8'}
            />
            <Text style={[styles.subTabText, activeSubTab === 'tickets' && styles.subTabTextActive]}>
              My Tickets ({myTickets.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeSubTab === 'orders' && (
          <View style={styles.recordsList}>
            {myOrders.length === 0 ? (
              <Text style={styles.emptyText}>You haven't ordered any meals yet.</Text>
            ) : (
              myOrders.map((order) => (
                <GlassCard key={order.id} style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <Text style={styles.recordTitle}>{order.dish?.dish_name || 'Home-Cooked Meal'}</Text>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{order.order_status}</Text>
                    </View>
                  </View>
                  <Text style={styles.recordMeta}>
                    Quantity: {order.quantity} • Total: ₹{order.total_amount}
                  </Text>
                  <Text style={styles.recordDelivery}>
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
              <Text style={styles.emptyText}>You have no filed complaints.</Text>
            ) : (
              myTickets.map((ticket) => (
                <GlassCard key={ticket.id} style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <Text style={styles.recordTitle}>{ticket.title}</Text>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{ticket.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.recordMeta}>
                    {ticket.category} • Urgency: {ticket.urgency}
                  </Text>
                  {ticket.admin_note ? (
                    <Text style={styles.recordAdminNote}>
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
              <Text style={styles.emptyText}>You haven't published any posts yet.</Text>
            ) : (
              myPosts.map((post) => (
                <GlassCard key={post.id} style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <Text style={styles.recordTag}>{post.tag}</Text>
                    <Text style={styles.recordLikes}>{post.likes_count} Likes</Text>
                  </View>
                  <Text style={styles.recordBody}>{post.content}</Text>
                </GlassCard>
              ))
            )}
          </View>
        )}

        {/* Replay Startup Intro Animation */}
        <TouchableOpacity
          style={styles.replayBtn}
          onPress={() => setShowReplay(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.replayBtnText}>✨ Replay Startup Intro Animation</Text>
        </TouchableOpacity>

        {/* Sign Out CTA button */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <LogOut size={16} color="#ef4444" />
          <Text style={styles.signOutBtnText}>Sign Out of Ashtavinayak Empire</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Replay Intro Splash when requested */}
      {showReplay && (
        <IntroSplash
          forcePlay
          onFinish={() => setShowReplay(false)}
        />
      )}

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Resident Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.inputLabel}>Resident Bio</Text>
            <TextInput
              style={[styles.input, { height: 90 }]}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Tell your neighbors about your hobbies, work, etc."
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSaveProfile}
              disabled={savingProfile}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#7c3aed', '#ec4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveGradient}
              >
                <CheckCircle2 size={16} color="#ffffff" />
                <Text style={styles.saveText}>
                  {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtn: {
    padding: 6,
  },
  topTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  signOutHeaderBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    padding: 20,
    marginBottom: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#c084fc',
    marginRight: 14,
  },
  profileMeta: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  fullName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginRight: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 3,
  },
  flatText: {
    color: '#c084fc',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  roleText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  bioText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 14,
    marginBottom: 12,
  },
  contactDetails: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    color: '#cbd5e1',
    fontSize: 12,
    marginLeft: 8,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.4)',
    borderRadius: 10,
    paddingVertical: 9,
  },
  editProfileText: {
    color: '#c084fc',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  subTabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  subTabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  subTabText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 5,
  },
  subTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  recordsList: {
    gap: 12,
  },
  recordCard: {
    padding: 14,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recordTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  statusPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '700',
  },
  recordMeta: {
    color: '#94a3b8',
    fontSize: 12,
  },
  recordDelivery: {
    color: '#c084fc',
    fontSize: 11,
    marginTop: 4,
  },
  recordAdminNote: {
    color: '#fbbf24',
    fontSize: 11,
    marginTop: 4,
  },
  recordTag: {
    color: '#c084fc',
    fontSize: 11,
    fontWeight: '700',
  },
  recordLikes: {
    color: '#ec4899',
    fontSize: 11,
    fontWeight: '600',
  },
  recordBody: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
  replayBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 20,
  },
  replayBtnText: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 24,
  },
  signOutBtnText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#181534',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
  },
  saveBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 20,
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  saveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 6,
  },
});
