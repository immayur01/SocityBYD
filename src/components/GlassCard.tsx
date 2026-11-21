import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/context/ThemeContext';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
  tint?: 'dark' | 'light' | 'default';
  glowBorder?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 45,
  tint,
  glowBorder = false,
}) => {
  const { tokens, isDark } = useTheme();

  const cardDynamicStyle = {
    backgroundColor: tokens.bgCard,
    borderColor: tokens.borderSubtle,
  };

  const resolvedTint = tint || (isDark ? 'dark' : 'light');

  return (
    <View
      style={[
        styles.card,
        cardDynamicStyle,
        isDark ? styles.shadowDark : styles.shadowLight,
        glowBorder && (isDark ? styles.glowBorderDark : styles.glowBorderLight),
        style,
      ]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={intensity}
          tint={resolvedTint}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  shadowDark: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  shadowLight: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  glowBorderDark: {
    borderColor: 'rgba(167, 139, 250, 0.45)',
    shadowColor: '#7C4DFF',
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  glowBorderLight: {
    borderColor: '#7C4DFF',
    shadowColor: '#7C4DFF',
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
