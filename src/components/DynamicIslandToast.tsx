import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
  Image as RNImage,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Check,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  RotateCw,
  Calendar,
  Image as ImageIcon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useIsland, IslandData, IslandType, island } from '@/context/IslandContext';

const CAMERA_SIZE = 24;
const CAMERA_RADIUS = 12;

const SPRING_CONFIG = {
  damping: 22,
  stiffness: 240,
  mass: 0.9,
};

export const DynamicIslandToast: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { currentIsland, expandIsland, dismissIsland } = useIsland();

  // Active item snapshot to maintain rendering during exit animations
  const [activeItem, setActiveItem] = useState<IslandData | null>(null);
  const [isRendered, setIsRendered] = useState(false);

  // Auto-dismiss timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Animated Shared Values
  const widthVal = useSharedValue(CAMERA_SIZE);
  const heightVal = useSharedValue(CAMERA_SIZE);
  const radiusVal = useSharedValue(CAMERA_RADIUS);
  const containerOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const detailsOpacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  const cameraTop = Math.max(insets.top - 28, 10);
  const expandedWidth = Math.min(screenWidth - 32, 400);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

  // On Complete Dismiss Callback
  const handleDismissFinished = useCallback(() => {
    setIsRendered(false);
    setActiveItem(null);
    translateY.value = 0;
  }, [translateY]);

  // Reverse Collapse Dismiss Animation
  const animateCollapseAndDismiss = useCallback(() => {
    clearTimer();
    triggerHaptic();

    // Step 1: Fade out inner content (0ms -> 110ms)
    contentOpacity.value = withTiming(0, { duration: 110 });
    detailsOpacity.value = withTiming(0, { duration: 110 });

    // Step 2: Suck back into the 24x24 circular camera cutout (110ms -> 340ms)
    widthVal.value = withDelay(110, withTiming(CAMERA_SIZE, { duration: 230 }));
    heightVal.value = withDelay(110, withTiming(CAMERA_SIZE, { duration: 230 }));
    radiusVal.value = withDelay(110, withTiming(CAMERA_RADIUS, { duration: 230 }));
    translateY.value = withDelay(110, withTiming(0, { duration: 230 }));
    containerOpacity.value = withDelay(
      110,
      withTiming(0, { duration: 230 }, (finished) => {
        if (finished) {
          runOnJS(handleDismissFinished)();
        }
      })
    );
  }, [
    clearTimer,
    triggerHaptic,
    contentOpacity,
    detailsOpacity,
    widthVal,
    heightVal,
    radiusVal,
    translateY,
    containerOpacity,
    handleDismissFinished,
  ]);

  // Handle updates to currentIsland
  useEffect(() => {
    if (!currentIsland) {
      if (isRendered) {
        animateCollapseAndDismiss();
      }
      return;
    }

    clearTimer();
    setActiveItem(currentIsland);
    setIsRendered(true);

    const isExpanded = currentIsland.expanded;
    const targetWidth = isExpanded
      ? expandedWidth
      : Math.min(Math.max(currentIsland.title.length * 9.5 + 85, 210), 340);

    const targetHeight = isExpanded
      ? currentIsland.type === 'confirm'
        ? 168
        : currentIsland.type === 'upload'
        ? 54
        : currentIsland.description
        ? 124
        : 88
      : 44;

    const targetRadius = currentIsland.type === 'upload' ? 20 : isExpanded ? 28 : 22;

    if (!isRendered) {
      // Fresh emerge from 24x24 camera lens
      widthVal.value = CAMERA_SIZE;
      heightVal.value = CAMERA_SIZE;
      radiusVal.value = CAMERA_RADIUS;
      translateY.value = 0;
      containerOpacity.value = 1;
      contentOpacity.value = 0;
      detailsOpacity.value = 0;

      if (isExpanded) {
        // Two-beat liquid expansion:
        // Beat 1: Widen horizontally (0ms -> 130ms)
        widthVal.value = withTiming(targetWidth, { duration: 130 });
        heightVal.value = withDelay(
          130,
          withSpring(targetHeight, SPRING_CONFIG)
        );
        radiusVal.value = withDelay(
          130,
          withSpring(targetRadius, SPRING_CONFIG)
        );

        // Header & icon fade in
        contentOpacity.value = withDelay(80, withTiming(1, { duration: 180 }));
        // Details & action buttons bloom once container passes ~65% height
        detailsOpacity.value = withDelay(210, withTiming(1, { duration: 180 }));
      } else {
        // Compact spring
        widthVal.value = withSpring(targetWidth, SPRING_CONFIG);
        heightVal.value = withSpring(targetHeight, SPRING_CONFIG);
        radiusVal.value = withSpring(targetRadius, SPRING_CONFIG);
        contentOpacity.value = withDelay(70, withTiming(1, { duration: 160 }));
      }
    } else {
      // In-place morphing
      if (isExpanded) {
        widthVal.value = withSpring(targetWidth, SPRING_CONFIG);
        heightVal.value = withSpring(targetHeight, SPRING_CONFIG);
        radiusVal.value = withSpring(targetRadius, SPRING_CONFIG);
        contentOpacity.value = withTiming(1, { duration: 160 });
        detailsOpacity.value = withDelay(120, withTiming(1, { duration: 180 }));
      } else {
        detailsOpacity.value = withTiming(0, { duration: 90 });
        widthVal.value = withSpring(targetWidth, SPRING_CONFIG);
        heightVal.value = withSpring(targetHeight, SPRING_CONFIG);
        radiusVal.value = withSpring(targetRadius, SPRING_CONFIG);
        contentOpacity.value = withTiming(1, { duration: 160 });
      }
    }

    // Auto-dismiss setup
    if (currentIsland.duration > 0 && !isExpanded) {
      timerRef.current = setTimeout(() => {
        dismissIsland();
      }, currentIsland.duration);
    }
  }, [
    currentIsland,
    isRendered,
    expandedWidth,
    clearTimer,
    animateCollapseAndDismiss,
    dismissIsland,
    widthVal,
    heightVal,
    radiusVal,
    translateY,
    containerOpacity,
    contentOpacity,
    detailsOpacity,
  ]);

  // Swipe-Up Gesture
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY < 0) {
        // Track upward movement with slight damping
        translateY.value = e.translationY * 0.85;
      }
    })
    .onEnd((e) => {
      if (e.translationY < -24 || e.velocityY < -300) {
        runOnJS(dismissIsland)();
      } else {
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      width: widthVal.value,
      height: heightVal.value,
      borderRadius: radiusVal.value,
      opacity: containerOpacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
    };
  });

  const animatedDetailsStyle = useAnimatedStyle(() => {
    return {
      opacity: detailsOpacity.value,
    };
  });

  if (!isRendered || !activeItem) {
    return null;
  }

  const renderIcon = (type: IslandType) => {
    switch (type) {
      case 'success':
        return <Check size={16} strokeWidth={1.5} color="#22C55E" />;
      case 'error':
        return <AlertCircle size={16} strokeWidth={1.5} color="#EF4444" />;
      case 'warning':
        return <AlertTriangle size={16} strokeWidth={1.5} color="#F59E0B" />;
      case 'loading':
        return <ActivityIndicator size="small" color="#E5E7EB" style={styles.spinner} />;
      case 'info':
      case 'confirm':
      default:
        return <Info size={16} strokeWidth={1.5} color="#E5E7EB" />;
    }
  };

  const isExpanded = activeItem.expanded;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.overlay,
        {
          top: cameraTop,
          left: (screenWidth - expandedWidth) / 2,
          width: expandedWidth,
        },
      ]}
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.islandContainer, animatedContainerStyle]}>
          {activeItem.type === 'upload' ? (
            /* Upload Progress / Retry View */
            <Animated.View style={[styles.uploadContainer, animatedContentStyle]}>
              {/* Left: Tiny Rounded Thumbnail or Vector Icon */}
              <View style={styles.uploadThumbWrapper}>
                {activeItem.thumbnailUri ? (
                  <RNImage source={{ uri: activeItem.thumbnailUri }} style={styles.uploadThumbImage} />
                ) : activeItem.mediaIconType === 'event' ? (
                  <Calendar size={15} strokeWidth={1.5} color="#F5F5F5" />
                ) : activeItem.mediaIconType === 'notice' ? (
                  <AlertCircle size={15} strokeWidth={1.5} color="#F59E0B" />
                ) : (
                  <ImageIcon size={15} strokeWidth={1.5} color="#F5F5F5" />
                )}
              </View>

              {/* Center: Status Label + Sleek Progress Bar */}
              <View style={styles.uploadCenter}>
                <Text style={styles.uploadTitle} numberOfLines={1}>
                  {activeItem.title}
                </Text>
                {!activeItem.isUploadError ? (
                  <View style={styles.uploadTrack}>
                    <View
                      style={[
                        styles.uploadFill,
                        { width: `${Math.round((activeItem.uploadProgress ?? 0) * 100)}%` },
                      ]}
                    />
                  </View>
                ) : (
                  <Text style={styles.uploadErrorSubtext}>Tap to retry upload</Text>
                )}
              </View>

              {/* Right: Live Percentage or Retry Button */}
              {activeItem.isUploadError ? (
                <View style={styles.uploadErrorActions}>
                  <TouchableOpacity
                    style={styles.retryPill}
                    onPress={() => {
                      if (activeItem.onRetry) activeItem.onRetry();
                    }}
                    activeOpacity={0.8}
                  >
                    <RotateCw size={11} strokeWidth={1.5} color="#000000" />
                    <Text style={styles.retryPillText}>Retry</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.uploadCloseBtn}
                    onPress={() => {
                      if (activeItem.onCancel) activeItem.onCancel();
                      dismissIsland();
                    }}
                    activeOpacity={0.7}
                  >
                    <X size={13} strokeWidth={1.5} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.uploadPercentText}>
                  {Math.round((activeItem.uploadProgress ?? 0) * 100)}%
                </Text>
              )}
            </Animated.View>
          ) : !isExpanded ? (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.compactTouchArea}
              onPress={() => {
                if (activeItem.description) {
                  clearTimer();
                  expandIsland();
                }
              }}
            >
              <Animated.View style={[styles.compactRow, animatedContentStyle]}>
                <View style={styles.iconBox}>{renderIcon(activeItem.type)}</View>
                <Text style={styles.compactTitle} numberOfLines={1}>
                  {activeItem.title}
                </Text>
                {activeItem.type === 'loading' ? (
                  <View style={styles.pulsingDot} />
                ) : null}
              </Animated.View>
            </TouchableOpacity>
          ) : (
            /* Expanded Squircle View */
            <View style={styles.expandedWrapper}>
              {/* Header Bar */}
              <Animated.View style={[styles.expandedHeader, animatedContentStyle]}>
                <View style={styles.expandedHeaderLeft}>
                  <View style={styles.iconBox}>{renderIcon(activeItem.type)}</View>
                  <Text style={styles.expandedTitle} numberOfLines={1}>
                    {activeItem.title}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => {
                    if (activeItem.onCancel) {
                      activeItem.onCancel();
                    }
                    dismissIsland();
                  }}
                  activeOpacity={0.7}
                >
                  <X size={15} strokeWidth={1.5} color="#9CA3AF" />
                </TouchableOpacity>
              </Animated.View>

              {/* Description Body */}
              {activeItem.description ? (
                <Animated.View style={[styles.expandedBody, animatedDetailsStyle]}>
                  <Text style={styles.expandedDescription}>
                    {activeItem.description}
                  </Text>
                </Animated.View>
              ) : null}

              {/* Confirm Action Buttons */}
              {activeItem.type === 'confirm' ? (
                <Animated.View style={[styles.actionRow, animatedDetailsStyle]}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      if (activeItem.onCancel) {
                        activeItem.onCancel();
                      }
                      dismissIsland();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelBtnText}>
                      {activeItem.cancelText || 'Cancel'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.confirmBtn,
                      activeItem.isDestructive
                        ? styles.destructiveBtn
                        : styles.primaryBtn,
                    ]}
                    onPress={async () => {
                      if (activeItem.onConfirm) {
                        await activeItem.onConfirm();
                      } else {
                        dismissIsland();
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={
                        activeItem.isDestructive
                          ? styles.destructiveBtnText
                          : styles.primaryBtnText
                      }
                    >
                      {activeItem.confirmText || 'Confirm'}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              ) : null}
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 999999,
  },
  islandContainer: {
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    overflow: 'hidden',
    alignSelf: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  compactTouchArea: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    transform: [{ scale: 0.8 }],
  },
  compactTitle: {
    color: '#F5F5F5',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginLeft: 8,
  },
  expandedWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'space-between',
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expandedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  expandedTitle: {
    color: '#F5F5F5',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#161616',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedBody: {
    marginTop: 6,
    marginBottom: 4,
  },
  expandedDescription: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  confirmBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: '#F5F5F5',
  },
  primaryBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '600',
  },
  destructiveBtn: {
    backgroundColor: '#EF4444',
  },
  destructiveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  uploadContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  uploadThumbWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 10,
  },
  uploadThumbImage: {
    width: '100%',
    height: '100%',
    borderRadius: 7,
  },
  uploadCenter: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 10,
    gap: 4,
  },
  uploadTitle: {
    color: '#F5F5F5',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  uploadTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  uploadFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 2,
  },
  uploadErrorSubtext: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '500',
  },
  uploadErrorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  retryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  retryPillText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '600',
  },
  uploadCloseBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#181818',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadPercentText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 34,
    textAlign: 'right',
  },
});
