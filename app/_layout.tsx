import React, { useState, useEffect } from 'react';
import 'react-native-gesture-handler';
import '../global.css';
import {
  View,
  StyleSheet,
  StatusBar,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import * as Sentry from '@sentry/react-native';
import { notificationService } from '@/services/notifications';

// Initialize Sentry only when DSN is present (resilient on Expo Go / local dev)
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    debug: false,
    tracesSampleRate: 1.0,
  });
}
import { useFonts } from 'expo-font';
import {
  Cinzel_700Bold,
  Cinzel_800ExtraBold,
} from '@expo-google-fonts/cinzel';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { DynamicIslandToast } from '@/components/DynamicIslandToast';
import { SpinnerLoader } from '@/components/SpinnerLoader';
import { useKeepAwake } from 'expo-keep-awake';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient, setupAppStateFocusRefetch } from '@/lib/queryClient';

// 1. Keep native splash screen visible until fonts are loaded or safety timer fires
SplashScreen.preventAutoHideAsync().catch(() => {});

// 2. Resilient Root Error Boundary for Release/Standalone Builds
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class RootErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[RootErrorBoundary] Unhandled crash caught:', error, errorInfo);
    if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error, {
        extra: { componentStack: errorInfo.componentStack },
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.fallbackContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#0B0E14" />
          <View style={errorStyles.card}>
            <Text style={errorStyles.brandTitle}>Ashtavinayak Empire</Text>
            <Text style={errorStyles.heading}>Something went wrong</Text>
            <Text style={errorStyles.subtext}>
              The application encountered an unexpected issue while rendering. Tap below to reload.
            </Text>

            <ScrollView style={errorStyles.errorBox} showsVerticalScrollIndicator={false}>
              <Text style={errorStyles.errorText}>
                {this.state.error?.message || 'Unknown runtime error'}
              </Text>
            </ScrollView>

            <TouchableOpacity
              onPress={this.handleRetry}
              activeOpacity={0.8}
              style={errorStyles.retryButton}
            >
              <Text style={errorStyles.retryButtonText}>Reload Application</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

function ThemedAppContainer() {
  const { isDark, tokens } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const unsubscribeNotifications = notificationService.setupNotificationTapListener((route) => {
      try {
        router.push(route as any);
      } catch (err) {
        console.warn('[ThemedAppContainer] Failed to route notification tap:', route, err);
      }
    });

    return () => {
      unsubscribeNotifications();
    };
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: tokens.bgApp }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={tokens.bgApp}
        translucent={false}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: tokens.bgApp },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="chat/index"
          options={{
            headerShown: false,
            animation: 'fade_from_bottom',
          }}
        />
        <Stack.Screen
          name="chat/[id]"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="profile/index"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
      </Stack>
      <DynamicIslandToast />
    </View>
  );
}

function RootLayout() {
  useKeepAwake();

  const [fontsLoaded, fontError] = useFonts({
    'Cinzel-Bold': Cinzel_700Bold,
    'Cinzel-ExtraBold': Cinzel_800ExtraBold,
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
  });

  const [_appReady, setAppReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // React Native AppState background/foreground focus listener for React Query
    const cleanupFocus = setupAppStateFocusRefetch();

    // Safety timeout fallback: unconditionally hide native splash within 1.2s
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setAppReady(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    }, 1200);

    if (fontsLoaded || fontError) {
      setAppReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }

    return () => {
      isMounted = false;
      cleanupFocus();
      clearTimeout(safetyTimeout);
    };
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError && !_appReady) {
    return <SpinnerLoader />;
  }

  return (
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <KeyboardProvider>
              <ToastProvider>
                <AuthProvider>
                  <ThemeProvider>
                    <ThemedAppContainer />
                  </ThemeProvider>
                </AuthProvider>
              </ToastProvider>
            </KeyboardProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </RootErrorBoundary>
  );
}

const AppRoot = process.env.EXPO_PUBLIC_SENTRY_DSN ? Sentry.wrap(RootLayout) : RootLayout;
export default AppRoot;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const errorStyles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#0B0E14',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#131722',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#242C3D',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F43F5E',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  errorBox: {
    maxHeight: 120,
    width: '100%',
    backgroundColor: '#070B14',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#242C3D',
  },
  errorText: {
    fontSize: 12,
    color: '#FB7185',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  retryButton: {
    width: '100%',
    backgroundColor: '#F43F5E',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
