import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { ThumbsUp, ShieldCheck, Lock } from 'lucide-react-native';
import { Complaint } from '@/types';
import { complaintsService } from '@/services/complaints';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';

interface ComplaintCardProps {
  complaint: Complaint;
  onUpvoteChange?: (complaintId: string, count: number, isUpvoted: boolean) => void;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = ({ complaint, onUpvoteChange }) => {
  const { isDark } = useTheme();
  const [isUpvoted, setIsUpvoted] = useState(complaint.is_upvoted ?? false);
  const [upvotesCount, setUpvotesCount] = useState(complaint.upvotes_count);

  const handleUpvote = async () => {
    if (complaint.visibility === 'admin') return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    const newUpvoted = !isUpvoted;
    const newCount = newUpvoted ? upvotesCount + 1 : Math.max(0, upvotesCount - 1);
    setIsUpvoted(newUpvoted);
    setUpvotesCount(newCount);

    if (onUpvoteChange) {
      onUpvoteChange(complaint.id, newCount, newUpvoted);
    } else {
      await complaintsService.toggleUpvote(complaint.id);
    }
  };

  // Status dot color mapping
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Resolved':
        return { dotColor: '#22C55E', label: 'Resolved' };
      case 'In Progress':
        return { dotColor: '#EAB308', label: 'In Progress' };
      case 'Assigned':
        return { dotColor: isDark ? '#A1A1AA' : '#64748B', label: 'Assigned' };
      case 'Open':
      default:
        return { dotColor: isDark ? '#71717A' : '#94A3B8', label: 'Open' };
    }
  };

  const statusConfig = getStatusConfig(complaint.status);

  // Format category to quiet sentence case
  const formatCategory = (cat: string) => {
    return cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
  };

  // Monospace unit number
  const unitNumber = complaint.user
    ? `${complaint.user.wing?.replace('Wing ', '') || 'B'}-${complaint.user.flat_number || '402'}`
    : 'B-402';

  // Ticket ID reference
  const ticketRef = `#TK-${complaint.id.replace('comp-', '892')}`;

  const cardBg = isDark ? '#111113' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <View style={[styles.cardContainer, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      {/* 1. Clean Metadata Row (Category + Optional Priority left, 6px Status dot right) */}
      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          {complaint.visibility === 'admin' && (
            <View style={styles.adminDirectTag}>
              <Lock size={11} strokeWidth={1.5} color="#EF4444" style={{ marginRight: 4 }} />
              <Text style={styles.adminDirectText}>Direct to admin</Text>
              <Text style={styles.metaDot}>·</Text>
            </View>
          )}

          <Text style={styles.categoryText}>{formatCategory(complaint.category)}</Text>

          {/* Show priority tag only when Urgent or High */}
          {complaint.urgency === 'Urgent' ? (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.priorityUrgentText}>Urgent</Text>
            </>
          ) : complaint.urgency === 'High' ? (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.priorityHighText}>High</Text>
            </>
          ) : null}
        </View>

        {/* Status Dot + Text (No glowing/tinted pill) */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusConfig.dotColor }]} />
          <Text style={styles.statusLabelText}>{statusConfig.label}</Text>
        </View>
      </View>

      {/* 2. Ticket Title */}
      <Text style={[styles.titleText, { color: isDark ? '#F5F5F5' : '#111113' }]}>
        {complaint.title}
      </Text>

      {/* 3. Description */}
      <Text style={[styles.descText, { color: isDark ? '#A1A1AA' : '#4B5563' }]}>
        {complaint.description}
      </Text>

      {/* 4. Media attachment (Completely hidden if no image) */}
      {complaint.media_url ? (
        <View style={[styles.mediaWrapper, { borderColor: cardBorder }]}>
          <Image
            source={{ uri: complaint.media_url }}
            style={styles.media}
            contentFit="cover"
            transition={150}
          />
        </View>
      ) : null}

      {/* 5. Official Admin Response Block (Quiet stepped neutral surface with 2px accent bar) */}
      {complaint.admin_note ? (
        <View
          style={[
            styles.adminNoteBox,
            {
              backgroundColor: isDark ? '#18181B' : '#F4F4F5',
              borderLeftColor: isDark ? 'rgba(255, 255, 255, 0.4)' : '#71717A',
            },
          ]}
        >
          <View style={styles.adminNoteHeader}>
            <ShieldCheck size={13} strokeWidth={1.5} color={isDark ? '#E4E4E7' : '#18181B'} />
            <Text style={[styles.adminNoteTitle, { color: isDark ? '#E4E4E7' : '#18181B' }]}>
              Admin response
            </Text>
          </View>
          <Text style={[styles.adminNoteText, { color: isDark ? '#A1A1AA' : '#4B5563' }]}>
            {complaint.admin_note}
          </Text>
        </View>
      ) : null}

      {/* 6. Footer Row: Resident Info + Monospace Unit / Ticket ID + Neutral Upvote */}
      <View style={[styles.footerRow, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }]}>
        <View style={styles.authorInfo}>
          <Text style={[styles.authorName, { color: isDark ? '#71717A' : '#6B7280' }]}>
            {complaint.user?.full_name || 'Resident'}
          </Text>
          <Text style={styles.footerDot}>·</Text>
          <Text style={[styles.monoBadge, { color: isDark ? '#E4E4E7' : '#18181B' }]}>
            {unitNumber}
          </Text>
          <Text style={styles.footerDot}>·</Text>
          <Text style={[styles.ticketIdText, { color: isDark ? '#71717A' : '#6B7280' }]}>
            {ticketRef}
          </Text>
        </View>

        {complaint.visibility === 'public' && (
          <TouchableOpacity
            style={[
              styles.upvoteButton,
              {
                backgroundColor: isUpvoted
                  ? isDark ? '#F5F5F5' : '#111113'
                  : isDark ? '#18181B' : '#F4F4F5',
                borderColor: isUpvoted
                  ? isDark ? '#F5F5F5' : '#111113'
                  : cardBorder,
              },
            ]}
            onPress={handleUpvote}
            activeOpacity={0.7}
          >
            <ThumbsUp
              size={13}
              strokeWidth={1.5}
              color={
                isUpvoted
                  ? isDark ? '#000000' : '#FFFFFF'
                  : isDark ? '#A1A1AA' : '#6B7280'
              }
              fill={isUpvoted ? (isDark ? '#000000' : '#FFFFFF') : 'transparent'}
            />
            <Text
              style={[
                styles.upvoteCount,
                {
                  color: isUpvoted
                    ? isDark ? '#000000' : '#FFFFFF'
                    : isDark ? '#D4D4D8' : '#374151',
                },
              ]}
            >
              {upvotesCount}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  adminDirectTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminDirectText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '500',
  },
  categoryText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  metaDot: {
    color: '#52525B',
    fontSize: 12,
    marginHorizontal: 6,
  },
  priorityUrgentText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
  },
  priorityHighText: {
    color: '#F97316',
    fontSize: 11,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabelText: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  descText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  mediaWrapper: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 12,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  adminNoteBox: {
    borderLeftWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  adminNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  adminNoteTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  adminNoteText: {
    fontSize: 12,
    lineHeight: 17,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  authorName: {
    fontSize: 11,
    fontWeight: '400',
  },
  footerDot: {
    color: '#52525B',
    fontSize: 11,
    marginHorizontal: 5,
  },
  monoBadge: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },
  ticketIdText: {
    fontSize: 11,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },
  upvoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  upvoteCount: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
