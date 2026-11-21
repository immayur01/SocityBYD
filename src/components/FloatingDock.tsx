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
}: FloatingDockProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const handleTabPress = (tab: TabKey) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onSelectTab(tab);
  };

  const activeColor = isDark ? '#FB7185' : '#F43F5E';
  const inactiveColor = isDark ? '#94A3B8' : '#64748B';

  return (
    <View
      style={[
        styles.dockBar,
        {
          backgroundColor: isDark ? '#131722' : '#FFFFFF',
          borderTopColor: isDark ? '#242C3D' : '#E2E8F0',
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 10,
        },
      ]}
    >
      {TABS.map(({ key, label, Icon }) => {
        const isActive = activeTab === key;

        return (
          <TouchableOpacity
            key={key}
            onPress={() => handleTabPress(key)}
            activeOpacity={0.7}
            style={styles.tabItem}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <View
              style={[
                styles.tabContent,
                isActive && styles.activeSquirclePill,
              ]}
            >
              <Icon
                size={20}
                color={isActive ? activeColor : inactiveColor}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? activeColor : inactiveColor,
                    fontWeight: isActive ? '700' : '500',
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
    marginHorizontal: 0,
    borderRadius: 0,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    zIndex: 50,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
  },
  activeSquirclePill: {
    backgroundColor: 'rgba(244, 63, 94, 0.16)',
  },
  tabLabel: {
    fontSize: 11,
  },
});
