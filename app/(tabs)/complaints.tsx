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
  Lock,
  Globe2,
  X,
  AlertTriangle,
  Image as ImageIcon,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react-native';
import { ComplaintCard } from '@/components/ComplaintCard';
import {
  Complaint,
  ComplaintVisibility,
  ComplaintCategory,
  ComplaintUrgency,
} from '@/types';
import { complaintsService } from '@/services/complaints';
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
  const { user } = useAuth();
  const { showToast } = useToast();
  const { tokens, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<ComplaintVisibility>('public');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // File Complaint state
  const [showFileModal, setShowFileModal] = useState(false);
  const [formVisibility, setFormVisibility] = useState<ComplaintVisibility>('public');
  const [formCategory, setFormCategory] = useState<ComplaintCategory>('Lift & Electrical');
  const [formUrgency, setFormUrgency] = useState<ComplaintUrgency>('Normal');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPhoto, setFormPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadComplaints = useCallback(async () => {
    try {
      const data = await complaintsService.getComplaints(activeTab);
      setComplaints(data);
    } catch {
      // fallback
    }
  }, [activeTab]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadComplaints();
    setRefreshing(false);
  };

  const handlePickPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      setSubmitting(true);
      await complaintsService.fileComplaint({
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
      await loadComplaints();
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to file complaint.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: tokens.bgApp }]}>
      {/* Sub Header: Segmented Dual Tabs */}
      <View style={[styles.subHeader, { borderBottomColor: tokens.borderSubtle }]}>
        <View style={styles.segmentedRow}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'public' && styles.segmentBtnActive]}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync();
              setActiveTab('public');
            }}
          >
            <Globe2
              size={14}
              color={activeTab === 'public' ? '#38bdf8' : '#94a3b8'}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'public' && styles.segmentTextActive,
              ]}
            >
              Public Community
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'admin' && styles.segmentBtnActive]}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync();
              setActiveTab('admin');
            }}
          >
            <Lock
              size={14}
              color={activeTab === 'admin' ? '#fca5a5' : '#94a3b8'}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'admin' && styles.segmentTextActive,
              ]}
            >
              Direct to Admin
            </Text>
          </TouchableOpacity>
        </View>

        {/* File Complaint Trigger Button */}
        <TouchableOpacity
          style={styles.fileTriggerBtn}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFormVisibility(activeTab);
            setShowFileModal(true);
          }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#0284c7', '#0369a1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fileBtnGradient}
          >
            <Plus size={16} color="#ffffff" />
            <Text style={styles.fileBtnText}>File Ticket</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Info notice bar */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>
          {activeTab === 'public'
            ? '📢 Society-wide issues visible to all residents. Upvote high-impact tickets to alert admin.'
            : '🔒 Confidential tickets visible only to you and Society Admin / Committee members.'}
        </Text>
      </View>

      {/* FlashList of Complaints */}
      <FlashList
        data={complaints}
        renderItem={({ item }) => <ComplaintCard complaint={item} />}
        keyExtractor={(item) => item.id}
        estimatedItemSize={280}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#38bdf8"
            colors={['#0284c7', '#7c3aed']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <CheckCircle2 size={42} color="#10b981" />
            <Text style={styles.emptyTitle}>No active tickets in this section</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'public'
                ? 'All society amenities and facilities are operating smoothly!'
                : 'You have no pending direct tickets with the society office.'}
            </Text>
          </View>
        }
      />

      {/* ===================== FILE COMPLAINT MODAL ===================== */}
      <Modal visible={showFileModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <AlertTriangle size={20} color="#38bdf8" />
                <Text style={styles.modalTitle}>File Society Complaint</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFileModal(false)} style={styles.closeBtn}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Target Visibility Switcher */}
              <Text style={styles.formLabel}>Complaint Visibility</Text>
              <View style={styles.segmentedRow}>
                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    formVisibility === 'public' && styles.segmentBtnActive,
                  ]}
                  onPress={() => setFormVisibility('public')}
                >
                  <Globe2 size={13} color={formVisibility === 'public' ? '#38bdf8' : '#94a3b8'} />
                  <Text style={[styles.segmentText, formVisibility === 'public' && styles.segmentTextActive]}>
                    Public Community
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    formVisibility === 'admin' && styles.segmentBtnActive,
                  ]}
                  onPress={() => setFormVisibility('admin')}
                >
                  <Lock size={13} color={formVisibility === 'admin' ? '#fca5a5' : '#94a3b8'} />
                  <Text style={[styles.segmentText, formVisibility === 'admin' && styles.segmentTextActive]}>
                    Direct to Admin
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Category */}
              <Text style={styles.formLabel}>Category</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, formCategory === cat && styles.chipActive]}
                    onPress={() => setFormCategory(cat)}
                  >
                    <Text style={[styles.chipText, formCategory === cat && styles.chipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Urgency */}
              <Text style={styles.formLabel}>Urgency Level</Text>
              <View style={styles.urgencyRow}>
                {URGENCIES.map((urg) => (
                  <TouchableOpacity
                    key={urg}
                    style={[styles.urgencyBtn, formUrgency === urg && styles.urgencyBtnActive]}
                    onPress={() => setFormUrgency(urg)}
                  >
                    <Text style={[styles.urgencyBtnText, formUrgency === urg && styles.urgencyBtnTextActive]}>
                      {urg}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Title / Subject */}
              <Text style={styles.formLabel}>Subject / Title</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Wing B Elevator #2 vibration issue"
                placeholderTextColor="#64748b"
                value={formTitle}
                onChangeText={setFormTitle}
              />

              {/* Description */}
              <Text style={styles.formLabel}>Detailed Description</Text>
              <TextInput
                style={[styles.formInput, { height: 100 }]}
                placeholder="Describe the issue, exact location, timing..."
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={4}
                value={formDescription}
                onChangeText={setFormDescription}
                textAlignVertical="top"
              />

              {/* Photo Evidence */}
              <Text style={styles.formLabel}>Photo Evidence (Optional)</Text>
              <TouchableOpacity
                style={styles.photoUploadBtn}
                onPress={handlePickPhoto}
                activeOpacity={0.7}
              >
                <ImageIcon size={20} color="#38bdf8" />
                <Text style={styles.photoUploadText}>
                  {formPhoto ? 'Change Photo Evidence' : 'Attach Photo Proof from Gallery'}
                </Text>
              </TouchableOpacity>

              {/* Submit CTA */}
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleFileComplaint}
                disabled={submitting}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#0284c7', '#0369a1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalSubmitGradient}
                >
                  <ShieldAlert size={18} color="#ffffff" />
                  <Text style={[styles.modalSubmitText, { marginLeft: 8 }]}>
                    {submitting ? 'Lodge Ticket...' : 'File Official Complaint'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
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
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.25)',
  },
  segmentText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },
  segmentTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  fileTriggerBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginLeft: 8,
  },
  fileBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  fileBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4,
  },
  infoBanner: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoBannerText: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 15,
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
    maxWidth: 280,
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
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
    marginTop: 12,
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  chipActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
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
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  urgencyBtnActive: {
    borderColor: '#f97316',
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
  },
  urgencyBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  urgencyBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  photoUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderStyle: 'dashed',
    paddingVertical: 14,
  },
  photoUploadText: {
    color: '#38bdf8',
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
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
