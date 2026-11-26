import React, { useState } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { Tabs, useRouter, usePathname, useSegments } from 'expo-router';
import { TopHeader } from '@/components/TopHeader';
import { FloatingDock, TabKey } from '@/components/FloatingDock';
import { ProgressiveBlurEdge } from '@/components/ProgressiveBlurEdge';
import { CreatePostModal } from '@/components/CreatePostModal';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { tokens, theme } = useTheme();
  const { isAuthenticated, isProfileComplete, loading } = useAuth();

  // Create Post bottom sheet state
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const segments = useSegments();

  React.useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    } else if (!isProfileComplete) {
      router.replace('/(auth)/complete-profile');
    }
  }, [isAuthenticated, isProfileComplete, loading, router]);

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

  if (loading || !isAuthenticated || !isProfileComplete) {
    return <View style={[styles.container, { backgroundColor: tokens.bgApp }]} />;
  }

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
          unreadChatCount={3}
        />
      )}

      {/* 4. Redesigned Unslopped Create Post Bottom Sheet */}
      <CreatePostModal
        visible={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onPostCreated={() => {
          setIsCreateOpen(false);
          router.replace('/(tabs)/feed');
        }}
      />
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
});
