import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState, AppStateStatus, Platform } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 minute fresh
      gcTime: 1000 * 60 * 10, // 10 minutes cache garbage collection
      retry: 1,
      refetchOnWindowFocus: false, // Avoid excessive refetches on mobile
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * Sync React Query focus manager with React Native AppState (background -> foreground)
 */
export function setupAppStateFocusRefetch() {
  const onAppStateChange = (status: AppStateStatus) => {
    if (Platform.OS !== 'web') {
      focusManager.setFocused(status === 'active');
    }
  };

  const subscription = AppState.addEventListener('change', onAppStateChange);
  return () => {
    subscription.remove();
  };
}
