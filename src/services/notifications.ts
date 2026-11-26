import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase, isSupabaseConfigured } from './supabase';

// Configure notification presentation when app is foregrounded
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  // Web or unsupported environments
}

export const notificationService = {
  /**
   * Request notification permissions and fetch the Expo Push Token.
   * Gracefully falls back in Expo Go, simulators, or web without crashing.
   */
  async registerForPushNotificationsAsync(userId?: string): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      // Android High-Priority Notification Channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Ashtavinayak Empire Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#059669',
        });
      }

      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      const token = tokenData?.data ?? null;

      if (token && userId && isSupabaseConfigured) {
        await this.syncPushTokenToProfile(userId, token);
      }

      return token;
    } catch (err) {
      console.warn('[notificationService] registerForPushNotificationsAsync fallback:', err);
      return null;
    }
  },

  /**
   * Upsert the user's expo_push_token in public.profiles
   */
  async syncPushTokenToProfile(userId: string, token: string): Promise<void> {
    if (!isSupabaseConfigured || !userId || !token) return;
    try {
      await supabase
        .from('profiles')
        .update({ expo_push_token: token })
        .eq('id', userId);
    } catch (err) {
      console.warn('[notificationService] Failed to sync push token to profiles:', err);
    }
  },

  /**
   * Listen to notification taps (both background/foreground and cold-start launch)
   * and invoke callback with the appropriate app route.
   */
  setupNotificationTapListener(onNavigate: (route: string) => void): () => void {
    if (Platform.OS === 'web') {
      return () => {};
    }

    const parseRouteFromData = (data?: Record<string, any>): string | null => {
      if (!data) return null;
      if (typeof data.route === 'string' && data.route.length > 0) {
        return data.route;
      }
      if (data.chatId || data.roomId) {
        return `/chat/${data.chatId || data.roomId}`;
      }
      if (data.type === 'chat') {
        return '/(tabs)/chat';
      }
      if (data.type === 'complaint' || data.complaintId) {
        return '/(tabs)/complaints';
      }
      if (data.type === 'food') {
        return '/(tabs)/food';
      }
      if (data.type === 'post' || data.postId) {
        return '/(tabs)/feed';
      }
      return null;
    };

    // 1. Foreground / Background Notification Tap Listener
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response.notification.request.content.data as Record<string, any> | undefined;
        const targetRoute = parseRouteFromData(data);
        if (targetRoute) {
          onNavigate(targetRoute);
        }
      } catch (e) {
        console.warn('[notificationService] Error processing notification tap response:', e);
      }
    });

    // 2. Cold-start Launch from Tapped Notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data as Record<string, any> | undefined;
        const targetRoute = parseRouteFromData(data);
        if (targetRoute) {
          onNavigate(targetRoute);
        }
      }
    }).catch(() => {});

    return () => {
      subscription.remove();
    };
  },

  /**
   * Schedule an instant local notification banner (e.g., in-app announcements)
   */
  async sendLocalAlert(title: string, body: string, data?: Record<string, any>) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
        },
        trigger: null, // immediate delivery
      });
    } catch {
      // Fallback in unsupported environments
    }
  },
};
