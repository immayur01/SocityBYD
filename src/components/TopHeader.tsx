import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Moon, Sun, User } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';

interface TopHeaderProps {
  onPressCreate?: () => void;
  onPressProfile?: () => void;
  onOpenCreatePost?: () => void;
  onAvatarPress?: () => void;
  residentName?: string;
  flatNumber?: string;
}

export function TopHeader({
  onPressCreate,
  onPressProfile,
  onOpenCreatePost,
  onAvatarPress,
  residentName,
  flatNumber,
}: TopHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { tokens, isDark, toggleTheme } = useTheme();

  const handleCreate = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    const fn = onPressCreate || onOpenCreatePost;
    if (fn) fn();
  };

  const handleProfile = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    const fn = onPressProfile || onAvatarPress;
    if (fn) {
      fn();
    } else {
      router.push('/profile');
    }
  };

  const handleToggleTheme = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    toggleTheme();
  };

  const displayName =
    residentName || user?.full_name?.split(' ')[0] || 'Mayur';
  const displayFlat =
    flatNumber ||
    (user?.wing && user?.flat_number
      ? `${user.wing.replace('Wing ', '')}-${user.flat_number}`
      : 'B-402');

  return (
    <View
      style={[
        styles.headerContainer,
        {
          paddingTop: insets.top + 8,
          backgroundColor: tokens.bgHeader,
          borderBottomColor: tokens.borderSubtle,
        },
      ]}
    >
      {/* Left: 40x40 Rounded-square '+' button */}
      <TouchableOpacity
        onPress={handleCreate}
        activeOpacity={0.75}
        style={[
          styles.iconBox,
          {
            backgroundColor: tokens.bgSurface,
            borderColor: tokens.borderSubtle,
          },
        ]}
        accessibilityLabel="Create Post"
      >
        <Plus size={20} color={tokens.textPrimary} strokeWidth={2.2} />
      </TouchableOpacity>

      {/* Center: Clean Single-Line Society Title */}
      <Text
        numberOfLines={1}
        style={[styles.title, { color: tokens.textPrimary }]}
      >
        ASHTAVINAYAK EMPIRE
      </Text>

      {/* Right: Theme Toggle + Resident Profile Box */}
      <View style={styles.rightGroup}>
        {/* 40x40 Rounded-square Sun/Moon Toggle */}
        <TouchableOpacity
          onPress={handleToggleTheme}
          activeOpacity={0.75}
          style={[
            styles.iconBox,
            {
              backgroundColor: tokens.bgSurface,
              borderColor: tokens.borderSubtle,
            },
          ]}
          accessibilityLabel={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? (
            <Sun size={18} color="#FBBF24" strokeWidth={2} />
          ) : (
            <Moon size={18} color={tokens.textPrimary} strokeWidth={2} />
          )}
        </TouchableOpacity>

        {/* 40px Height Rounded-box Resident Profile Button */}
        <TouchableOpacity
          onPress={handleProfile}
          activeOpacity={0.75}
          style={[
            styles.profileBox,
            {
              backgroundColor: tokens.bgSurface,
              borderColor: tokens.borderSubtle,
            },
          ]}
          accessibilityLabel="Resident Profile"
        >
          <View style={styles.profileTextCol}>
            <Text style={[styles.residentName, { color: tokens.textPrimary }]}>
              {displayName}
            </Text>
            <Text
              style={[
                styles.flatNumber,
                { color: isDark ? '#94A3B8' : '#64748B' },
              ]}
            >
              {displayFlat}
            </Text>
          </View>

          {/* Nested rounded-square user avatar — dark slate in dark mode, crisp slate in light mode */}
          <View
            style={[
              styles.avatarBox,
              isDark
                ? {
                    backgroundColor: '#242E42',
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    borderWidth: 1,
                  }
                : {
                    backgroundColor: '#1E293B',
                    borderWidth: 0,
                  },
            ]}
          >
            <User
              size={15}
              color={isDark ? '#E2E8F0' : '#FFFFFF'}
              strokeWidth={2.2}
            />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export const AppHeader = TopHeader;

const styles = StyleSheet.create({
  headerContainer: {
    zIndex: 50,
    elevation: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileBox: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 5,
    gap: 8,
  },
  profileTextCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  residentName: {
    fontSize: 11.5,
    fontWeight: '700',
    lineHeight: 14,
  },
  flatNumber: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
  },
  avatarBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
