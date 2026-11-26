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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import * as ImagePicker from 'expo-image-picker';
import {
  Plus,
  Lock,
  Globe2,
  X,
  Info,
  ImageIcon,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react-native';
import { ComplaintCard } from '@/components/ComplaintCard';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import {
  Complaint,
  ComplaintVisibility,
  ComplaintCategory,
  ComplaintUrgency,
} from '@/types';
import { complaintsService } from '@/services/complaints';
import {
  useComplaints,
  useToggleComplaintUpvote,
  useFileComplaint,
} from '@/hooks/queries/useComplaints';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';

const CATEGORIES: ComplaintCategory[] = [
  'Lift & Electrical',
  'Water & Plumbing',
  'Cleaning & Garbage',
  'Parking & Security',
  'Other',
];

const URGENCIES: ComplaintUrgency[] = ['Normal', 'High', 'Urgent'];

export default function ComplaintsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<ComplaintVisibility>('public');

  const {
    complaints,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useComplaints(activeTab);

  const toggleUpvoteMutation = useToggleComplaintUpvote();
  const fileComplaintMutation = useFileComplaint();

  // File Complaint state
  const [showFileModal, setShowFileModal] = useState(false);
  const [formVisibility, setFormVisibility] = useState<ComplaintVisibility>('public');
  const [formCategory, setFormCategory] = useState<ComplaintCategory>('Lift & Electrical');
  const [formUrgency, setFormUrgency] = useState<ComplaintUrgency>('Normal');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPhoto, setFormPhoto] = useState<string | null>(null);

  // Bottom dock safe padding
  const dockHeight = 52 + Math.max(insets.bottom, 12);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handlePickPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!res.canceled && res.assets[0]) {
        setFormPhoto(res.assets[0].uri);
      }
    } catch {
      showToast('Media Picker', 'Failed to pick photo evidence.', 'error');
    }
  };

  const handleFileComplaint = async () => {
    if (!formTitle.trim()) {
      showToast('Validation Error', 'Please enter a ticket title.', 'error');
      return;
    }
    if (!formDescription.trim()) {
      showToast('Validation Error', 'Please describe the issue in detail.', 'error');
      return;
    }

    try {
      await fileComplaintMutation.mutateAsync({
        visibility: formVisibility,
        category: formCategory,
        urgency: formUrgency,
        title: formTitle.trim(),
        description: formDescription.trim(),
        mediaUrl: formPhoto || undefined,
      });

      showToast(
        'Complaint Lodged',
        formVisibility === 'admin'
          ? 'Confidential ticket sent directly to Society Admin.'
          : 'Public society ticket filed for community visibility.',
        'success'
      );

      setShowFileModal(false);
      setFormTitle('');
      setFormDescription('');
      setFormPhoto(null);
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to file complaint.', 'error');
    }
  };

  const canvasBg = isDark ? '#000000' : '#F5F5F7';
  const hairline = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <View style={[styles.container, { backgroundColor: canvasBg }]}>
      {/* 1. Sub Header: Segmented Dual Tabs & Primary Action */}
      <View style={[styles.subHeader, { borderBottomColor: hairline }]}>
        <View style={[styles.segmentedRow, { borderColor: hairline, backgroundColor: isDark ? '#111113' : '#E5E5EA' }]}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'public' && {
                backgroundColor: isDark ? '#F5F5F5' : '#111113',
              },
            ]}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync();
              setActiveTab('public');
            }}
            activeOpacity={0.7}
          >
            <Globe2
              size={13}
              strokeWidth={1.5}
              color={activeTab === 'public' ? (isDark ? '#000000' : '#FFFFFF') : '#71717A'}
            />
            <Text
              style={[
                styles.segmentText,
                {
                  color: activeTab === 'public' ? (isDark ? '#000000' : '#FFFFFF') : '#71717A',
                  fontWeight: activeTab === 'public' ? '600' : '400',
                },
              ]}
            >
              Public Community
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'admin' && {
                backgroundColor: isDark ? '#F5F5F5' : '#111113',
              },
            ]}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync();
              setActiveTab('admin');
            }}
            activeOpacity={0.7}
          >
            <Lock
              size={13}
              strokeWidth={1.5}
              color={activeTab === 'admin' ? (isDark ? '#000000' : '#FFFFFF') : '#71717A'}
            />
            <Text
              style={[
                styles.segmentText,
                {
                  color: activeTab === 'admin' ? (isDark ? '#000000' : '#FFFFFF') : '#71717A',
                  fontWeight: activeTab === 'admin' ? '600' : '400',
                },
              ]}
            >
              Direct to Admin
            </Text>
          </TouchableOpacity>
        </View>

        {/* Primary "+ File Ticket" Button (Crisp off-white / monochrome button) */}
        <TouchableOpacity
          style={[
            styles.fileTriggerBtn,
            {
              backgroundColor: isDark ? '#FFFFFF' : '#09090B',
            },
          ]}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFormVisibility(activeTab);
            setShowFileModal(true);
          }}
          activeOpacity={0.85}
        >
          <Plus size={15} strokeWidth={2} color={isDark ? '#09090B' : '#FFFFFF'} />
          <Text
            style={[
              styles.fileBtnText,
              { color: isDark ? '#09090B' : '#FFFFFF' },
            ]}
          >
            File Ticket
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Quiet Info Notice Bar (No emoji, no blue wash) */}
      <View style={[styles.infoBanner, { borderBottomColor: hairline }]}>
        <Info size={13} strokeWidth={1.5} color="#71717A" style={{ marginRight: 6 }} />
        <Text style={styles.infoBannerText}>
          {activeTab === 'public'
            ? 'Society-wide issues visible to residents. Upvote high-impact tickets to prioritize.'
            : 'Confidential tickets visible only to you and Society Admin / Committee members.'}
        </Text>
      </View>

      {/* 3. FlashList of Complaints */}
      {isLoading && !isRefetching ? (
        <SkeletonLoader variant="complaints" />
      ) : (
        <FlashList
          data={complaints}
          renderItem={({ item }) => (
            <ComplaintCard
              complaint={item}
              onUpvoteChange={(id) => toggleUpvoteMutation.mutate(id)}
            />
          )}
          keyExtractor={(item) => item.id}
          estimatedItemSize={220}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: dockHeight,
          }}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={isDark ? '#FFFFFF' : '#09090B'}
              colors={[isDark ? '#FFFFFF' : '#09090B']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CheckCircle2 size={36} strokeWidth={1.5} color={isDark ? '#71717A' : '#9CA3AF'} />
              <Text style={[styles.emptyTitle, { color: isDark ? '#F5F5F5' : '#111113' }]}>
                No active tickets
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'public'
                  ? 'All society amenities and facilities are operating normally.'
                  : 'You have no pending direct tickets with the society office.'}
              </Text>
            </View>
          }
        />
      )}

      {/* ===================== FILE COMPLAINT MODAL ===================== */}
      {showFileModal && (
        <Modal
          visible={true}
          animationType="slide"
          transparent
          onRequestClose={() => setShowFileModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: isDark ? '#121214' : '#FFFFFF',
                  borderColor: hairline,
                },
              ]}
            >
              <View style={[styles.modalHeader, { borderBottomColor: hairline }]}>
                <View style={styles.modalTitleRow}>
                  <ShieldCheck size={18} strokeWidth={1.5} color={isDark ? '#F5F5F5' : '#111113'} />
                  <Text style={[styles.modalTitle, { color: isDark ? '#F5F5F5' : '#111113' }]}>
                    File Society Ticket
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowFileModal(false)}
                  style={styles.closeBtn}
                  activeOpacity={0.7}
                >
                  <X size={18} strokeWidth={1.5} color="#71717A" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                {/* Target Visibility Switcher */}
                <Text style={styles.formLabel}>Ticket Visibility</Text>
                <View style={[styles.segmentedRow, { borderColor: hairline, backgroundColor: isDark ? '#18181B' : '#E5E5EA', marginBottom: 12 }]}>
                  <TouchableOpacity
                    style={[
                      styles.segmentBtn,
                      formVisibility === 'public' && {
                        backgroundColor: isDark ? '#F5F5F5' : '#111113',
                      },
                    ]}
                    onPress={() => setFormVisibility('public')}
                  >
                    <Globe2
                      size={12}
                      strokeWidth={1.5}
                      color={formVisibility === 'public' ? (isDark ? '#000000' : '#FFFFFF') : '#71717A'}
                    />
                    <Text
                      style={[
                        styles.segmentText,
                        {
                          color: formVisibility === 'public' ? (isDark ? '#000000' : '#FFFFFF') : '#71717A',
                          fontWeight: formVisibility === 'public' ? '600' : '400',
                        },
                      ]}
                    >
                      Public Community
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.segmentBtn,
                      formVisibility === 'admin' && {
                        backgroundColor: isDark ? '#F5F5F5' : '#111113',
                      },
                    ]}
                    onPress={() => setFormVisibility('admin')}
                  >
                    <Lock
                      size={12}
                      strokeWidth={1.5}
                      color={formVisibility === 'admin' ? (isDark ? '#000000' : '#FFFFFF') : '#71717A'}
                    />
                    <Text
                      style={[
                        styles.segmentText,
                        {
                          color: formVisibility === 'admin' ? (isDark ? '#000000' : '#FFFFFF') : '#71717A',
                          fontWeight: formVisibility === 'admin' ? '600' : '400',
                        },
                      ]}
                    >
                      Direct to Admin
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Category */}
                <Text style={styles.formLabel}>Category</Text>
                <View style={styles.chipRow}>
                  {CATEGORIES.map((cat) => {
                    const active = formCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active
                              ? isDark ? '#FFFFFF' : '#111113'
                              : isDark ? '#18181B' : '#F4F4F5',
                            borderColor: active ? 'transparent' : hairline,
                          },
                        ]}
                        onPress={() => setFormCategory(cat)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color: active
                                ? isDark ? '#000000' : '#FFFFFF'
                                : isDark ? '#A1A1AA' : '#4B5563',
                              fontWeight: active ? '600' : '400',
                            },
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Urgency */}
                <Text style={styles.formLabel}>Urgency</Text>
                <View style={styles.urgencyRow}>
                  {URGENCIES.map((urg) => {
                    const active = formUrgency === urg;
                    return (
                      <TouchableOpacity
                        key={urg}
                        style={[
                          styles.urgencyBtn,
                          {
                            backgroundColor: active
                              ? isDark ? '#27272A' : '#E5E5EA'
                              : isDark ? '#18181B' : '#F4F4F5',
                            borderColor: active
                              ? isDark ? '#3F3F46' : '#D1D5DB'
                              : hairline,
                          },
                        ]}
                        onPress={() => setFormUrgency(urg)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.urgencyBtnText,
                            {
                              color: active
                                ? urg === 'Urgent' ? '#EF4444' : isDark ? '#F5F5F5' : '#111113'
                                : isDark ? '#71717A' : '#6B7280',
                              fontWeight: active ? '600' : '400',
                            },
                          ]}
                        >
                          {urg}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Subject / Title */}
                <Text style={styles.formLabel}>Subject</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: isDark ? '#18181B' : '#F4F4F5',
                      borderColor: hairline,
                      color: isDark ? '#F5F5F5' : '#111113',
                    },
                  ]}
                  placeholder="e.g. Wing B Elevator #2 vibration issue"
                  placeholderTextColor="#71717A"
                  value={formTitle}
                  onChangeText={setFormTitle}
                />

                {/* Detailed Description */}
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      height: 96,
                      backgroundColor: isDark ? '#18181B' : '#F4F4F5',
                      borderColor: hairline,
                      color: isDark ? '#F5F5F5' : '#111113',
                    },
                  ]}
                  placeholder="Describe location, timing, or safety details..."
                  placeholderTextColor="#71717A"
                  multiline
                  numberOfLines={4}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  textAlignVertical="top"
                />

                {/* Photo Evidence */}
                <Text style={styles.formLabel}>Photo Evidence (Optional)</Text>
                <TouchableOpacity
                  style={[
                    styles.photoUploadBtn,
                    {
                      backgroundColor: isDark ? '#18181B' : '#F4F4F5',
                      borderColor: hairline,
                    },
                  ]}
                  onPress={handlePickPhoto}
                  activeOpacity={0.7}
                >
                  <ImageIcon size={18} strokeWidth={1.5} color="#A1A1AA" />
                  <Text style={styles.photoUploadText}>
                    {formPhoto ? 'Change Photo Evidence' : 'Attach Photo from Gallery'}
                  </Text>
                </TouchableOpacity>

                {/* Submit CTA */}
                <TouchableOpacity
                  style={[
                    styles.modalSubmitBtn,
                    {
                      backgroundColor: isDark ? '#FFFFFF' : '#09090B',
                    },
                  ]}
                  onPress={handleFileComplaint}
                  disabled={fileComplaintMutation.isPending}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.modalSubmitText,
                      { color: isDark ? '#000000' : '#FFFFFF' },
                    ]}
                  >
                    {fileComplaintMutation.isPending ? 'Submitting...' : 'File Ticket'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
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
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  segmentedRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    flex: 1,
    marginRight: 10,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 7,
    gap: 5,
  },
  segmentText: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
  fileTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 4,
  },
  fileBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  infoBannerText: {
    color: '#71717A',
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  emptySubtitle: {
    color: '#71717A',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 17,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formLabel: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 12,
  },
  formInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
  },
  urgencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  urgencyBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  urgencyBtnText: {
    fontSize: 12,
  },
  photoUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 12,
    gap: 8,
  },
  photoUploadText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '500',
  },
  modalSubmitBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
