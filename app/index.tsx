import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '@/services/auth';

export default function RootIndex() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await authService.getStoredSession();
        if (!mounted) return;
        if (stored) {
          router.replace('/(tabs)/feed');
        } else {
          router.replace('/(auth)/login');
        }
      } catch {
        if (!mounted) return;
        router.replace('/(auth)/login');
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070B14',
  },
});
