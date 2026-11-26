import React, { useEffect } from 'react';
import { StyleSheet, StyleProp, ViewStyle, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}) => {
  const { isDark } = useTheme();
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.85, {
          duration: 750,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0.35, {
          duration: 750,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(opacity);
    };
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const baseColor = isDark ? '#1E2532' : '#E4E4E7';

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseColor,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};
