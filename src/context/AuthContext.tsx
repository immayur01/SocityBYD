import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { UserProfile, WingCode, ResidentType } from '@/types';
import { authService, SignUpData } from '@/services/auth';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { notificationService } from '@/services/notifications';
import { queryClient } from '@/lib/queryClient';
import { useToast } from './ToastContext';
import * as Linking from 'expo-linking';
import { ensureUserKeyPair } from '@/lib/e2ee';

interface AuthContextValue {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  signInWithEmail: (email: string, pass: string, remember: boolean) => Promise<void>;
  signUpWithEmail: (data: SignUpData, pass: string) => Promise<void>;
  verifyEmailOtp: (email: string, otp: string, signUpData: SignUpData) => Promise<void>;
  resendSignUpOtp: (email: string) => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<void>;
  signInWithPhone: (phone: string, pass: string, remember: boolean) => Promise<void>;
  signInWithGoogle: () => Promise<{ isNewOrIncomplete: boolean; resultUrl?: string }>;
  requestPhoneOtp: (phone: string) => Promise<{ phone: string; otpHint: string }>;
  requestRegistrationOtp: (data: SignUpData) => Promise<{ phone: string; otpHint: string }>;
  verifyPhoneOtp: (phone: string, otp: string, signUpData?: SignUpData) => Promise<{ isNewOrIncomplete: boolean }>;
  verifyOtpAndRegister: (data: SignUpData, otp: string) => Promise<void>;
  completeProfile: (data: { full_name: string; wing: WingCode; flat_number: string; phone: string; resident_type?: ResidentType; email?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => authService.getActiveUser());
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  const isAuthenticated = isSupabaseConfigured
    ? Boolean(user && session)
    : Boolean(user || session || authService.hasCachedSessionSync());
  const isProfileComplete = Boolean(
    user &&
    user.full_name && user.full_name.trim().length > 0 &&
    user.phone && user.phone.trim().length > 0 &&
    user.wing && user.wing.trim().length > 0 &&
    user.flat_number && user.flat_number.trim().length > 0
  );

  // 1. Deep link listener for OAuth redirects
  useEffect(() => {
    const handleDeepLink = async ({ url }: { url: string }) => {
      if (!url) return;
      if (url.includes('auth/callback') || url.includes('access_token=') || url.includes('code=')) {
        try {
          if (url.includes('code=')) {
            const parsed = Linking.parse(url);
            const code = parsed.queryParams?.code;
            const codeStr = Array.isArray(code) ? code[0] : code;
            if (typeof codeStr === 'string' && codeStr.length > 0) {
              await supabase.auth.exchangeCodeForSession(codeStr);
            }
          } else if (url.includes('access_token=') || url.includes('#')) {
            const hash = url.split('#')[1] || url.split('?')[1] || '';
            const params = new URLSearchParams(hash);
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');
            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token });
            }
          }
        } catch (err) {
          console.warn('[AuthContext] Deep link session error:', err);
        }
      }
    };

