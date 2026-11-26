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
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  shadowDark: {
    shadowOpacity: 0,
    elevation: 0,
  },
  shadowLight: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  glowBorderDark: {
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  glowBorderLight: {
    borderColor: 'rgba(0, 0, 0, 0.16)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
