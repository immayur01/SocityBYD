import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  KeyboardAvoidingView,
  Image as RNImage,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  ArrowLeft,
  X,
  Plus,
  FileText,
  Calendar,
  Clock,
  ChevronRight,
  AlertCircle,
  Pin,
  Image as ImageIcon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { island } from '@/context/IslandContext';
import { AttachedMediaItem, AttachedDocumentItem, UploadTaskPayload } from '@/services/uploadQueue';
import { AudienceSheet, AudienceSelection } from './sheets/AudienceSheet';
import { PinSheet, PinOption } from './sheets/PinSheet';

interface UnifiedComposerStepProps {
  mode: 'POST' | 'EVENT' | 'NOTICE';
  mediaItems: AttachedMediaItem[];
  onChangeMediaItems: (items: AttachedMediaItem[]) => void;
  documentItem: AttachedDocumentItem | null;
  onChangeDocumentItem: (doc: AttachedDocumentItem | null) => void;
  caption: string;
  onChangeCaption: (text: string) => void;
  onBackToPicker: () => void;
  onClose: () => void;
  onSubmit: (payload: UploadTaskPayload) => void;
}

const VENUE_CHIPS = ['Clubhouse', 'Garden', 'Terrace', 'Main Gate', 'Party Lawn'];

