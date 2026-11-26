import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface ProgressiveBlurEdgeProps {
  position: 'top' | 'bottom';
  height: number;
  bgColor: string;
  isDark: boolean;
  style?: StyleProp<ViewStyle>;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return `rgba(255, 255, 255, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Fallback boundary to prevent native MaskedView/BlurView crashes from taking down tabs
class SafeMaskedBlurBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: any) {
    console.warn('[ProgressiveBlurEdge] Fallback rendered due to:', err);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export function ProgressiveBlurEdge({
  position,
  height,
  bgColor,
  isDark,
  style,
}: ProgressiveBlurEdgeProps) {
  const isTop = position === 'top';
  const tint = isDark ? 'dark' : 'light';

  // Alpha mask: opaque black = full blur, transparent = 0% blur (exact CSS mask-image)
  const maskColors: [string, string, string, string] = isTop
    ? [
        'rgba(0, 0, 0, 1)',
        'rgba(0, 0, 0, 0.75)',
        'rgba(0, 0, 0, 0.2)',
        'rgba(0, 0, 0, 0)',
      ]
    : [
        'rgba(0, 0, 0, 0)',
        'rgba(0, 0, 0, 0.25)',
        'rgba(0, 0, 0, 0.9)',
        'rgba(0, 0, 0, 1)',
      ];

  const maskLocations: [number, number, number, number] = isTop
    ? [0, 0.35, 0.72, 1]
    : [0, 0.12, 0.32, 1];

  // Subtle background tint blend
  const tintColors: [string, string] = isTop
    ? [hexToRgba(bgColor, 0.4), hexToRgba(bgColor, 0)]
    : [hexToRgba(bgColor, 0), hexToRgba(bgColor, 0.55)];

  const fallbackGradient = (
    <LinearGradient
      colors={
        isTop
          ? [hexToRgba(bgColor, 0.7), hexToRgba(bgColor, 0)]
          : [hexToRgba(bgColor, 0), hexToRgba(bgColor, 0.7)]
      }
      style={StyleSheet.absoluteFill}
    />
  );

  if (Platform.OS === 'android') {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.container,
          { height },
          isTop ? styles.top : styles.bottom,
          style,
        ]}
      >
        {fallbackGradient}
      </View>
    );
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        { height },
        isTop ? styles.top : styles.bottom,
        style,
      ]}
    >
      <SafeMaskedBlurBoundary fallback={fallbackGradient}>
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <LinearGradient
              colors={maskColors}
              locations={maskLocations}
              style={StyleSheet.absoluteFill}
            />
          }
        >
          <BlurView
            key={isDark ? `${position}-dock-dark` : `${position}-dock-light`}
            intensity={35}
            blurReductionFactor={1}
            tint={tint}
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={tintColors}
            style={StyleSheet.absoluteFill}
          />
        </MaskedView>
      </SafeMaskedBlurBoundary>
    </View>
  );
}

export default ProgressiveBlurEdge;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
  },
  top: {
    top: 0,
  },
  bottom: {
    bottom: 0,
  },
});
