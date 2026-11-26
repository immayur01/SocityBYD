import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface ShimmerTitleProps {
  fontSize?: number;
  letterSpacing?: number;
  subtitle?: string;
  align?: 'center' | 'left' | 'right';
}

export const ShimmerTitle: React.FC<ShimmerTitleProps> = ({
  fontSize = 20,
  letterSpacing = 1.5,
  subtitle,
  align = 'center',
}) => {
  const { tokens } = useTheme();

  return (
    <View style={[styles.container, align === 'left' && { alignItems: 'flex-start' }]}>
      <Text
        style={[
          styles.title,
          {
            fontSize,
            letterSpacing,
            textAlign: align,
            color: tokens.textPrimary,
          },
        ]}
      >
        ASHTAVINAYAK EMPIRE
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { textAlign: align, color: tokens.textMuted }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 6,
    lineHeight: 18,
  },
});
