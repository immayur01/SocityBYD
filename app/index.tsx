import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { SpinnerLoader } from '@/components/SpinnerLoader';
import { SkeletonLoader } from '@/components/SkeletonLoader';

export default function RootIndex() {
  const router = useRouter();
  const { user, session, loading, isAuthenticated, isProfileComplete } = useAuth();

  const isUserAuthenticated = isAuthenticated || Boolean(user || session);

  useEffect(() => {
    if (loading) return;

    if (isUserAuthenticated) {
      if (!isProfileComplete) {
        router.replace('/(auth)/complete-profile');
      } else {
        router.replace('/(tabs)/feed');
      }
    } else {
      router.replace('/(auth)/login');
    }
  }, [loading, isUserAuthenticated, isProfileComplete, router]);

  // Session-aware loader:
  // - If authenticated (or cached session exists) while hydrating: show SkeletonLoader
  // - If unauthenticated (no active session, or while checking/redirecting to auth): show SpinnerLoader
  if (isUserAuthenticated) {
    return <SkeletonLoader variant="shell" />;
  }

  return <SpinnerLoader size="small" />;
}
