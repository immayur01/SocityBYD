import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Newspaper,
  UtensilsCrossed,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { UnreadBadge } from '@/components/UnreadBadge';

export type TabKey = 'feed' | 'food' | 'complaints' | 'chat';

interface FloatingDockProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  unreadChats?: number;
  unreadChatCount?: number;
}

const TABS: { key: TabKey; label: string; Icon: typeof Newspaper }[] = [
  { key: 'feed', label: 'Feed', Icon: Newspaper },
  { key: 'food', label: 'Food', Icon: UtensilsCrossed },
  { key: 'complaints', label: 'Complaints', Icon: AlertTriangle },
  { key: 'chat', label: 'Chat', Icon: MessageSquare },
];

export function FloatingDock({
  activeTab,
  onSelectTab,
  unreadChats,
  unreadChatCount,
}: FloatingDockProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const handleTabPress = (tab: TabKey) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onSelectTab(tab);
  };

  // Crisp monochrome active state, muted neutral inactive state
  const activeColor = isDark ? '#FFFFFF' : '#09090B';
  const inactiveColor = '#71717A';
  const unreadCount = unreadChats ?? unreadChatCount ?? 0;

  const dockBg = isDark ? '#0E0E10' : '#F8F8FA';
  const dockBorderTop = isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <View
      style={[
        styles.dockBar,
        {
          backgroundColor: dockBg,
          borderTopColor: dockBorderTop,
          paddingBottom: Math.max(insets.bottom, 12),
          paddingTop: 8,
        },
      ]}
    >
      {TABS.map(({ key, label, Icon }) => {
        const isActive = activeTab === key;
        const color = isActive ? activeColor : inactiveColor;
        const hasUnread = key === 'chat' && unreadCount > 0;

        return (
          <TouchableOpacity
            key={key}
            onPress={() => handleTabPress(key)}
            activeOpacity={0.7}
            style={styles.tabItem}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <View style={styles.tabContent}>
              <View style={styles.iconContainer}>
                <Icon
                  size={20}
                  color={color}
                  strokeWidth={1.5}
                />
                {hasUnread && (
                  <UnreadBadge
                    count={unreadCount}
                    style={styles.dockBadge}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color,
                    fontWeight: isActive ? '500' : '400',
                  },
                ]}
              >
                {label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export const BottomNav = FloatingDock;

const styles = StyleSheet.create({
  dockBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    zIndex: 50,
  },
  tabItem: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dockBadge: {
    position: 'absolute',
    top: -7,
    right: -14,
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.1,
  },
});
