import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withDelay,
  withTiming,
  withSequence,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Polygon,
} from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

// Track session playback so it only runs once per app session (unless forced)
let sessionIntroHasPlayed = false;

export function resetIntroSession() {
  sessionIntroHasPlayed = false;
  if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem('ashtavinayak_intro_played');
    } catch {}
  }
}

interface IntroSplashProps {
  onFinish?: () => void;
  forcePlay?: boolean;
}

const DRAW_EASING = Easing.bezier(0.4, 0, 0.2, 1);
const POP_EASING = Easing.bezier(0.34, 1.56, 0.64, 1);
const DISPERSE_EASING = Easing.bezier(0.55, 0.055, 0.675, 0.19);
const FADE_EASING = Easing.bezier(0.22, 1, 0.36, 1);

export function IntroSplash({ onFinish, forcePlay = false }: IntroSplashProps) {
  // Check if we should skip before mounting
  const [shouldSkip] = useState(() => {
    if (forcePlay) return false;
    if (sessionIntroHasPlayed) return true;
    if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
      try {
        if (sessionStorage.getItem('ashtavinayak_intro_played') === 'true') {
          return true;
        }
      } catch {}
    }
    return false;
  });

  const [visible, setVisible] = useState(!shouldSkip);

  // Overall overlay opacity (starts 1, fades to 0 at 2850ms)
  const overlayOpacity = useSharedValue(1);

  // Logo pulse scale (starts 1, pulses at 1850ms)
  const logoScale = useSharedValue(1);

  // Dispersion transform & opacity (starts at 2450ms)
  const disperseProgress = useSharedValue(0);
  const disperseOpacity = useSharedValue(1);

  // Individual draw stroke progresses (0 = hidden, 1 = drawn)
  const step1 = useSharedValue(0); // 100ms
  const step2 = useSharedValue(0); // 280ms (pop-fill)
  const step3 = useSharedValue(0); // 380ms
  const step4 = useSharedValue(0); // 520ms (pop-fill)
  const step5 = useSharedValue(0); // 620ms
  const step6 = useSharedValue(0); // 820ms (pop-fill)
  const step7 = useSharedValue(0); // 940ms
  const step8 = useSharedValue(0); // 1150ms
  const step9 = useSharedValue(0); // 1280ms

  // ================= TOP-LEVEL HOOK DECLARATIONS =================
  // Overlay animated style
  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  // Logo pulse container style
  const logoScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  // Directional dispersion styles
  const dirUpStyle = useAnimatedStyle(() => ({
    opacity: disperseOpacity.value,
    transform: [
      { translateY: interpolate(disperseProgress.value, [0, 1], [0, -140]) },
      { scale: interpolate(disperseProgress.value, [0, 1], [1, 0.9]) },
    ],
  }));

  const dirUpSlightStyle = useAnimatedStyle(() => ({
    opacity: disperseOpacity.value,
    transform: [
      { translateY: interpolate(disperseProgress.value, [0, 1], [0, -95]) },
    ],
  }));

  const dirLeftStyle = useAnimatedStyle(() => ({
    opacity: disperseOpacity.value,
    transform: [
      { translateX: interpolate(disperseProgress.value, [0, 1], [0, -150]) },
      { translateY: interpolate(disperseProgress.value, [0, 1], [0, -20]) },
      { rotate: `${interpolate(disperseProgress.value, [0, 1], [0, -14])}deg` },
    ],
  }));

  const dirRightStyle = useAnimatedStyle(() => ({
    opacity: disperseOpacity.value,
    transform: [
      { translateX: interpolate(disperseProgress.value, [0, 1], [0, 150]) },
      { translateY: interpolate(disperseProgress.value, [0, 1], [0, -20]) },
      { rotate: `${interpolate(disperseProgress.value, [0, 1], [0, 14])}deg` },
    ],
  }));

  const dirDownStyle = useAnimatedStyle(() => ({
    opacity: disperseOpacity.value,
    transform: [
      { translateX: interpolate(disperseProgress.value, [0, 1], [0, 15]) },
      { translateY: interpolate(disperseProgress.value, [0, 1], [0, 150]) },
    ],
  }));

  const dirDownLeftStyle = useAnimatedStyle(() => ({
    opacity: disperseOpacity.value,
    transform: [
      { translateX: interpolate(disperseProgress.value, [0, 1], [0, -130]) },
      { translateY: interpolate(disperseProgress.value, [0, 1], [0, 120]) },
      { rotate: `${interpolate(disperseProgress.value, [0, 1], [0, -18])}deg` },
    ],
  }));

  const dirDownRightStyle = useAnimatedStyle(() => ({
    opacity: disperseOpacity.value,
    transform: [
      { translateX: interpolate(disperseProgress.value, [0, 1], [0, 130]) },
      { translateY: interpolate(disperseProgress.value, [0, 1], [0, 120]) },
      { rotate: `${interpolate(disperseProgress.value, [0, 1], [0, 18])}deg` },
    ],
  }));

  // Individual element animated props
  const step1Props = useAnimatedProps(() => ({
    strokeDashoffset: (1 - step1.value) * 200,
    opacity: step1.value > 0 ? 1 : 0,
  }));

  const step2Props = useAnimatedProps(() => ({
    opacity: step2.value,
  }));

  const step3Props = useAnimatedProps(() => ({
    strokeDashoffset: (1 - step3.value) * 120,
    opacity: step3.value > 0 ? 1 : 0,
  }));

  const step4Props = useAnimatedProps(() => ({
    opacity: step4.value,
  }));

  const step5Props = useAnimatedProps(() => ({
    strokeDashoffset: (1 - step5.value) * 220,
    opacity: step5.value > 0 ? 1 : 0,
  }));

  const step6LeftProps = useAnimatedProps(() => ({
    opacity: step6.value,
  }));

  const step6RightProps = useAnimatedProps(() => ({
    opacity: step6.value,
  }));

  const step7aProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - step7.value) * 320,
    opacity: step7.value > 0 ? 1 : 0,
  }));

  const step7bProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - step7.value) * 180,
    opacity: step7.value > 0 ? 1 : 0,
  }));

  const step8Props = useAnimatedProps(() => ({
    strokeDashoffset: (1 - step8.value) * 25,
    opacity: step8.value > 0 ? 1 : 0,
  }));

  const step9aProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - step9.value) * 220,
    opacity: step9.value > 0 ? 1 : 0,
  }));

  const step9bProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - step9.value) * 240,
    opacity: step9.value > 0 ? 1 : 0,
  }));

  useEffect(() => {
    if (shouldSkip) {
      onFinish?.();
      return;
    }

    // Mark as played this session
    sessionIntroHasPlayed = true;
    if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem('ashtavinayak_intro_played', 'true');
      } catch {}
    }

    // Safety fallback: guaranteed overlay unmount within 3.2s
    const safetyTimer = setTimeout(() => {
      setVisible(false);
      onFinish?.();
    }, 3200);

    // 1. Stroke draw & pop-in animations
    step1.value = withDelay(100, withTiming(1, { duration: 650, easing: DRAW_EASING }));
    step2.value = withDelay(280, withTiming(1, { duration: 400, easing: POP_EASING }));
    step3.value = withDelay(380, withTiming(1, { duration: 650, easing: DRAW_EASING }));
    step4.value = withDelay(520, withTiming(1, { duration: 400, easing: POP_EASING }));
    step5.value = withDelay(620, withTiming(1, { duration: 650, easing: DRAW_EASING }));
    step6.value = withDelay(820, withTiming(1, { duration: 400, easing: POP_EASING }));
    step7.value = withDelay(940, withTiming(1, { duration: 650, easing: DRAW_EASING }));
    step8.value = withDelay(1150, withTiming(1, { duration: 650, easing: DRAW_EASING }));
    step9.value = withDelay(1280, withTiming(1, { duration: 650, easing: DRAW_EASING }));

    // 2. Completed Logo Pulse at ~1850ms
    logoScale.value = withDelay(
      1850,
      withSequence(
        withTiming(1.06, { duration: 275, easing: Easing.out(Easing.ease) }),
        withTiming(1.0, { duration: 275, easing: Easing.in(Easing.ease) })
      )
    );

    // 3. Dispersion outward at ~2450ms
    disperseProgress.value = withDelay(
      2450,
      withTiming(1, { duration: 720, easing: DISPERSE_EASING })
    );
    disperseOpacity.value = withDelay(
      2450,
      withTiming(0, { duration: 550, easing: Easing.in(Easing.ease) })
    );

    // 4. Fade-out overlay at ~2850ms (duration 650ms)
    overlayOpacity.value = withDelay(
      2850,
      withTiming(0, { duration: 650, easing: FADE_EASING }, (finished) => {
        if (finished) {
          runOnJS(handleAnimationComplete)();
        }
      })
    );

    return () => {
      clearTimeout(safetyTimer);
    };
  }, []);

  const handleAnimationComplete = () => {
    setVisible(false);
    onFinish?.();
  };

  // If already finished or skipped, return null AFTER all hooks are called
  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.overlay, overlayAnimatedStyle]}
      pointerEvents="none"
    >
      <Animated.View style={[styles.logoContainer, logoScaleStyle]}>
        {/* ================= GROUP: dir-up ================= */}
        <Animated.View style={[StyleSheet.absoluteFill, dirUpStyle]}>
          <Svg viewBox="130 85 252 330" width="100%" height="100%">
            <Defs>
              <LinearGradient id="goldFloatUp" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FDE68A" />
                <Stop offset="50%" stopColor="#F59E0B" />
                <Stop offset="100%" stopColor="#B45309" />
              </LinearGradient>
            </Defs>
            {/* Step 1: Crown outline */}
            <AnimatedPath
              d="M 206 168 L 206 136 L 256 98 L 306 136 L 306 168"
              fill="none"
              stroke="url(#goldFloatUp)"
              strokeWidth={11}
              strokeLinejoin="miter"
              strokeDasharray={[200, 200]}
              animatedProps={step1Props}
            />
            {/* Step 2: Crown jewel polygon */}
            <AnimatedPolygon
              points="256,122 267,131 267,144 245,144 245,131"
              fill="url(#goldFloatUp)"
              animatedProps={step2Props}
            />
          </Svg>
        </Animated.View>

        {/* ================= GROUP: dir-up-slight ================= */}
        <Animated.View style={[StyleSheet.absoluteFill, dirUpSlightStyle]}>
          <Svg viewBox="130 85 252 330" width="100%" height="100%">
            <Defs>
              <LinearGradient id="goldFloatUpSlight" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FDE68A" />
                <Stop offset="50%" stopColor="#F59E0B" />
                <Stop offset="100%" stopColor="#B45309" />
              </LinearGradient>
            </Defs>
            {/* Step 3: Forehead arch */}
            <AnimatedPath
              d="M 218 176 Q 256 144 294 176"
              fill="none"
              stroke="url(#goldFloatUpSlight)"
              strokeWidth={11}
              strokeLinecap="round"
              strokeDasharray={[120, 120]}
              animatedProps={step3Props}
            />
            {/* Step 4: Red Tilak */}
            <AnimatedPath
              d="M 256 176 C 256 176, 248 194, 248 201 A 8 8 0 0 0 264 201 C 264 194, 256 176, 256 176 Z"
              fill="#DC2626"
              animatedProps={step4Props}
            />
          </Svg>
        </Animated.View>

        {/* ================= GROUP: dir-left ================= */}
        <Animated.View style={[StyleSheet.absoluteFill, dirLeftStyle]}>
          <Svg viewBox="130 85 252 330" width="100%" height="100%">
            <Defs>
              <LinearGradient id="goldFloatLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FDE68A" />
                <Stop offset="50%" stopColor="#F59E0B" />
                <Stop offset="100%" stopColor="#B45309" />
              </LinearGradient>
            </Defs>
            {/* Step 5a: Left ear curve */}
            <AnimatedPath
              d="M 216 196 C 188 182, 162 180, 146 182 C 154 214, 154 248, 174 264 C 194 278, 212 262, 206 238 L 206 218"
              fill="none"
              stroke="url(#goldFloatLeft)"
              strokeWidth={11}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={[220, 220]}
              animatedProps={step5Props}
            />
            {/* Step 6a: Left eye dot */}
            <AnimatedPath
              d="M 218 218 Q 228 212 236 220 Q 227 226 218 218 Z"
              fill="url(#goldFloatLeft)"
              animatedProps={step6LeftProps}
            />
          </Svg>
        </Animated.View>

        {/* ================= GROUP: dir-right ================= */}
        <Animated.View style={[StyleSheet.absoluteFill, dirRightStyle]}>
          <Svg viewBox="130 85 252 330" width="100%" height="100%">
            <Defs>
              <LinearGradient id="goldFloatRight" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FDE68A" />
                <Stop offset="50%" stopColor="#F59E0B" />
                <Stop offset="100%" stopColor="#B45309" />
              </LinearGradient>
            </Defs>
            {/* Step 5b: Right ear curve */}
            <AnimatedPath
              d="M 296 196 C 324 182, 350 180, 366 182 C 358 214, 358 248, 338 264 C 318 278, 300 262, 306 238 L 306 218"
              fill="none"
              stroke="url(#goldFloatRight)"
              strokeWidth={11}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={[220, 220]}
              animatedProps={step5Props}
            />
            {/* Step 6b: Right eye dot */}
            <AnimatedPath
              d="M 294 218 Q 284 212 276 220 Q 285 226 294 218 Z"
              fill="url(#goldFloatRight)"
              animatedProps={step6RightProps}
            />
          </Svg>
        </Animated.View>

        {/* ================= GROUP: dir-down ================= */}
        <Animated.View style={[StyleSheet.absoluteFill, dirDownStyle]}>
          <Svg viewBox="130 85 252 330" width="100%" height="100%">
            <Defs>
              <LinearGradient id="goldFloatDown" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FDE68A" />
                <Stop offset="50%" stopColor="#F59E0B" />
                <Stop offset="100%" stopColor="#B45309" />
              </LinearGradient>
            </Defs>
            {/* Step 7a: Central trunk main stroke */}
            <AnimatedPath
              d="M 216 196 C 242 212, 246 244, 246 276 C 246 318, 276 346, 314 334 C 304 354, 268 360, 248 338 C 232 320, 232 288, 232 262"
              fill="none"
              stroke="url(#goldFloatDown)"
              strokeWidth={11}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={[320, 320]}
              animatedProps={step7aProps}
            />
            {/* Step 7b: Trunk right return */}
            <AnimatedPath
              d="M 296 196 C 270 212, 266 244, 266 274 C 266 298, 282 318, 304 316"
              fill="none"
              stroke="url(#goldFloatDown)"
              strokeWidth={11}
              strokeLinecap="round"
              strokeDasharray={[180, 180]}
              animatedProps={step7bProps}
            />
          </Svg>
        </Animated.View>

        {/* ================= GROUP: dir-down-left ================= */}
        <Animated.View style={[StyleSheet.absoluteFill, dirDownLeftStyle]}>
          <Svg viewBox="130 85 252 330" width="100%" height="100%">
            <Defs>
              <LinearGradient id="goldFloatDownLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FDE68A" />
                <Stop offset="50%" stopColor="#F59E0B" />
                <Stop offset="100%" stopColor="#B45309" />
              </LinearGradient>
            </Defs>
            {/* Step 8a: Left tusk stroke */}
            <AnimatedPath
              d="M 224 262 L 214 274"
              fill="none"
              stroke="url(#goldFloatDownLeft)"
              strokeWidth={9}
              strokeLinecap="round"
              strokeDasharray={[25, 25]}
              animatedProps={step8Props}
            />
            {/* Step 9a: Lower left body sweep */}
            <AnimatedPath
              d="M 204 294 C 170 280, 146 306, 154 338 C 162 370, 204 388, 240 390"
              fill="none"
              stroke="url(#goldFloatDownLeft)"
              strokeWidth={11}
              strokeLinecap="round"
              strokeDasharray={[220, 220]}
              animatedProps={step9aProps}
            />
          </Svg>
        </Animated.View>

        {/* ================= GROUP: dir-down-right ================= */}
        <Animated.View style={[StyleSheet.absoluteFill, dirDownRightStyle]}>
          <Svg viewBox="130 85 252 330" width="100%" height="100%">
            <Defs>
              <LinearGradient id="goldFloatDownRight" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FDE68A" />
                <Stop offset="50%" stopColor="#F59E0B" />
                <Stop offset="100%" stopColor="#B45309" />
              </LinearGradient>
            </Defs>
            {/* Step 8b: Right tusk stroke */}
            <AnimatedPath
              d="M 288 262 L 298 274"
              fill="none"
              stroke="url(#goldFloatDownRight)"
              strokeWidth={9}
              strokeLinecap="round"
              strokeDasharray={[25, 25]}
              animatedProps={step8Props}
            />
            {/* Step 9b: Lower right modak / base curve */}
            <AnimatedPath
              d="M 308 294 C 342 280, 366 306, 358 338 C 350 370, 304 386, 276 382 C 260 380, 250 390, 248 402 C 268 402, 284 392, 296 382"
              fill="none"
              stroke="url(#goldFloatDownRight)"
              strokeWidth={11}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={[240, 240]}
              animatedProps={step9bProps}
            />
          </Svg>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: '#070B14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 185,
    height: 240,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
});