    const linkSub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      linkSub.remove();
    };
  }, []);

  // 2. Initial session hydration
  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      try {
        if (isSupabaseConfigured) {
          const { data } = await supabase.auth.getSession();
          if (data?.session && isMounted) {
            setSession(data.session);
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.session.user.id)
              .single();

            if (profile && isMounted) {
              setUser(profile);
              await authService.persistSession(profile);
              notificationService.registerForPushNotificationsAsync(profile.id).catch(() => {});
              ensureUserKeyPair(profile.id).catch(() => {});
            }
          } else if (isMounted) {
            setSession(null);
            setUser(null);
            await authService.persistSession(null);
          }
          return;
        }

        const stored = await authService.getStoredSession();
        if (isMounted && stored) {
          setUser(stored);
          notificationService.registerForPushNotificationsAsync(stored.id).catch(() => {});
          if (!session) {
            setSession({
              access_token: 'stored-session-token',
              token_type: 'bearer',
              expires_in: 3600,
              refresh_token: 'stored-session-refresh',
              user: {
                id: stored.id,
                app_metadata: {},
                user_metadata: {},
                aud: 'authenticated',
                created_at: stored.created_at || new Date().toISOString(),
              },
            } as Session);
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Session init error:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initSession();

    // 3. Supabase onAuthStateChange listener
    let authListener: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, currentSession) => {
          if (!isMounted) return;
          setSession(currentSession);

          if (currentSession?.user) {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', currentSession.user.id)
              .single();

            if (existingProfile) {
              if (isMounted) setUser(existingProfile);
              await authService.persistSession(existingProfile);
              notificationService.registerForPushNotificationsAsync(existingProfile.id).catch(() => {});
              ensureUserKeyPair(existingProfile.id).catch(() => {});
            } else {
              // Create partial profile from session metadata
              const meta = currentSession.user.user_metadata || {};
              const partialProfile: UserProfile = {
                id: currentSession.user.id,
                full_name: meta.full_name || meta.name || currentSession.user.email?.split('@')[0] || 'Resident',
                wing: meta.wing || 'Wing B',
                flat_number: meta.flat_number || '',
                phone: currentSession.user.phone || meta.phone || '',
                email: currentSession.user.email || '',
                role: 'resident',
                bio: 'Resident of Ashtavinayak Empire',
                avatar_url: meta.avatar_url || meta.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                created_at: new Date().toISOString(),
              };

              if (isMounted) setUser(partialProfile);
              await authService.persistSession(partialProfile);
              notificationService.registerForPushNotificationsAsync(partialProfile.id).catch(() => {});
            }
          } else if (event === 'SIGNED_OUT' || !currentSession) {
            if (isMounted) {
              setUser(null);
              setSession(null);
            }
            await authService.persistSession(null);
          }
        }
      );
      authListener = subscription;
    }

    return () => {
      isMounted = false;
      if (authListener) authListener.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, pass: string, remember: boolean) => {
    try {
      const loggedIn = await authService.signInWithEmail(email, pass, remember);
      setUser(loggedIn);
      setSession({
        access_token: 'session-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'session-refresh',
        user: {
          id: loggedIn.id,
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: loggedIn.created_at || new Date().toISOString(),
        },
      } as Session);
      showToast('Welcome back!', `Signed in as ${loggedIn.full_name}`, 'success');
    } catch (err: any) {
      showToast('Authentication Failed', err.message || 'Please check your email and password.', 'error');
      throw err;
    }
  };

  const signUpWithEmail = async (data: SignUpData, pass: string) => {
    try {
      await authService.signUpWithEmail(data, pass);
      showToast('Verification Code Sent', `A 6-digit confirmation code was sent to ${data.email}`, 'info');
    } catch (err: any) {
      showToast('Registration Error', err.message || 'Failed to create account.', 'error');
      throw err;
    }
  };

  const verifyEmailOtp = async (email: string, otp: string, signUpData: SignUpData) => {
    try {
      const newUser = await authService.verifyEmailOtp(email, otp, signUpData);
      setUser(newUser);
      if (isSupabaseConfigured) {
        const { data: s } = await supabase.auth.getSession();
        if (s?.session) setSession(s.session);
      } else {
        setSession({
          access_token: 'session-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'session-refresh',
          user: {
            id: newUser.id,
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: newUser.created_at || new Date().toISOString(),
          },
        } as Session);
      }
      showToast('Account Verified!', `Welcome to Ashtavinayak Empire, ${newUser.full_name}!`, 'success');
    } catch (err: any) {
      showToast('Verification Failed', err.message || 'Incorrect verification code.', 'error');
      throw err;
    }
  };

  const resendSignUpOtp = async (email: string) => {
    try {
      await authService.resendSignUpOtp(email);
      showToast('Code Resent', `A fresh 6-digit verification code was sent to ${email}`, 'info');
    } catch (err: any) {
      showToast('Resend Failed', err.message || 'Could not resend verification code.', 'error');
      throw err;
    }
  };

  const resetPasswordForEmail = async (email: string) => {
    try {
      await authService.resetPasswordForEmail(email);
      showToast('Reset Link Dispatched', `Password reset instructions sent to ${email}`, 'success');
    } catch (err: any) {
      showToast('Reset Failed', err.message || 'Could not send reset email.', 'error');
      throw err;
    }
  };

  const signInWithPhone = async (phone: string, pass: string, remember: boolean) => {
    try {
      const loggedIn = await authService.signInWithPhone(phone, pass, remember);
      setUser(loggedIn);
      setSession({
        access_token: 'session-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'session-refresh',
        user: {
          id: loggedIn.id,
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: loggedIn.created_at || new Date().toISOString(),
        },
      } as Session);
      showToast('Welcome back!', `Signed in to ${loggedIn.wing} - Flat ${loggedIn.flat_number}`, 'success');
    } catch (err: any) {
      showToast('Login Error', err.message || 'Failed to sign in with phone number.', 'error');
      throw err;
    }
  };

  const signInWithGoogle = async (): Promise<{ isNewOrIncomplete: boolean; resultUrl?: string }> => {
    try {
      const { user: authedUser, isNewOrIncomplete, resultUrl } = await authService.signInWithGoogle();
      setUser(authedUser);
      if (isSupabaseConfigured) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          setSession(sessionData.session);
        }
      } else {
        setSession({
          access_token: 'session-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'session-refresh',
          user: {
            id: authedUser.id,
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: authedUser.created_at || new Date().toISOString(),
          },
        } as Session);
      }

      if (!isNewOrIncomplete) {
        showToast('Google Sign In', `Welcome back, ${authedUser.full_name}!`, 'success');
      }
      return { isNewOrIncomplete, resultUrl };
    } catch (err: any) {
      showToast('OAuth Error', err.message || 'Google Sign-In was cancelled or failed.', 'error');
      throw err;
    }
  };

  const requestPhoneOtp = async (phone: string) => {
    try {
      const res = await authService.requestPhoneOtp(phone);
      showToast('OTP Dispatched', `SMS code sent to ${res.phone} (${res.otpHint})`, 'info');
      return res;
    } catch (err: any) {
      showToast('OTP Error', err.message || 'Could not send verification code.', 'error');
      throw err;
    }
  };

  const requestRegistrationOtp = async (data: SignUpData) => {
    try {
      const res = await authService.requestRegistrationOtp(data);
      showToast('OTP Dispatched', `Verification code sent to ${res.phone} (${res.otpHint})`, 'info');
      return res;
    } catch (err: any) {
      showToast('OTP Error', err.message || 'Could not send verification code.', 'error');
      throw err;
    }
  };

  const verifyPhoneOtp = async (
    phone: string,
    otp: string,
    signUpData?: SignUpData
  ): Promise<{ isNewOrIncomplete: boolean }> => {
    try {
      const { user: authedUser, isNewOrIncomplete } = await authService.verifyPhoneOtp(phone, otp, signUpData);
      setUser(authedUser);
      setSession({
        access_token: 'session-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'session-refresh',
        user: {
          id: authedUser.id,
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: authedUser.created_at || new Date().toISOString(),
        },
      } as Session);

      showToast('Phone Verified!', `Welcome, ${authedUser.full_name}!`, 'success');
      return { isNewOrIncomplete };
    } catch (err: any) {
      showToast('Verification Failed', err.message || 'Incorrect verification code.', 'error');
      throw err;
    }
  };

  const verifyOtpAndRegister = async (data: SignUpData, otp: string) => {
    await verifyPhoneOtp(data.phone, otp, data);
  };

  const completeProfile = async (data: {
    full_name: string;
    wing: WingCode;
    flat_number: string;
    phone: string;
    resident_type?: ResidentType;
    email?: string;
  }) => {
    try {
      const updated = await authService.completeProfile(data);
      setUser(updated);
      showToast('Profile Completed!', `Welcome to Ashtavinayak Empire, ${updated.full_name}!`, 'success');
    } catch (err: any) {
      showToast('Setup Failed', err.message || 'Could not complete profile.', 'error');
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
      setUser(null);
      setSession(null);
      queryClient.clear();
      showToast('Signed Out', 'You have been securely signed out.', 'info');
    } catch (err: any) {
      showToast('Error', err.message || 'Could not sign out.', 'error');
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const updated = await authService.updateProfile(updates);
      setUser(updated);
      showToast('Profile Updated', 'Your profile details have been saved.', 'success');
    } catch (err: any) {
      showToast('Update Failed', err.message || 'Could not save profile.', 'error');
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthenticated,
        isProfileComplete,
        signInWithEmail,
        signUpWithEmail,
        verifyEmailOtp,
        resendSignUpOtp,
        resetPasswordForEmail,
        signInWithPhone,
        signInWithGoogle,
        requestPhoneOtp,
        requestRegistrationOtp,
        verifyPhoneOtp,
        verifyOtpAndRegister,
        completeProfile,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
