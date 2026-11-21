import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { ThumbsUp, AlertCircle, CheckCircle2, Clock, ShieldAlert, Lock, Globe2 } from 'lucide-react-native';
import { Complaint } from '@/types';
import { GlassCard } from './GlassCard';
import { complaintsService } from '@/services/complaints';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';

interface ComplaintCardProps {
  complaint: Complaint;
  onUpvoteChange?: (complaintId: string, count: number, isUpvoted: boolean) => void;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = ({ complaint, onUpvoteChange }) => {
  const { tokens, isDark } = useTheme();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Resolved':
        return { bg: 'rgba(16, 185, 129, 0.18)', text: '#10b981', icon: <CheckCircle2 size={12} color="#10b981" /> };
      case 'In Progress':
        return { bg: 'rgba(245, 158, 11, 0.18)', text: '#f59e0b', icon: <Clock size={12} color="#f59e0b" /> };
      case 'Assigned':
        return { bg: 'rgba(168, 85, 247, 0.18)', text: '#7c4dff', icon: <ShieldAlert size={12} color="#7c4dff" /> };
      case 'Open':
      default:
        return { bg: 'rgba(56, 189, 248, 0.18)', text: '#0284c7', icon: <AlertCircle size={12} color="#0284c7" /> };
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'Urgent':
        return { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' };
      case 'High':
        return { bg: 'rgba(249, 115, 22, 0.2)', text: '#f97316' };
      case 'Normal':
      default:
        return { bg: isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(100, 116, 139, 0.12)', text: tokens.textSecondary };
    }
  };

  const statusInfo = getStatusColor(complaint.status);
  const urgencyInfo = getUrgencyBadge(complaint.urgency);

  return (
    <GlassCard style={styles.cardContainer}>
      {/* Top Row: Visibility Badge + Urgency + Status */}
      <View style={styles.topRow}>
        <View style={styles.leftBadges}>
          {/* Public vs Admin Badge */}
          <View
            style={[
              styles.visibilityBadge,
              {
                backgroundColor: tokens.bgSurface,
                borderColor: tokens.borderSubtle,
              },
            ]}
          >
            {complaint.visibility === 'admin' ? (
              <>
                <Lock size={10} color="#f87171" />
                <Text style={styles.visibilityAdminText}>Admin Only</Text>
              </>
            ) : (
              <>
                <Globe2 size={10} color={tokens.textInfo} />
                <Text style={[styles.visibilityPublicText, { color: tokens.textInfo }]}>
                  Public
                </Text>
              </>
            )}
          </View>

          {/* Urgency Badge */}
          <View style={[styles.urgencyBadge, { backgroundColor: urgencyInfo.bg }]}>
            <Text style={[styles.urgencyText, { color: urgencyInfo.text }]}>
              {complaint.urgency}
            </Text>
          </View>
        </View>

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          {statusInfo.icon}
          <Text style={[styles.statusText, { color: statusInfo.text }]}>
            {complaint.status}
          </Text>
        </View>
      </View>

      {/* Category Label */}
      <Text style={[styles.categoryLabel, { color: tokens.accentPurple }]}>
        {complaint.category}
      </Text>

      {/* Complaint Title */}
      <Text style={[styles.titleText, { color: tokens.textPrimary }]}>
        {complaint.title}
      </Text>

      {/* Complaint Description */}
      <Text style={[styles.descText, { color: tokens.textSecondary }]}>
        {complaint.description}
      </Text>

      {/* Media attachment if any */}
      {complaint.media_url ? (
        <View
          style={[
            styles.mediaWrapper,
            {
              backgroundColor: tokens.bgApp,
              borderColor: tokens.borderSubtle,
              borderWidth: 1,
            },
          ]}
        >
          <Image
            source={{ uri: complaint.media_url }}
            style={styles.media}
            contentFit="cover"
            transition={200}
          />
        </View>
      ) : null}

      {/* Admin Resolution Note if in progress / resolved */}
      {complaint.admin_note ? (
        <View
          style={[
            styles.adminNoteBox,
            {
              backgroundColor: tokens.bgSurface,
              borderColor: tokens.borderSubtle,
            },
          ]}
        >
          <View style={styles.adminNoteHeader}>
            <ShieldAlert size={12} color="#7C4DFF" />
            <Text style={[styles.adminNoteTitle, { color: tokens.accentPurple }]}>
              Admin Response
            </Text>
          </View>
          <Text style={[styles.adminNoteText, { color: tokens.textSecondary }]}>
            {complaint.admin_note}
          </Text>
        </View>
      ) : null}

      {/* Footer Row: Resident Info + Upvote Button */}
      <View
        style={[
          styles.footerRow,
          { borderTopColor: tokens.borderDivider },
        ]}
      >
        <View style={styles.authorInfo}>
          <Text style={[styles.authorName, { color: tokens.textMuted }]}>
            {complaint.user?.full_name || 'Resident'} •{' '}
          </Text>
          <Text style={[styles.authorFlat, { color: tokens.accentPurple }]}>
            {complaint.user ? `${complaint.user.wing?.replace('Wing ', '')}-${complaint.user.flat_number}` : 'B-402'}
          </Text>
        </View>

        {complaint.visibility === 'public' && (
          <TouchableOpacity
            style={[styles.upvoteButton, isUpvoted && styles.upvoteActive]}
            onPress={handleUpvote}
            activeOpacity={0.7}
          >
            <ThumbsUp
              size={14}
              color={isUpvoted ? tokens.textInfo : tokens.textMuted}
              fill={isUpvoted ? tokens.textInfo : 'transparent'}
            />
            <Text style={[styles.upvoteCount, isUpvoted && { color: tokens.textInfo }]}>
              {upvotesCount} Upvotes
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 16,
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  leftBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginRight: 6,
    borderWidth: 1,
  },
  visibilityAdminText: {
    color: '#f87171',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  visibilityPublicText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  urgencyBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 6,
  },
  descText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  mediaWrapper: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  adminNoteBox: {
    borderLeftWidth: 3,
    borderLeftColor: '#7C4DFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  adminNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  adminNoteTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 5,
  },
  adminNoteText: {
    fontSize: 12,
    lineHeight: 16,
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
  },
  authorName: {
    fontSize: 11,
  },
  authorFlat: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  upvoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  upvoteActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    borderColor: '#38bdf8',
  },
  upvoteCount: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },
});
