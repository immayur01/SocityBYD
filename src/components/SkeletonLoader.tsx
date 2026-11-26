import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { Skeleton } from './Skeleton';
import { useTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type SkeletonVariant = 'shell' | 'feed' | 'complaints' | 'food' | 'profile' | 'chat';

export interface SkeletonLoaderProps {
  variant?: SkeletonVariant;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ variant = 'shell' }) => {
  const { tokens, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const dockHeight = 52 + Math.max(insets.bottom, 12);

  // Common card style per MASTER.md
  const cardStyle = [
    styles.card,
    {
      backgroundColor: tokens.bgCard,
      borderColor: tokens.borderSubtle,
    },
  ];

  /* -------------------------------------------------------------
   * 1. APP SHELL VARIANT (Full screen with Header + Cards + Dock)
   * ------------------------------------------------------------- */
  if (variant === 'shell') {
    return (
      <View style={[styles.screenContainer, { backgroundColor: tokens.bgApp }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        {/* Top Header Skeleton */}
        <View
          style={[
            styles.headerSkeleton,
            {
              paddingTop: insets.top + 8,
              backgroundColor: tokens.bgHeader,
              borderBottomColor: tokens.borderSubtle,
            },
          ]}
        >
          <Skeleton width={40} height={40} borderRadius={12} />
          <Skeleton width={140} height={14} borderRadius={6} />
          <View style={styles.headerRightGroup}>
            <Skeleton width={40} height={40} borderRadius={12} />
            <Skeleton width={70} height={40} borderRadius={12} />
          </View>
        </View>

        {/* Scrollable Body Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: dockHeight }]}
        >
          {/* Card 1: Media Feed Card */}
          <View style={cardStyle}>
            <View style={styles.cardHeader}>
              <View style={styles.avatarRow}>
                <Skeleton width={36} height={36} borderRadius={18} />
                <View style={styles.metaCol}>
                  <Skeleton width={110} height={13} borderRadius={4} />
                  <Skeleton width={70} height={10} borderRadius={4} style={{ marginTop: 4 }} />
                </View>
              </View>
              <Skeleton width={64} height={18} borderRadius={6} />
            </View>
            <View style={styles.mediaPlaceholder}>
              <Skeleton width="100%" height={220} borderRadius={8} />
            </View>
            <View style={styles.actionBar}>
              <View style={styles.actionsLeft}>
                <Skeleton width={44} height={20} borderRadius={6} />
                <Skeleton width={44} height={20} borderRadius={6} />
              </View>
              <Skeleton width={50} height={16} borderRadius={4} />
            </View>
            <View style={styles.captionBlock}>
              <Skeleton width="90%" height={12} borderRadius={4} style={{ marginBottom: 5 }} />
              <Skeleton width="60%" height={12} borderRadius={4} />
            </View>
          </View>

          {/* Card 2: Text Post Card */}
          <View style={cardStyle}>
            <View style={styles.cardHeader}>
              <View style={styles.avatarRow}>
                <Skeleton width={36} height={36} borderRadius={18} />
                <View style={styles.metaCol}>
                  <Skeleton width={120} height={13} borderRadius={4} />
                  <Skeleton width={80} height={10} borderRadius={4} style={{ marginTop: 4 }} />
                </View>
              </View>
              <Skeleton width={70} height={18} borderRadius={6} />
            </View>
            <View style={styles.captionBlock}>
              <Skeleton width="96%" height={13} borderRadius={4} style={{ marginBottom: 6 }} />
              <Skeleton width="88%" height={13} borderRadius={4} style={{ marginBottom: 6 }} />
              <Skeleton width="55%" height={13} borderRadius={4} />
            </View>
            <View style={styles.actionBar}>
              <View style={styles.actionsLeft}>
                <Skeleton width={44} height={20} borderRadius={6} />
                <Skeleton width={44} height={20} borderRadius={6} />
              </View>
              <Skeleton width={50} height={16} borderRadius={4} />
            </View>
          </View>
        </ScrollView>

        {/* Bottom Dock Bar Skeleton */}
        <View
          style={[
            styles.dockSkeleton,
            {
              backgroundColor: tokens.dockBg,
              borderTopColor: tokens.dockBorder,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <Skeleton width={44} height={44} borderRadius={14} />
          <Skeleton width={44} height={44} borderRadius={14} />
          <Skeleton width={44} height={44} borderRadius={14} />
          <Skeleton width={44} height={44} borderRadius={14} />
        </View>
      </View>
    );
  }

  /* -------------------------------------------------------------
   * 2. FEED VARIANT
   * ------------------------------------------------------------- */
  if (variant === 'feed') {
    return (
      <View style={[styles.screenContainer, { backgroundColor: tokens.bgApp }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: dockHeight }]}
        >
          {[1, 2, 3].map((key) => (
            <View key={key} style={cardStyle}>
              <View style={styles.cardHeader}>
                <View style={styles.avatarRow}>
                  <Skeleton width={36} height={36} borderRadius={18} />
                  <View style={styles.metaCol}>
                    <Skeleton width={110} height={13} borderRadius={4} />
                    <Skeleton width={70} height={10} borderRadius={4} style={{ marginTop: 4 }} />
                  </View>
                </View>
                <Skeleton width={64} height={18} borderRadius={6} />
              </View>
              {key % 2 !== 0 && (
                <View style={styles.mediaPlaceholder}>
                  <Skeleton width="100%" height={220} borderRadius={8} />
                </View>
              )}
              <View style={styles.actionBar}>
                <View style={styles.actionsLeft}>
                  <Skeleton width={44} height={20} borderRadius={6} />
                  <Skeleton width={44} height={20} borderRadius={6} />
                </View>
                <Skeleton width={50} height={16} borderRadius={4} />
              </View>
              <View style={styles.captionBlock}>
                <Skeleton width="92%" height={12} borderRadius={4} style={{ marginBottom: 5 }} />
                <Skeleton width="60%" height={12} borderRadius={4} />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  /* -------------------------------------------------------------
   * 3. COMPLAINTS VARIANT
   * ------------------------------------------------------------- */
  if (variant === 'complaints') {
    return (
      <View style={[styles.screenContainer, { backgroundColor: tokens.bgApp }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: dockHeight }]}
        >
          {/* Top Segmented Control + File Button */}
          <View style={styles.complaintsTopRow}>
            <View
              style={[
                styles.segmentedSkeleton,
                { backgroundColor: tokens.bgSurface, borderColor: tokens.borderSubtle },
              ]}
            >
              <Skeleton width="48%" height={32} borderRadius={8} />
              <Skeleton width="48%" height={32} borderRadius={8} />
            </View>
            <Skeleton width={110} height={40} borderRadius={12} />
          </View>

          {/* Ticket Card Skeletons */}
          {[1, 2, 3].map((key) => (
            <View key={key} style={cardStyle}>
              {/* Ticket Top Meta */}
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Skeleton width={60} height={16} borderRadius={4} />
                  <Skeleton width={80} height={16} borderRadius={4} />
                </View>
                <Skeleton width={70} height={20} borderRadius={6} />
              </View>

              {/* Title & Desc */}
              <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 }}>
                <Skeleton width="85%" height={15} borderRadius={4} style={{ marginBottom: 6 }} />
                <Skeleton width="95%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
                <Skeleton width="70%" height={12} borderRadius={4} />
              </View>

              {/* Ticket Footer Action */}
              <View
                style={[
                  styles.actionBar,
                  { borderTopWidth: 1, borderTopColor: tokens.borderDivider },
                ]}
              >
                <Skeleton width={75} height={28} borderRadius={8} />
                <Skeleton width={90} height={28} borderRadius={8} />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  /* -------------------------------------------------------------
   * 4. FOOD CORNER VARIANT
   * ------------------------------------------------------------- */
  if (variant === 'food') {
    return (
      <View style={[styles.screenContainer, { backgroundColor: tokens.bgApp }]}>
        {/* Header info */}
        <View
          style={[
            styles.subHeaderSkeleton,
            { borderBottomColor: tokens.borderSubtle },
          ]}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Skeleton width={150} height={16} borderRadius={4} />
            <Skeleton width={200} height={11} borderRadius={4} />
          </View>
          <Skeleton width={100} height={34} borderRadius={10} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: dockHeight }]}
        >
          {[1, 2, 3].map((key) => (
            <View key={key} style={cardStyle}>
              {/* Dish Image Thumbnail */}
              <Skeleton width="100%" height={160} borderRadius={0} />

              <View style={{ padding: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Skeleton width={160} height={16} borderRadius={4} />
                  <Skeleton width={45} height={18} borderRadius={6} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
                  <Skeleton width={100} height={12} borderRadius={4} />
                  <Skeleton width={60} height={16} borderRadius={4} />
                </View>
                <View style={{ marginTop: 8 }}>
                  <Skeleton width={120} height={11} borderRadius={4} />
                </View>

                {/* Price & Order Button */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 14,
                    paddingTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: tokens.borderDivider,
                  }}
                >
                  <View style={{ gap: 3 }}>
                    <Skeleton width={40} height={10} borderRadius={3} />
                    <Skeleton width={60} height={18} borderRadius={4} />
                  </View>
                  <Skeleton width={96} height={34} borderRadius={10} />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  /* -------------------------------------------------------------
   * 5. PROFILE VARIANT
   * ------------------------------------------------------------- */
  if (variant === 'profile') {
    return (
      <View style={[styles.screenContainer, { backgroundColor: tokens.bgApp, paddingTop: insets.top }]}>
        {/* Top bar */}
        <View style={[styles.topBarSkeleton, { borderBottomColor: tokens.borderSubtle }]}>
          <Skeleton width={32} height={32} borderRadius={10} />
          <Skeleton width={120} height={15} borderRadius={4} />
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Card */}
          <View style={cardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
              <Skeleton width={60} height={60} borderRadius={30} style={{ marginRight: 14 }} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width={130} height={16} borderRadius={4} />
                <Skeleton width={90} height={13} borderRadius={4} />
                <Skeleton width={60} height={11} borderRadius={4} />
              </View>
            </View>
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
              <Skeleton width="100%" height={40} borderRadius={8} />
              <Skeleton width="100%" height={38} borderRadius={8} />
            </View>
          </View>

          {/* Sub tabs */}
          <View
            style={[
              styles.segmentedSkeleton,
              { backgroundColor: tokens.bgSurface, borderColor: tokens.borderSubtle, marginBottom: 16 },
            ]}
          >
            <Skeleton width="31%" height={32} borderRadius={8} />
            <Skeleton width="31%" height={32} borderRadius={8} />
            <Skeleton width="31%" height={32} borderRadius={8} />
          </View>

          {/* Record cards */}
          {[1, 2].map((key) => (
            <View key={key} style={[cardStyle, { padding: 16, marginBottom: 12 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Skeleton width={140} height={14} borderRadius={4} />
                <Skeleton width={65} height={18} borderRadius={6} />
              </View>
              <Skeleton width="75%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
              <Skeleton width="55%" height={12} borderRadius={4} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  /* -------------------------------------------------------------
   * 6. CHAT VARIANT
   * ------------------------------------------------------------- */
  return (
    <View style={[styles.screenContainer, { backgroundColor: tokens.bgApp, paddingTop: insets.top + 8 }]}>
      {/* Top 4 squircle controls */}
      <View style={[styles.chatTopNavSkeleton, { borderBottomColor: tokens.borderSubtle }]}>
        <Skeleton width={42} height={42} borderRadius={14} />
        <Skeleton width={110} height={42} borderRadius={14} />
        <Skeleton width={110} height={42} borderRadius={14} />
        <Skeleton width={42} height={42} borderRadius={14} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {[1, 2, 3, 4].map((key) => (
          <View
            key={key}
            style={[
              styles.chatChannelSkeleton,
              { backgroundColor: tokens.bgCard, borderColor: tokens.borderSubtle },
            ]}
          >
            <Skeleton width={44} height={44} borderRadius={14} />
            <View style={{ flex: 1, gap: 5 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Skeleton width={130} height={14} borderRadius={4} />
                <Skeleton width={45} height={11} borderRadius={4} />
              </View>
              <Skeleton width="80%" height={12} borderRadius={4} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  headerSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaCol: {
    gap: 2,
  },
  mediaPlaceholder: {
    paddingHorizontal: 12,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  captionBlock: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  dockSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  complaintsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  segmentedSkeleton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  subHeaderSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topBarSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  chatTopNavSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  chatChannelSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
});
