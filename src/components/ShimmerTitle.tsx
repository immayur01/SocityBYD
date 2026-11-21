import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

let MaskedView: any = null;
try {
  MaskedView = require('@react-native-masked-view/masked-view').default;
} catch {
  MaskedView = null;
}

interface ShimmerTitleProps {
  fontSize?: number;
  letterSpacing?: number;
  subtitle?: string;
  align?: 'center' | 'left' | 'right';
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export const ShimmerTitle: React.FC<ShimmerTitleProps> = ({
  fontSize = 24,
  letterSpacing = 2.5,
  subtitle,
  align = 'center',
}) => {
  const shimmerTranslate = useSharedValue(-1);

  useEffect(() => {
    shimmerTranslate.value = withRepeat(
      withTiming(2, { duration: 2800 }),
      -1,
      false
    );
  }, [shimmerTranslate]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmerTranslate.value, [-1, 2], [-150, 300]);
    return {
      transform: [{ translateX }],
    };
  });

  const titleText = 'ASHTAVINAYAK EMPIRE';

  if (MaskedView && Platform.OS !== 'web') {
    return (
      <View style={[styles.container, align === 'left' && { alignItems: 'flex-start' }]}>
        <MaskedView
          maskElement={
            <View style={styles.maskContainer}>
              <Text
                style={[
                  styles.titleMask,
                  { fontSize, letterSpacing, textAlign: align },
                ]}
              >
                {titleText}
              </Text>
            </View>
          }
        >
          {/* Base gradient layer */}
          <LinearGradient
            colors={['#c084fc', '#e879f9', '#ffffff', '#fbbf24', '#c084fc']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientBase}
          >
            {/* Shimmer metallic sweep */}
            <AnimatedLinearGradient
              colors={[
                'transparent',
                'rgba(255, 255, 255, 0.2)',
                'rgba(255, 255, 255, 0.95)',
                'rgba(255, 255, 255, 0.2)',
                'transparent',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFillObject, animatedStyle]}
            />
          </LinearGradient>
        </MaskedView>

        {subtitle ? (
          <Text style={[styles.subtitle, { textAlign: align }]}>{subtitle}</Text>
        ) : null}
      </View>
    );
  }

  // Fallback for Web or environments without native masked view
  return (
    <View style={[styles.container, align === 'left' && { alignItems: 'flex-start' }]}>
      <Text
        style={[
          styles.titleFallback,
          { fontSize, letterSpacing, textAlign: align },
        ]}
      >
        {titleText}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { textAlign: align }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  maskContainer: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleMask: {
    color: '#000000',
    fontFamily: Platform.select({
      ios: 'Cinzel-Bold',
      android: 'Cinzel_700Bold',
      default: 'serif',
    }),
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  titleFallback: {
    color: '#f8fafc',
    fontFamily: Platform.select({
      ios: 'Cinzel-Bold',
      android: 'Cinzel_700Bold',
      default: 'serif',
    }),
    fontWeight: '800',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(192, 132, 252, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  gradientBase: {
    height: 48,
    width: 320,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 0.6,
    fontWeight: '500',
  },
});
