import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Newspaper } from 'lucide-react-native';
import { PostCard } from '@/components/PostCard';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { usePosts, useToggleLike } from '@/hooks/queries/usePosts';
import { useTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();

  const {
    posts,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePosts('active');

  const { mutate: toggleLike } = useToggleLike();

  // Exact dock bar height: 44 (tab items) + 8 (paddingTop) + Math.max(insets.bottom, 12).
  const dockHeight = 52 + Math.max(insets.bottom, 12);

  const handleLikeToggle = useCallback((postId: string) => {
    toggleLike(postId);
  }, [toggleLike]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <View style={[styles.container, { backgroundColor: tokens.bgApp }]}>
      {isLoading && !isRefetching ? (
        <SkeletonLoader variant="feed" />
      ) : (
        <FlashList
          data={posts}
          renderItem={({ item }) => (
            <PostCard post={item} onToggleLike={handleLikeToggle} />
          )}
          keyExtractor={(item) => item.id}
          estimatedItemSize={420}
          contentContainerStyle={{ ...styles.listContent, paddingBottom: dockHeight }}
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={isDark ? '#FFFFFF' : '#111827'}
              colors={[isDark ? '#FFFFFF' : '#111827']}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={tokens.textMuted} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconBox, { backgroundColor: isDark ? '#18181B' : '#F4F4F5' }]}>
                <Newspaper size={24} color={tokens.textMuted} strokeWidth={1.5} />
              </View>
              <Text style={[styles.emptyTitle, { color: tokens.textPrimary }]}>
                No community posts yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: tokens.textMuted }]}>
                Tap the '+' button in the header to share an update with Ashtavinayak Empire.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0,
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
});