export const UnifiedComposerStep: React.FC<UnifiedComposerStepProps> = ({
  mode,
  mediaItems,
  onChangeMediaItems,
  documentItem,
  onChangeDocumentItem,
  caption,
  onChangeCaption,
  onBackToPicker,
  onClose,
  onSubmit,
}) => {
  // Common Settings
  const [audience, setAudience] = useState<AudienceSelection>({ type: 'All Residents' });
  const [showAudienceSheet, setShowAudienceSheet] = useState(false);
  const [allowComments, setAllowComments] = useState(true);

  // Event Mode Specific
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('Today');
  const [eventTime, setEventTime] = useState('06:00 PM');
  const [eventVenue, setEventVenue] = useState('');
  const [eventDetails, setEventDetails] = useState('');
  const [eventCoverUri, setEventCoverUri] = useState<string | null>(null);
  const [rsvpEnabled, setRsvpEnabled] = useState(true);

  // Notice Mode Specific
  const [noticeHeadline, setNoticeHeadline] = useState('');
  const [noticePriority, setNoticePriority] = useState<'normal' | 'urgent'>('normal');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [pinDuration, setPinDuration] = useState<PinOption>('Off');
  const [showPinSheet, setShowPinSheet] = useState(false);

  // Add more media in POST mode
  const handleAddMoreMedia = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        quality: 0.9,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const newItems: AttachedMediaItem[] = res.assets.map((asset) => ({
          type: asset.type === 'video' ? 'video' : 'image',
          uri: asset.uri,
          name: asset.fileName || `media_${Date.now()}`,
          width: asset.width,
          height: asset.height,
          duration: asset.duration ? Math.round(asset.duration / 1000) : undefined,
        }));
        const combined = [...mediaItems, ...newItems].slice(0, 10);
        onChangeMediaItems(combined);
      }
    } catch (e) {
      island.error('Picker Error', 'Could not open media gallery.');
    }
  };

  // Remove individual media
  const handleRemoveMedia = (index: number) => {
    const updated = mediaItems.filter((_, i) => i !== index);
    onChangeMediaItems(updated);
  };

  // Event Cover Picker
  const handlePickEventCover = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: true,
        aspect: [16, 9],
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setEventCoverUri(res.assets[0].uri);
      }
    } catch (e) {
      island.error('Picker Error', 'Could not pick event cover.');
    }
  };

  // Document Picker
  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/*', 'text/*'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        onChangeDocumentItem({
          type: 'file',
          uri: file.uri,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
        });
      }
    } catch (e) {
      island.error('Document Picker', 'Could not open document picker.');
    }
  };

  // Validation
  const isValid = (() => {
    if (mode === 'POST') {
      return mediaItems.length > 0 || caption.trim().length > 0 || !!documentItem;
    }
    if (mode === 'EVENT') {
      return eventTitle.trim().length > 0 && eventVenue.trim().length > 0;
    }
    if (mode === 'NOTICE') {
      return noticeHeadline.trim().length > 0 && noticeMessage.trim().length > 0;
    }
    return false;
  })();

  const handleSubmit = () => {
    if (!isValid) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    const payload: UploadTaskPayload = {
      mode,
      caption,
      mediaItems,
      documentItem,
      audience:
        audience.type === 'Specific Buildings' && audience.specificBuildings
          ? `Wings ${audience.specificBuildings.join(', ')}`
          : audience.type,
      allowComments,
      eventTitle,
      eventDate,
      eventTime,
      eventVenue,
      eventDetails,
      eventCoverUri: eventCoverUri || undefined,
      rsvpEnabled,
      noticeHeadline,
      noticePriority,
      noticeMessage,
      pinDuration,
    };

    onSubmit(payload);
  };

  const audienceLabel =
    audience.type === 'Specific Buildings' && audience.specificBuildings
      ? `Wings ${audience.specificBuildings.join(', ')}`
      : audience.type;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Top Bar (height 52) */}
      <View style={styles.topBar}>
        {mode === 'POST' ? (
          <TouchableOpacity
            onPress={onBackToPicker}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} strokeWidth={1.5} color="#F5F5F5" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onClose}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <X size={20} strokeWidth={1.5} color="#F5F5F5" />
          </TouchableOpacity>
        )}

        <Text style={styles.topBarTitle}>
          {mode === 'POST' ? 'New Post' : mode === 'EVENT' ? 'New Event' : 'New Notice'}
        </Text>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!isValid}
          style={[styles.primaryCta, !isValid && styles.primaryCtaDisabled]}
          activeOpacity={0.85}
        >
          <Text style={[styles.primaryCtaText, !isValid && styles.primaryCtaTextDisabled]}>
            {mode === 'POST' ? 'Share' : 'Publish'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── POST MODE COMPOSER ─── */}
        {mode === 'POST' && (
          <View style={styles.composerBody}>
            {/* Horizontal Media Strip */}
            {mediaItems.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.mediaStrip}
              >
                {mediaItems.map((item, index) => (
                  <View key={item.uri} style={styles.mediaThumbnailWrap}>
                    <RNImage source={{ uri: item.uri }} style={styles.mediaThumbnail} />
                    <TouchableOpacity
                      style={styles.removeMediaBtn}
                      onPress={() => handleRemoveMedia(index)}
                      activeOpacity={0.8}
                    >
                      <X size={12} strokeWidth={1.8} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}

                {mediaItems.length < 10 && (
                  <TouchableOpacity
                    style={styles.addMediaTile}
                    onPress={handleAddMoreMedia}
                    activeOpacity={0.7}
                  >
                    <Plus size={20} strokeWidth={1.5} color="#A1A1AA" />
                    <Text style={styles.addMediaText}>Add</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}

            {/* Borderless Caption Input */}
            <View style={styles.captionContainer}>
              <TextInput
                style={styles.captionInput}
                multiline
                maxLength={2200}
                value={caption}
                onChangeText={onChangeCaption}
                placeholder="Write a caption..."
                placeholderTextColor="#71717A"
                textAlignVertical="top"
              />
              {caption.length > 1800 && (
                <Text style={styles.charCount}>{caption.length} / 2,200</Text>
              )}
            </View>

            {/* Document Attachment Chip if attached */}
            {documentItem && (
              <View style={styles.docChip}>
                <View style={styles.docChipLeft}>
                  <FileText size={16} strokeWidth={1.5} color="#F5F5F5" />
                  <Text style={styles.docChipName} numberOfLines={1}>
                    {documentItem.name}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => onChangeDocumentItem(null)}
                  style={styles.docChipRemove}
                >
                  <X size={14} strokeWidth={1.5} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            )}

            {/* Flat Hairline-Divided Settings Rows */}
            <View style={styles.settingsGroup}>
              {/* Audience Row */}
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => setShowAudienceSheet(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.settingLabel}>Audience</Text>
                <View style={styles.settingRight}>
                  <Text style={styles.settingValue} numberOfLines={1}>
                    {audienceLabel}
                  </Text>
                  <ChevronRight size={15} strokeWidth={1.5} color="#71717A" />
                </View>
              </TouchableOpacity>

              <View style={styles.hairline} />

              {/* Allow Comments Switch Row */}
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Allow Comments</Text>
                <Switch
                  value={allowComments}
                  onValueChange={setAllowComments}
                  thumbColor={allowComments ? '#F5F5F5' : '#71717A'}
                  trackColor={{ false: '#27272A', true: '#3F3F46' }}
                />
              </View>

              <View style={styles.hairline} />

              {/* Attach Document Row */}
              <TouchableOpacity
                style={styles.settingRow}
                onPress={handlePickDocument}
                activeOpacity={0.7}
              >
                <Text style={styles.settingLabel}>Attach Document</Text>
                <View style={styles.settingRight}>
                  <Text style={styles.settingPlaceholder}>PDF / Circular</Text>
                  <ChevronRight size={15} strokeWidth={1.5} color="#71717A" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ─── EVENT MODE COMPOSER ─── */}
        {mode === 'EVENT' && (
          <View style={styles.composerBody}>
            {/* Optional 16:9 Cover Image Slot */}
            <TouchableOpacity
              style={styles.eventCoverSlot}
              onPress={handlePickEventCover}
              activeOpacity={0.8}
            >
              {eventCoverUri ? (
                <>
                  <RNImage source={{ uri: eventCoverUri }} style={styles.eventCoverImage} />
                  <TouchableOpacity
                    style={styles.removeCoverBtn}
                    onPress={() => setEventCoverUri(null)}
                  >
                    <X size={13} strokeWidth={1.5} color="#FFFFFF" />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.emptyCoverContent}>
                  <ImageIcon size={20} strokeWidth={1.5} color="#A1A1AA" />
                  <Text style={styles.addCoverText}>+ Add Event Cover (16:9)</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Core Fields */}
            <View style={styles.flatInputBlock}>
              <Text style={styles.inputFieldLabel}>Event Title</Text>
              <TextInput
                style={styles.singleLineInput}
                value={eventTitle}
                onChangeText={setEventTitle}
                placeholder="e.g. Diwali Lantern Workshop"
                placeholderTextColor="#71717A"
              />
            </View>

            {/* Side-by-Side Date & Time Rows */}
            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeCol}>
                <Text style={styles.inputFieldLabel}>Date</Text>
                <View style={styles.dateTimeBox}>
                  <Calendar size={14} strokeWidth={1.5} color="#A1A1AA" />
                  <TextInput
                    style={styles.dateTimeInput}
                    value={eventDate}
                    onChangeText={setEventDate}
                    placeholder="Date"
                    placeholderTextColor="#71717A"
                  />
                </View>
              </View>

              <View style={styles.dateTimeCol}>
                <Text style={styles.inputFieldLabel}>Time</Text>
                <View style={styles.dateTimeBox}>
                  <Clock size={14} strokeWidth={1.5} color="#A1A1AA" />
                  <TextInput
                    style={styles.dateTimeInput}
                    value={eventTime}
                    onChangeText={setEventTime}
                    placeholder="Time"
                    placeholderTextColor="#71717A"
                  />
                </View>
              </View>
            </View>

            {/* Venue & Society Location Chips */}
            <View style={styles.flatInputBlock}>
              <Text style={styles.inputFieldLabel}>Venue</Text>
              <TextInput
                style={styles.singleLineInput}
                value={eventVenue}
                onChangeText={setEventVenue}
                placeholder="e.g. Clubhouse Hall"
                placeholderTextColor="#71717A"
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.venueChipsScroll}
              >
                {VENUE_CHIPS.map((chip) => (
                  <TouchableOpacity
                    key={chip}
                    style={[
                      styles.venueChip,
                      eventVenue === chip && styles.venueChipActive,
                    ]}
                    onPress={() => setEventVenue(chip)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.venueChipText,
                        eventVenue === chip && styles.venueChipTextActive,
                      ]}
                    >
                      {chip}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Event Details */}
            <View style={styles.flatInputBlock}>
              <Text style={styles.inputFieldLabel}>Event Details</Text>
              <TextInput
                style={styles.multilineInput}
                multiline
                value={eventDetails}
                onChangeText={setEventDetails}
                placeholder="Describe schedule, registration, or what to bring..."
                placeholderTextColor="#71717A"
                textAlignVertical="top"
              />
            </View>

            {/* Settings Rows */}
            <View style={styles.settingsGroup}>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => setShowAudienceSheet(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.settingLabel}>Audience</Text>
                <View style={styles.settingRight}>
                  <Text style={styles.settingValue}>{audienceLabel}</Text>
                  <ChevronRight size={15} strokeWidth={1.5} color="#71717A" />
                </View>
              </TouchableOpacity>

              <View style={styles.hairline} />

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Enable RSVP</Text>
                <Switch
                  value={rsvpEnabled}
                  onValueChange={setRsvpEnabled}
                  thumbColor={rsvpEnabled ? '#F5F5F5' : '#71717A'}
                  trackColor={{ false: '#27272A', true: '#3F3F46' }}
                />
              </View>

              <View style={styles.hairline} />

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Allow Comments</Text>
                <Switch
                  value={allowComments}
                  onValueChange={setAllowComments}
                  thumbColor={allowComments ? '#F5F5F5' : '#71717A'}
                  trackColor={{ false: '#27272A', true: '#3F3F46' }}
                />
              </View>
            </View>
          </View>
        )}

        {/* ─── NOTICE MODE COMPOSER ─── */}
        {mode === 'NOTICE' && (
          <View style={styles.composerBody}>
            {/* Notice Headline */}
            <View style={styles.flatInputBlock}>
              <Text style={styles.inputFieldLabel}>Notice Headline</Text>
              <TextInput
                style={styles.singleLineInput}
                value={noticeHeadline}
                onChangeText={setNoticeHeadline}
                placeholder="e.g. Scheduled Solar Panel Maintenance"
                placeholderTextColor="#71717A"
              />
            </View>

            {/* Priority Segmented Pill */}
            <View style={styles.priorityCard}>
              <Text style={styles.inputFieldLabel}>Priority Level</Text>
              <View style={styles.prioritySelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.priorityPill,
                    noticePriority === 'normal' && styles.priorityPillNormalActive,
                  ]}
                  onPress={() => setNoticePriority('normal')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.priorityPillText,
                      noticePriority === 'normal' && styles.priorityPillTextActive,
                    ]}
                  >
                    Standard Notice
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.priorityPill,
                    noticePriority === 'urgent' && styles.priorityPillUrgentActive,
                  ]}
                  onPress={() => setNoticePriority('urgent')}
                  activeOpacity={0.8}
                >
                  <AlertCircle
                    size={13}
                    strokeWidth={1.5}
                    color={noticePriority === 'urgent' ? '#EF4444' : '#A1A1AA'}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.priorityPillText,
                      noticePriority === 'urgent' && styles.priorityPillTextUrgent,
                    ]}
                  >
                    Urgent Notice
                  </Text>
                </TouchableOpacity>
              </View>

              {noticePriority === 'urgent' && (
                <Text style={styles.urgentHelperNote}>
                  Sends instant push notification to selected residents
                </Text>
              )}
            </View>

            {/* Circular Message */}
            <View style={styles.flatInputBlock}>
              <Text style={styles.inputFieldLabel}>Circular Message</Text>
              <TextInput
                style={styles.multilineInput}
                multiline
                value={noticeMessage}
                onChangeText={setNoticeMessage}
                placeholder="Enter complete circular text or key notices..."
                placeholderTextColor="#71717A"
                textAlignVertical="top"
              />
            </View>

            {/* Document Chip if attached */}
            {documentItem && (
              <View style={styles.docChip}>
                <View style={styles.docChipLeft}>
                  <FileText size={16} strokeWidth={1.5} color="#F5F5F5" />
                  <Text style={styles.docChipName} numberOfLines={1}>
                    {documentItem.name}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => onChangeDocumentItem(null)}
                  style={styles.docChipRemove}
                >
                  <X size={14} strokeWidth={1.5} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            )}

            {/* Settings Rows */}
            <View style={styles.settingsGroup}>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => setShowAudienceSheet(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.settingLabel}>Audience</Text>
                <View style={styles.settingRight}>
                  <Text style={styles.settingValue}>{audienceLabel}</Text>
                  <ChevronRight size={15} strokeWidth={1.5} color="#71717A" />
                </View>
              </TouchableOpacity>

              <View style={styles.hairline} />

              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => setShowPinSheet(true)}
                activeOpacity={0.7}
              >
                <View style={styles.pinLabelWrap}>
                  <Pin size={14} strokeWidth={1.5} color="#A1A1AA" style={{ marginRight: 6 }} />
                  <Text style={styles.settingLabel}>Pin to Top</Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={styles.settingValue}>{pinDuration}</Text>
                  <ChevronRight size={15} strokeWidth={1.5} color="#71717A" />
                </View>
              </TouchableOpacity>

              <View style={styles.hairline} />

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Allow Comments</Text>
                <Switch
                  value={allowComments}
                  onValueChange={setAllowComments}
                  thumbColor={allowComments ? '#F5F5F5' : '#71717A'}
                  trackColor={{ false: '#27272A', true: '#3F3F46' }}
                />
              </View>

              <View style={styles.hairline} />

              <TouchableOpacity
                style={styles.settingRow}
                onPress={handlePickDocument}
                activeOpacity={0.7}
              >
                <Text style={styles.settingLabel}>Attach Circular PDF</Text>
                <View style={styles.settingRight}>
                  <Text style={styles.settingPlaceholder}>Choose file</Text>
                  <ChevronRight size={15} strokeWidth={1.5} color="#71717A" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Audience Sheet */}
      <AudienceSheet
        visible={showAudienceSheet}
        currentValue={audience}
        onSelect={setAudience}
        onClose={() => setShowAudienceSheet(false)}
      />

      {/* Pin to Top Sheet */}
      <PinSheet
        visible={showPinSheet}
        currentValue={pinDuration}
        onSelect={setPinDuration}
        onClose={() => setShowPinSheet(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  topBarTitle: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryCta: {
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryCtaDisabled: {
    backgroundColor: '#1C1C1E',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  primaryCtaText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '600',
  },
  primaryCtaTextDisabled: {
    color: '#6E6E73',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 88, // Space above bottom floating mode switcher
  },
  composerBody: {
    gap: 16,
  },
  mediaStrip: {
    gap: 10,
    paddingVertical: 4,
  },
  mediaThumbnailWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMediaTile: {
    width: 88,
    height: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0D0D0D',
  },
  addMediaText: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '500',
  },
  captionContainer: {
    backgroundColor: '#121212',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    minHeight: 110,
  },
  captionInput: {
    color: '#F5F5F5',
    fontSize: 14,
    lineHeight: 20,
    padding: 0,
    flex: 1,
  },
  charCount: {
    alignSelf: 'flex-end',
    color: '#71717A',
    fontSize: 11,
    marginTop: 6,
  },
  docChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  docChipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  docChipName: {
    color: '#F5F5F5',
    fontSize: 13,
    fontWeight: '500',
  },
  docChipRemove: {
    padding: 4,
  },
  settingsGroup: {
    backgroundColor: '#121212',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  settingRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  settingLabel: {
    color: '#F5F5F5',
    fontSize: 13,
    fontWeight: '500',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValue: {
    color: '#A1A1AA',
    fontSize: 13,
  },
  settingPlaceholder: {
    color: '#71717A',
    fontSize: 13,
  },
  hairline: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 16,
  },
  pinLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventCoverSlot: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  eventCoverImage: {
    width: '100%',
    height: '100%',
  },
  emptyCoverContent: {
    alignItems: 'center',
    gap: 8,
  },
  addCoverText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '500',
  },
  removeCoverBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flatInputBlock: {
    backgroundColor: '#121212',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  inputFieldLabel: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '500',
  },
  singleLineInput: {
    color: '#F5F5F5',
    fontSize: 14,
    padding: 0,
    height: 26,
  },
  multilineInput: {
    color: '#F5F5F5',
    fontSize: 14,
    lineHeight: 20,
    padding: 0,
    minHeight: 80,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateTimeCol: {
    flex: 1,
    backgroundColor: '#121212',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  dateTimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 26,
  },
  dateTimeInput: {
    flex: 1,
    color: '#F5F5F5',
    fontSize: 14,
    padding: 0,
  },
  venueChipsScroll: {
    gap: 8,
    paddingTop: 6,
    paddingBottom: 2,
  },
  venueChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  venueChipActive: {
    backgroundColor: '#F5F5F5',
    borderColor: '#F5F5F5',
  },
  venueChipText: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '500',
  },
  venueChipTextActive: {
    color: '#000000',
    fontWeight: '600',
  },
  priorityCard: {
    backgroundColor: '#121212',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    gap: 8,
  },
  prioritySelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  priorityPillNormalActive: {
    backgroundColor: '#27272A',
    borderColor: '#3F3F46',
  },
  priorityPillUrgentActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  priorityPillText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '500',
  },
  priorityPillTextActive: {
    color: '#F5F5F5',
    fontWeight: '600',
  },
  priorityPillTextUrgent: {
    color: '#EF4444',
    fontWeight: '600',
  },
  urgentHelperNote: {
    color: '#EF4444',
    fontSize: 11,
    lineHeight: 15,
  },
});
