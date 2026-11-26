import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';
import { useTheme } from '@/context/ThemeContext';

interface FeedPostSkeletonProps {
  variant?: 'media' | 'text';
}

export const FeedPostSkeleton: React.FC<FeedPostSkeletonProps> = ({ variant = 'media' }) => {
  const { tokens, isDark } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tokens.bgCard,
          borderColor: tokens.borderSubtle,
        },
        isDark ? styles.shadowDark : styles.shadowLight,
      ]}
    >
      {/* 1. Header Row */}
      <View style={styles.cardHeader}>
        <View style={styles.authorRow}>
          {/* Avatar squircle */}
          <Skeleton width={40} height={40} borderRadius={14} />

          {/* Resident name & wing info */}
          <View style={styles.nameCol}>
            <Skeleton width={120} height={14} borderRadius={6} />
            <Skeleton width={70} height={10} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
        </View>

        {/* Building + Flat badge pill */}
        <Skeleton width={88} height={22} borderRadius={8} />
      </View>

      {/* 2. Media Container (For Media Variant) */}
      {variant === 'media' ? (
        <View style={styles.mediaContainerWrapper}>
          <View
            style={[
              styles.mediaWrapper,
              {
                borderColor: tokens.borderSubtle,
                backgroundColor: isDark ? '#000000' : '#0B0E14',
              },
            ]}
          >
            <Skeleton width="100%" height="100%" borderRadius={0} />

            {/* Bottom-right circular floating button placeholders */}
            <View style={styles.floatingControlsPlaceholder}>
              <Skeleton width={32} height={32} borderRadius={16} />
              <Skeleton width={32} height={32} borderRadius={16} />
            </View>
          </View>
        </View>
      ) : null}

      {/* 3. Action Row */}
      <View style={styles.actionBar}>
        <View style={styles.leftActions}>
          {/* Like */}
          <Skeleton width={38} height={20} borderRadius={6} />
          {/* Comment */}
          <Skeleton width={38} height={20} borderRadius={6} />
          {/* Share */}
          <Skeleton width={22} height={20} borderRadius={6} />
        </View>

        {/* Right Timestamp Pill */}
        <Skeleton width={56} height={20} borderRadius={8} />
      </View>

      {/* 4. Caption */}
      <View style={styles.captionContainer}>
        {variant === 'text' ? (
          <>
            <Skeleton width="96%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
            <Skeleton width="88%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
            <Skeleton width="58%" height={14} borderRadius={4} />
          </>
        ) : (
          <>
            <Skeleton width="92%" height={13} borderRadius={4} style={{ marginBottom: 5 }} />
            <Skeleton width="65%" height={13} borderRadius={4} />
          </>
        )}
      </View>

      {/* 5. Comments Preview */}
      <View style={styles.commentsPreview}>
        <Skeleton width={135} height={12} borderRadius={4} />
      </View>
    </View>
  );
};

export const FeedSkeletonList: React.FC = () => {
  return (
    <View style={styles.listContainer}>
      <FeedPostSkeleton variant="media" />
      <FeedPostSkeleton variant="text" />
      <FeedPostSkeleton variant="media" />
    </View>
  );
};

export const CommentSkeletonRow: React.FC = () => {
  return (
    <View style={styles.commentRow}>
      {/* Avatar */}
      <Skeleton width={36} height={36} borderRadius={18} />

      {/* Details */}
      <View style={styles.commentDetailsCol}>
        {/* Name + Flat + Time line */}
        <View style={styles.commentHeaderLine}>
          <Skeleton width={100} height={13} borderRadius={4} />
          <Skeleton width={60} height={11} borderRadius={4} />
          <Skeleton width={28} height={11} borderRadius={4} />
        </View>

        {/* Comment text lines */}
        <Skeleton width="94%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
        <Skeleton width="68%" height={12} borderRadius={4} style={{ marginTop: 4 }} />

        {/* Sub-actions line */}
        <View style={styles.commentSubActions}>
          <Skeleton width={38} height={10} borderRadius={3} />
        </View>
      </View>

      {/* Heart placeholder */}
      <Skeleton width={16} height={16} borderRadius={8} style={{ marginTop: 6 }} />
    </View>
  );
};

export const CommentsSkeletonList: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <View style={styles.commentsListWrapper}>
      {Array.from({ length: count }).map((_, index) => (
        <CommentSkeletonRow key={`comment-skel-${index}`} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 112,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    paddingBottom: 12,
  },
  shadowDark: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 4,
  },
  shadowLight: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nameCol: {
    gap: 2,
  },
  mediaContainerWrapper: {
    paddingHorizontal: 12,
  },
  mediaWrapper: {
    width: '100%',
    aspectRatio: 4 / 5,
    maxHeight: 440,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  floatingControlsPlaceholder: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  captionContainer: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 4,
  },
  commentsPreview: {
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  // Comments Sheet Skeleton Styles
  commentsListWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 16,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  commentDetailsCol: {
    flex: 1,
  },
  commentHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentSubActions: {
    marginTop: 8,
  },
});
