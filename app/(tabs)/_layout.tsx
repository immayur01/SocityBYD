import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Tabs, useRouter, usePathname, useSegments } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { X, Image as ImageIcon, Video as VideoIcon } from 'lucide-react-native';
import { TopHeader } from '@/components/TopHeader';
import { FloatingDock, TabKey } from '@/components/FloatingDock';
import { ProgressiveBlurEdge } from '@/components/ProgressiveBlurEdge';
import { postsService } from '@/services/posts';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';
import { PostTag } from '@/types';
import * as Haptics from 'expo-haptics';

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const { tokens, isDark, theme } = useTheme();

  // Create Post bottom sheet state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [postText, setPostText] = useState('');
  const [postCategory, setPostCategory] = useState<PostTag>('Photo/Video Post');
  const [attachedMedia, setAttachedMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [publishing, setPublishing] = useState(false);

  const segments = useSegments();

  // Determine active tab from pathname (segments typing is strict in SDK 52)
  const getActiveTab = (): TabKey => {
    if (pathname.includes('food')) return 'food';
    if (pathname.includes('complaints')) return 'complaints';
    if (pathname.includes('chat')) return 'chat';
    return 'feed';
  };

  const activeTab = getActiveTab();
  const isChatScreen = pathname.includes('chat') || (segments as string[]).includes('chat');

  const handleSelectTab = (tab: TabKey) => {
    router.replace(`/(tabs)/${tab}` as any);
  };

  const handlePickMedia = async (type: 'Images' | 'Videos') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          type === 'Videos'
            ? ImagePicker.MediaTypeOptions.Videos
            : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAttachedMedia({
          uri: result.assets[0].uri,
          type: type === 'Videos' ? 'video' : 'image',
        });
      }
    } catch {
      showToast('Media Picker', 'Could not open media gallery.', 'error');
    }
  };

  const handlePublish = async () => {
    if (!postText.trim() && !attachedMedia) {
      showToast('Validation Error', 'Please write something or attach a photo/video.', 'error');
      return;
    }

    try {
      setPublishing(true);
      await postsService.createPost({
        tag: postCategory,
        content: postText.trim(),
        mediaUrl: attachedMedia?.uri,
        mediaType: attachedMedia?.type,
      });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      showToast('Post Published', 'Your society post is live for 48 hours!', 'success');
      setPostText('');
      setAttachedMedia(null);
      setIsCreateOpen(false);
      router.replace('/(tabs)/feed');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to publish post.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const categories: PostTag[] = ['Photo/Video Post', 'Event', 'Announcement'];

  return (
    <View style={[styles.container, { backgroundColor: tokens.bgApp }]}>
      {/* 1. Global Persistent 3-Column Header (Hidden on Chat) */}
      {!isChatScreen && (
        <TopHeader
          onPressCreate={() => setIsCreateOpen(true)}
          onPressProfile={() => router.push('/profile')}
          onOpenCreatePost={() => setIsCreateOpen(true)}
          onAvatarPress={() => router.push('/profile')}
        />
      )}

      {/* 2. Main Tabs Viewport with Progressive Top Scroll Blur */}
      <View style={[styles.content, { position: 'relative' }]}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' }, // Handled by our persistent dock
            animation: 'none',
          }}
        >
          <Tabs.Screen name="feed" />
          <Tabs.Screen name="food" />
          <Tabs.Screen name="complaints" />
          <Tabs.Screen name="chat" />
        </Tabs>

        {!isChatScreen && (
          <ProgressiveBlurEdge
            position="top"
            height={26}
            bgColor={tokens.bgApp}
            isDark={theme === 'dark'}
          />
        )}
      </View>

      {/* 3. Global Persistent Bottom Navigation (Hidden on Chat) */}
      {!isChatScreen && (
        <FloatingDock
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
        />
      )}

      {/* 4. Create Post Bottom Sheet (Triggered by Header '+' on any screen) */}
      <Modal visible={isCreateOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.bottomSheet,
              {
                backgroundColor: tokens.bgCard,
                borderColor: tokens.borderSubtle,
              },
            ]}
          >
            {/* Modal Top Bar */}
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: tokens.textPrimary }]}>
                New Society Post
              </Text>
              <TouchableOpacity
                onPress={() => setIsCreateOpen(false)}
                style={[styles.closeBtn, { backgroundColor: tokens.bgSurface }]}
                activeOpacity={0.7}
              >
                <X size={18} color={tokens.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Category selector chips */}
              <View style={styles.categoryRow}>
                {categories.map((cat) => {
                  const isSelected = postCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catChip,
                        isSelected
                          ? styles.catChipActive
                          : { backgroundColor: tokens.bgSurface },
                      ]}
                      onPress={() => setPostCategory(cat)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          isSelected
                            ? styles.catChipTextActive
                            : { color: tokens.textMuted },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Text Input */}
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: tokens.bgApp,
                    borderColor: tokens.borderSubtle,
                    color: tokens.textPrimary,
                  },
                ]}
                multiline
                numberOfLines={4}
                value={postText}
                onChangeText={setPostText}
                placeholder="Share an update, circular, or event with Ashtavinayak Empire..."
                placeholderTextColor={tokens.textMuted}
                textAlignVertical="top"
              />

              {/* Media preview tag if attached */}
              {attachedMedia && (
                <View
                  style={[
                    styles.mediaAttachedRow,
                    { backgroundColor: tokens.bgSurface },
                  ]}
                >
                  <Text style={[styles.mediaAttachedText, { color: tokens.accentPurple }]}>
                    {attachedMedia.type === 'video' ? '🎬 Short Video Attached' : '🖼️ Photo Attached'}
                  </Text>
                  <TouchableOpacity onPress={() => setAttachedMedia(null)}>
                    <X size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Media attach actions */}
              <View style={styles.mediaActionsRow}>
                <TouchableOpacity
                  style={[
                    styles.mediaActionBtn,
                    {
                      backgroundColor: tokens.bgSurface,
                      borderColor: tokens.borderSubtle,
                    },
                  ]}
                  onPress={() => handlePickMedia('Images')}
                  activeOpacity={0.7}
                >
                  <ImageIcon size={18} color="#7C4DFF" />
                  <Text style={[styles.mediaActionText, { color: tokens.textSecondary }]}>
                    Photo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.mediaActionBtn,
                    {
                      backgroundColor: tokens.bgSurface,
                      borderColor: tokens.borderSubtle,
                    },
                  ]}
                  onPress={() => handlePickMedia('Videos')}
                  activeOpacity={0.7}
                >
                  <VideoIcon size={18} color="#EC4899" />
                  <Text style={[styles.mediaActionText, { color: tokens.textSecondary }]}>
                    Video
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Publish Gradient CTA Button */}
              <TouchableOpacity
                style={styles.publishBtn}
                onPress={handlePublish}
                disabled={publishing}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#7C4DFF', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.publishGradient}
                >
                  <Text style={styles.publishText}>
                    {publishing ? 'Publishing...' : 'Publish to Community Feed'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  topFadeStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 22,
    zIndex: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    padding: 20,
    maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  catChipActive: {
    backgroundColor: '#7C4DFF',
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  catChipTextActive: {
    color: '#ffffff',
  },
  textInput: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    height: 110,
    marginBottom: 14,
  },
  mediaAttachedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  mediaAttachedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mediaActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  mediaActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  mediaActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  publishBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  publishGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
