import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastData {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (title: string, description?: string, type?: ToastType) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const insets = useSafeAreaInsets();
  const [currentToast, setCurrentToast] = useState<ToastData | null>(null);

  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  const hideToast = useCallback(() => {
    translateY.value = withTiming(-120, { duration: 240 });
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(setCurrentToast)(null);
    });
  }, [translateY, opacity]);

  const showToast = useCallback(
    (title: string, description?: string, type: ToastType = 'info') => {
      if (Platform.OS !== 'web') {
        if (type === 'success') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } else if (type === 'error') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
      }

      setCurrentToast({
        id: String(Date.now()),
        title,
        description,
        type,
      });

      translateY.value = withSpring(0, { damping: 14, stiffness: 120 });
      opacity.value = withTiming(1, { duration: 250 });

      // Auto dismiss after 3.5s
      setTimeout(() => {
        hideToast();
      }, 3500);
    },
    [translateY, opacity, hideToast]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
      default:
        return '#8b5cf6';
    }
  };

  const renderIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={20} color="#10b981" />;
      case 'error':
        return <AlertCircle size={20} color="#ef4444" />;
      case 'warning':
        return <AlertTriangle size={20} color="#f59e0b" />;
      case 'info':
      default:
        return <Info size={20} color="#a855f7" />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {currentToast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.toastContainer,
            { top: Math.max(insets.top + 8, 24) },
            animatedStyle,
          ]}
        >
          <View style={[styles.glassWrapper, { borderColor: getBorderColor(currentToast.type) }]}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
            ) : null}
            <View style={styles.toastContent}>
              <View style={styles.iconContainer}>{renderIcon(currentToast.type)}</View>
              <View style={styles.textContainer}>
                <Text style={styles.title}>{currentToast.title}</Text>
                {currentToast.description ? (
                  <Text style={styles.description}>{currentToast.description}</Text>
                ) : null}
              </View>
            </View>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: 'center',
  },
  glassWrapper: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(23, 20, 48, 0.94)',
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  description: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});
