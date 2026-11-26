import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { KeyboardStickyView, KeyboardAvoidingView } from '@/shims/keyboard-controller';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  X,
  Paperclip,
  Camera,
  Send,
  Smile,
  Megaphone,
  Search,
  CheckCheck,
} from 'lucide-react-native';
import { ChatBubble } from '@/components/ChatBubble';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { ChatMessage, DirectMessageThread } from '@/types';
import { chatService } from '@/services/chat';
import { useAuth } from '@/context/AuthContext';
import * as Haptics from 'expo-haptics';

const QUICK_REPLIES = ['Noted 👍', 'Order Food 🍲', 'Thanks 🙏', 'Happy Diwali! 🪔'];

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Active top tab: 'community' | 'dm'
  const [activeTab, setActiveTab] = useState<'community' | 'dm'>('community');

  // Community Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<string | null>(null);

  // Direct Messages state
  const [dmThreads, setDmThreads] = useState<DirectMessageThread[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const flashListRef = useRef<any>(null);
  const textInputRef = useRef<TextInput | null>(null);

  const loadData = useCallback(async () => {
    try {
      const msgs = await chatService.getCommunityMessages();
      setMessages(msgs);
      const threads = await chatService.getDmThreads();
      setDmThreads(threads);
    } catch {
      // fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to live Supabase Realtime community messages
    const unsubscribe = chatService.subscribeToMessages((event) => {
      if (event.eventType === 'INSERT') {
        setMessages((prev) => {
          if (prev.some((m) => m.id === event.new.id)) return prev;
          return [...prev, event.new];
        });
        setTimeout(() => {
          flashListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else if (event.eventType === 'UPDATE') {
        setMessages((prev) =>
          prev.map((m) => (m.id === event.new.id ? { ...m, ...event.new } : m))
        );
      }
    }, { roomType: 'community' });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  const handleSendMessage = async () => {
    if (!inputText.trim() && !attachedMedia) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    const textToSend = inputText.trim();
    const mediaToSend = attachedMedia || undefined;

    setInputText('');
    setAttachedMedia(null);

    // Keep keyboard focused smoothly without flickering
    textInputRef.current?.focus();

    const sent = await chatService.sendCommunityMessage(textToSend, mediaToSend);
    setMessages((prev) => [...prev, sent]);

    setTimeout(() => {
      flashListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleQuickReply = (reply: string) => {
    setInputText((prev) => (prev ? `${prev} ${reply}` : reply));
    textInputRef.current?.focus();
  };

  const handleAttachMedia = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!res.canceled && res.assets[0]) {
        setAttachedMedia(res.assets[0].uri);
      }
    } catch {
      // fallback
    }
  };

  const handleCameraSnap = async () => {
    try {
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!res.canceled && res.assets[0]) {
        setAttachedMedia(res.assets[0].uri);
      }
    } catch {
      // fallback
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    const updated = await chatService.toggleReaction(messageId, emoji);
    if (updated) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? updated : m))
      );
    }
  };

  const filteredDmThreads = dmThreads.filter((t) =>
    t.recipient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.recipient.wing.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.recipient.flat_number.includes(searchQuery)
  );

  if (isLoading) {
    return <SkeletonLoader variant="chat" />;
  }

  return (
    <View style={[styles.canvas, { paddingTop: insets.top }]}>
      {/* ===================== STICKY TOP BAR ===================== */}
      <View style={styles.topBar}>
        {/* Equal-sized liquid glass Back button */}
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#e9edef" />
        </TouchableOpacity>

        {/* Center Tabs: Community vs Direct Messages */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'community' && styles.tabBtnActive]}
            onPress={() => setActiveTab('community')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'community' && styles.tabBtnTextActive,
              ]}
            >
              COMMUNITY
            </Text>
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>148</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'dm' && styles.tabBtnActive]}
            onPress={() => setActiveTab('dm')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'dm' && styles.tabBtnTextActive,
              ]}
            >
              DIRECT
            </Text>
            <View style={[styles.badgePill, styles.dmBadgePill]}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Equal-sized liquid glass Close button */}
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.replace('/(tabs)/feed')}
          activeOpacity={0.7}
        >
          <X size={20} color="#e9edef" />
        </TouchableOpacity>
      </View>

      {/* ===================== COMMUNITY CHAT TAB ===================== */}
      {activeTab === 'community' ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.chatContainer}
        >
          {/* Pinned Society Announcement Banner */}
          <View style={styles.pinnedBanner}>
            <Megaphone size={16} color="#fbbf24" />
            <View style={styles.pinnedTextCol}>
              <Text style={styles.pinnedTitle}>PINNED NOTICE • AGM MEETING</Text>
              <Text style={styles.pinnedBody} numberOfLines={1}>
                Sunday 10:30 AM in Clubhouse: Solar Rooftop & CCTV Upgrades
              </Text>
            </View>
          </View>

          {/* Date Pill: TODAY */}
          <View style={styles.datePillContainer}>
            <View style={styles.datePill}>
              <Text style={styles.datePillText}>TODAY</Text>
            </View>
          </View>

          {/* Message Stream */}
          <View style={styles.streamContainer}>
            <FlashList
              ref={flashListRef}
              data={messages}
              renderItem={({ item }) => (
                <ChatBubble
                  message={item}
                  isOutgoing={item.sender_id === user?.id || item.sender_id === 'usr-current-1'}
                  onReactionPress={handleToggleReaction}
                />
              )}
              keyExtractor={(item) => item.id}
              estimatedItemSize={72}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.streamListContent}
            />
          </View>

          {/* Bottom Interactive Area */}
          <KeyboardStickyView style={styles.stickyBottom}>
            {/* Horizontal Quick-Reply Chips */}
            <View style={styles.quickChipsRow}>
              {QUICK_REPLIES.map((reply) => (
                <TouchableOpacity
                  key={reply}
                  style={styles.quickChip}
                  onPress={() => handleQuickReply(reply)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickChipText}>{reply}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Media preview tag if attached */}
            {attachedMedia && (
              <View style={styles.attachedPreviewRow}>
                <Image source={{ uri: attachedMedia }} style={styles.attachedThumb} />
                <Text style={styles.attachedName}>Photo attached</Text>
                <TouchableOpacity onPress={() => setAttachedMedia(null)}>
                  <X size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}

            {/* WhatsApp-Style Input Bar */}
            <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
              <TouchableOpacity style={styles.inputActionBtn} activeOpacity={0.7}>
                <Smile size={22} color="#8696a0" />
              </TouchableOpacity>

              <TextInput
                ref={textInputRef}
                style={styles.textInput}
                placeholder="Message Ashtavinayak Empire..."
                placeholderTextColor="#8696a0"
                value={inputText}
                onChangeText={setInputText}
                multiline
              />

              <TouchableOpacity
                style={styles.inputActionBtn}
                onPress={handleAttachMedia}
                activeOpacity={0.7}
              >
                <Paperclip size={20} color="#8696a0" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.inputActionBtn}
                onPress={handleCameraSnap}
                activeOpacity={0.7}
              >
                <Camera size={20} color="#8696a0" />
              </TouchableOpacity>

              {/* Green WhatsApp Send Button */}
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendMessage}
                activeOpacity={0.8}
              >
                <Send size={17} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </KeyboardStickyView>
        </KeyboardAvoidingView>
      ) : (
        /* ===================== DIRECT MESSAGES TAB ===================== */
        <View style={styles.dmContainer}>
          {/* Search bar */}
          <View style={styles.searchBar}>
            <Search size={16} color="#8696a0" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search resident, flat number, or wing..."
              placeholderTextColor="#8696a0"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* DM Thread List */}
          <FlashList
            data={filteredDmThreads}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.dmThreadItem}
                onPress={() => router.push(`/chat/${item.recipient.id}`)}
                activeOpacity={0.75}
              >
                <View style={styles.dmAvatarWrapper}>
                  <Image
                    source={{
                      uri:
                        item.recipient.avatar_url ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
                    }}
                    style={styles.dmAvatar}
                  />
                  {item.isOnline && <View style={styles.onlineIndicator} />}
                </View>

                <View style={styles.dmTextCol}>
                  <View style={styles.dmHeaderRow}>
                    <Text style={styles.dmName}>{item.recipient.full_name}</Text>
                    <Text style={styles.dmTime}>{item.lastMessageTime}</Text>
                  </View>

                  <View style={styles.dmFlatBadgeRow}>
                    <Text style={styles.dmFlatBadge}>
                      {item.recipient.wing} • Flat {item.recipient.flat_number}
                    </Text>
                  </View>

                  <View style={styles.dmBottomRow}>
                    <Text style={styles.dmLastMessage} numberOfLines={1}>
                      {item.lastMessage}
                    </Text>
                    {item.unreadCount > 0 ? (
                      <View style={styles.dmUnreadBadge}>
                        <Text style={styles.dmUnreadText}>{item.unreadCount}</Text>
                      </View>
                    ) : (
                      <CheckCheck size={14} color="#53bdeb" />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
            estimatedItemSize={76}
            contentContainerStyle={styles.dmListContent}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: '#0b141a', // WhatsApp dark chat canvas
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111b21', // WhatsApp header
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222e35',
  },
  navButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#0c1317',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: '#222e35',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tabBtnActive: {
    backgroundColor: '#00a884',
  },
  tabBtnText: {
    color: '#8696a0',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  badgePill: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 5,
  },
  dmBadgePill: {
    backgroundColor: '#00a884',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  chatContainer: {
    flex: 1,
  },
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#182229',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222e35',
  },
  pinnedTextCol: {
    marginLeft: 10,
    flex: 1,
  },
  pinnedTitle: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pinnedBody: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  datePillContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  datePill: {
    backgroundColor: '#182229',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#222e35',
  },
  datePillText: {
    color: '#8696a0',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  streamContainer: {
    flex: 1,
  },
  streamListContent: {
    paddingBottom: 16,
  },
  stickyBottom: {
    backgroundColor: '#111b21',
    borderTopWidth: 1,
    borderTopColor: '#222e35',
  },
  quickChipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  quickChip: {
    backgroundColor: '#1f2c34',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#222e35',
  },
  quickChipText: {
    color: '#e9edef',
    fontSize: 11,
    fontWeight: '600',
  },
  attachedPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2c34',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  attachedThumb: {
    width: 28,
    height: 28,
    borderRadius: 4,
    marginRight: 8,
  },
  attachedName: {
    color: '#00a884',
    fontSize: 12,
    flex: 1,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111b21',
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  inputActionBtn: {
    padding: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#2a3942',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#e9edef',
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#00a884',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  dmContainer: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111b21',
    borderRadius: 12,
    margin: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#222e35',
  },
  searchInput: {
    flex: 1,
    color: '#e9edef',
    fontSize: 13,
    marginLeft: 8,
  },
  dmListContent: {
    paddingBottom: 24,
  },
  dmThreadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#182229',
  },
  dmAvatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  dmAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00a884',
    borderWidth: 2,
    borderColor: '#0b141a',
  },
  dmTextCol: {
    flex: 1,
  },
  dmHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dmName: {
    color: '#e9edef',
    fontSize: 15,
    fontWeight: '700',
  },
  dmTime: {
    color: '#8696a0',
    fontSize: 11,
  },
  dmFlatBadgeRow: {
    marginVertical: 2,
  },
  dmFlatBadge: {
    color: '#00a884',
    fontSize: 11,
    fontWeight: '600',
  },
  dmBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  dmLastMessage: {
    color: '#8696a0',
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  dmUnreadBadge: {
    backgroundColor: '#00a884',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  dmUnreadText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
});
