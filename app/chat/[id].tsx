import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { KeyboardStickyView, KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Image } from 'expo-image';
import { ResidentAvatar } from '@/components/ResidentAvatar';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  X,
  Send,
  Paperclip,
  Smile,
  Phone,
  Video,
  Lock,
} from 'lucide-react-native';
import { ChatBubble } from '@/components/ChatBubble';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { ChatMessage, UserProfile } from '@/types';
import { chatService } from '@/services/chat';
import { RESIDENTS_DIRECTORY } from '@/services/mockData';
import { useAuth } from '@/context/AuthContext';
import * as Haptics from 'expo-haptics';

export default function DirectMessageDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  // Find recipient
  const recipient: UserProfile =
    RESIDENTS_DIRECTORY.find((r) => r.id === id) || RESIDENTS_DIRECTORY[1];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const flashListRef = useRef<any>(null);
  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    chatService.getDmMessages(recipient.id).then((data) => {
      setMessages(data);
    }).finally(() => {
      setIsLoading(false);
    });

    chatService.markMessagesAsRead(recipient.id);

    // Subscribe to live Supabase Realtime direct messages
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
    }, { roomType: 'dm', roomId: recipient.id });

    return () => {
      unsubscribe();
    };
  }, [recipient.id]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    const text = inputText.trim();
    setInputText('');
    inputRef.current?.focus();

    const sent = await chatService.sendDmMessage(recipient, text);
    setMessages((prev) => [...prev, sent]);

    setTimeout(() => {
      flashListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handlePickMedia = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!res.canceled && res.assets[0]) {
        const sent = await chatService.sendDmMessage(recipient, 'Photo shared', res.assets[0].uri);
        setMessages((prev) => [...prev, sent]);
      }
    } catch {
      // fallback
    }
  };

  if (isLoading) {
    return <SkeletonLoader variant="chat" />;
  }

  return (
    <View style={[styles.canvas, { paddingTop: insets.top }]}>
      {/* WhatsApp-Style Sticky Recipient Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#e9edef" />
        </TouchableOpacity>

        <View style={styles.recipientInfo}>
          <ResidentAvatar
            name={recipient.full_name}
            avatarUrl={recipient.avatar_url}
            size={38}
          />
          <View style={styles.headerTextCol}>
            <Text style={styles.recipientName}>{recipient.full_name}</Text>
            <Text style={styles.recipientStatus}>
              Online • {recipient.wing} - {recipient.flat_number}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.replace('/(tabs)/feed')}
          >
            <X size={20} color="#e9edef" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Message Stream */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.chatArea}
      >
        <FlashList
          ref={flashListRef}
          data={messages}
          ListHeaderComponent={
            <View style={styles.e2eeBanner}>
              <Lock size={13} color="#00a884" />
              <Text style={styles.e2eeBannerText}>
                Messages are end-to-end encrypted. Only you and {recipient.full_name} can read them.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ChatBubble
              message={item}
              isOutgoing={item.sender_id === user?.id || item.sender_id === 'usr-current-1'}
            />
          )}
          keyExtractor={(item) => item.id}
          estimatedItemSize={60}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
        />

        {/* Sticky Input Bar */}
        <KeyboardStickyView style={styles.inputSticky}>
          <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <TouchableOpacity style={styles.iconBtn}>
              <Smile size={22} color="#8696a0" />
            </TouchableOpacity>

            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder={`Message ${recipient.full_name.split(' ')[0]}...`}
              placeholderTextColor="#8696a0"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />

            <TouchableOpacity style={styles.iconBtn} onPress={handlePickMedia}>
              <Paperclip size={20} color="#8696a0" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Send size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </KeyboardStickyView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: '#0b141a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111b21',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222e35',
  },
  backButton: {
    padding: 6,
    marginRight: 6,
  },
  recipientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },
  headerTextCol: {
    flex: 1,
  },
  recipientName: {
    color: '#e9edef',
    fontSize: 15,
    fontWeight: '700',
  },
  recipientStatus: {
    color: '#00a884',
    fontSize: 11,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 8,
  },
  chatArea: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 12,
  },
  inputSticky: {
    backgroundColor: '#111b21',
    borderTopWidth: 1,
    borderTopColor: '#222e35',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  iconBtn: {
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
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  e2eeBanner: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 168, 132, 0.08)',
    borderColor: 'rgba(0, 168, 132, 0.22)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 12,
    maxWidth: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  e2eeBannerText: {
    fontSize: 11,
    color: '#8696a0',
    flexShrink: 1,
    lineHeight: 15,
    textAlign: 'center',
  },
});
