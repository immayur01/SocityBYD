import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { CheckCheck } from 'lucide-react-native';
import { ChatMessage } from '@/types';
import * as Haptics from 'expo-haptics';

interface ChatBubbleProps {
  message: ChatMessage;
  isOutgoing: boolean;
  onReactionPress?: (messageId: string, emoji: string) => void;
  onBubbleLongPress?: (messageId: string) => void;
}

const AVAILABLE_REACTIONS = ['👍', '❤️', '🙏', '🎉'];

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isOutgoing,
  onReactionPress,
  onBubbleLongPress,
}) => {
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  const handleEmojiPress = (emoji: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    if (onReactionPress) {
      onReactionPress(message.id, emoji);
    }
  };

  // Extract active reactions from JSONB structure
  const activeReactions = Object.entries(message.reactions || {}).filter(
    ([_, users]) => users && users.length > 0
  );

  return (
    <View
      style={[
        styles.bubbleRow,
        isOutgoing ? styles.outgoingRow : styles.incomingRow,
      ]}
    >
      <TouchableOpacity
        style={[
          styles.bubbleWrapper,
          isOutgoing ? styles.outgoingBubble : styles.incomingBubble,
        ]}
        onLongPress={() => onBubbleLongPress && onBubbleLongPress(message.id)}
        activeOpacity={0.9}
      >
        {/* Sender Name & Flat (only on incoming community messages) */}
        {!isOutgoing && message.sender && (
          <View style={styles.senderHeader}>
            <Text style={styles.senderName}>{message.sender.full_name}</Text>
            <View style={styles.senderFlatPill}>
              <Text style={styles.senderFlatText}>
                {message.sender.wing?.replace('Wing ', '')}-{message.sender.flat_number}
              </Text>
            </View>
          </View>
        )}

        {/* Media Preview if attached */}
        {message.media_url ? (
          <View style={styles.mediaContainer}>
            <Image
              source={{ uri: message.media_url }}
              style={styles.mediaImage}
              contentFit="cover"
            />
          </View>
        ) : null}

        {/* Message Text */}
        <Text style={styles.messageText}>{message.text}</Text>

        {/* Message Meta: Time & Delivery Status */}
        <View style={styles.metaRow}>
          <Text style={styles.timeText}>{formatTime(message.created_at)}</Text>
          {isOutgoing && (
            <View style={styles.checkIconWrapper}>
              <CheckCheck size={14} color="#53bdeb" />
            </View>
          )}
        </View>

        {/* Active Reaction Badges attached to bubble */}
        {activeReactions.length > 0 && (
          <View style={styles.reactionsPillContainer}>
            {activeReactions.map(([emoji, users]) => (
              <TouchableOpacity
                key={emoji}
                style={styles.reactionPill}
                onPress={() => handleEmojiPress(emoji)}
                activeOpacity={0.7}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                {users.length > 1 && (
                  <Text style={styles.reactionCount}>{users.length}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </TouchableOpacity>

      {/* Quick reaction trigger buttons on subtle hover/action */}
      <View style={[styles.quickReactBar, isOutgoing && styles.quickReactBarRight]}>
        {AVAILABLE_REACTIONS.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            style={styles.quickEmojiBtn}
            onPress={() => handleEmojiPress(emoji)}
            activeOpacity={0.6}
          >
            <Text style={styles.quickEmojiText}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bubbleRow: {
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  incomingRow: {
    alignItems: 'flex-start',
  },
  outgoingRow: {
    alignItems: 'flex-end',
  },
  bubbleWrapper: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderWidth: 1,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  incomingBubble: {
    backgroundColor: '#1f2c34', // WhatsApp dark incoming bubble
    borderColor: '#222e35',
    borderTopLeftRadius: 4,
  },
  outgoingBubble: {
    backgroundColor: '#005c4b', // WhatsApp dark outgoing green bubble
    borderColor: 'rgba(0, 168, 132, 0.3)',
    borderTopRightRadius: 4,
  },
  senderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    color: '#00a884',
    fontSize: 12,
    fontWeight: '700',
  },
  senderFlatPill: {
    backgroundColor: 'rgba(0, 168, 132, 0.2)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 6,
  },
  senderFlatText: {
    color: '#2dd4bf',
    fontSize: 9,
    fontWeight: '700',
  },
  mediaContainer: {
    width: 220,
    height: 140,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6,
    backgroundColor: '#0b141a',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  messageText: {
    color: '#e9edef',
    fontSize: 14,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
  },
  timeText: {
    color: '#8696a0',
    fontSize: 10,
    marginRight: 4,
  },
  checkIconWrapper: {
    marginLeft: 2,
  },
  reactionsPillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: -2,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111b21',
    borderWidth: 1,
    borderColor: '#222e35',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginTop: 2,
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionCount: {
    color: '#8696a0',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 3,
  },
  quickReactBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    opacity: 0.6,
  },
  quickReactBarRight: {
    justifyContent: 'flex-end',
  },
  quickEmojiBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  quickEmojiText: {
    fontSize: 12,
  },
});
