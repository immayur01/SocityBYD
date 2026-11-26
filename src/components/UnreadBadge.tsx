import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';

/**
 * Shared helper to format badge counts:
 * - Return null if count <= 0 (do not render the badge)
 * - Return String(count) for 1 through 99
 * - Return '99+' for any count > 99
 */
export function formatBadgeCount(count: number): string | null {
  if (!count || count <= 0) return null;
  if (count > 99) return '99+';
  return String(count);
}

export interface UnreadBadgeProps {
  count: number;
  /**
   * Visual variant:
   * - 'default': Standard emerald pill (#10B981)
   * - 'activeTab': High-contrast deeper emerald pill (#059669) for placement inside active white/light tabs
   * - 'inactiveTab': Standard emerald pill (#10B981) for placement inside dark/inactive tabs
   */
  variant?: 'default' | 'activeTab' | 'inactiveTab';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const UnreadBadge: React.FC<UnreadBadgeProps> = ({
  count,
  variant = 'default',
  style,
  textStyle,
}) => {
  const formatted = formatBadgeCount(count);
  if (!formatted) return null;

  const backgroundColor = variant === 'activeTab' ? '#059669' : '#10B981';

  return (
    <View style={[styles.badge, { backgroundColor }, style]}>
      <Text style={[styles.badgeText, textStyle]}>{formatted}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    height: 20,
    minWidth: 20,
    borderRadius: 999,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    includeFontPadding: false,
  },
});
