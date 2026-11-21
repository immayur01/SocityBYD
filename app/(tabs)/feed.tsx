import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Sparkles } from 'lucide-react-native';
import { PostCard } from '@/components/PostCard';
import { Post } from '@/types';
import { postsService } from '@/services/posts';
import { useTheme } from '@/context/ThemeContext';

export default function FeedScreen() {
  const { tokens } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadPosts = useCallback(async () => {
    try {
      const data = await postsService.getPosts('active');
      setPosts(data);
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: tokens.bgApp }]}>
      {/* 
        Clean & Direct Feed:
        - Starts directly beneath the persistent header with 14px top spacing.
        - NO sub-header banners, titles, "Active/Archive" tabs, "48h" badges, or inline text bars.
        - 96px bottom padding (pb-[96px]) ensures final card sits cleanly ~12px above dock with 100% visible rounded border.
      */}
      <FlashList
        data={posts}
        renderItem={({ item }) => <PostCard post={item} />}
        keyExtractor={(item) => item.id}
        estimatedItemSize={420}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7C4DFF"
            colors={['#7C4DFF', '#EC4899']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Sparkles size={36} color={tokens.textMuted} />
            <Text style={[styles.emptyTitle, { color: tokens.textPrimary }]}>
              No community posts right now
            </Text>
            <Text style={[styles.emptySubtitle, { color: tokens.textMuted }]}>
              Tap the '+' button in the top left header to share an update with Ashtavinayak Empire!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 112, // Matches pb-[112px] from HTML spec for ~16px clearance
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12.5,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
});
