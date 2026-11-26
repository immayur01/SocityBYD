import { supabase, isSupabaseConfigured } from './supabase';
import { UserProfile, WingCode } from '@/types';
import { CURRENT_USER } from './mockData';
import * as SecureStore from 'expo-secure-store';
import { uploadMediaToR2 } from './storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

const SESSION_KEY = 'ashtavinayak_session_user';

export interface SignUpData {
  full_name: string;
  wing: WingCode;
  flat_number: string;
  phone: string;
  email: string;
  password?: string;
}

// In-memory session holder
let activeUser: UserProfile | null = null;

/**
 * Cleanly format Indian numbers as +91${10digits}
 */
export function formatIndianPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return phone.startsWith('+') ? phone : `+91${digits}`;
}

/**
 * Helper to get active authenticated user ID (never returns mock 'usr-current-1' on live Supabase)
 */
export async function getAuthenticatedUserId(): Promise<string> {
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) return data.user.id;
    } catch {
      // fallback
    }
  }
  const current = authService.getActiveUser();
  if (current?.id) return current.id;
  return isSupabaseConfigured ? '' : CURRENT_USER.id;
}

export const authService = {
  getActiveUser(): UserProfile | null {
    if (!activeUser && !isSupabaseConfigured) {
      return CURRENT_USER;
    }
    return activeUser;
  },

  hasCachedSessionSync(): boolean {
    if (!isSupabaseConfigured) return true;
    return activeUser !== null;
  },

  async hasCachedSession(): Promise<boolean> {
    if (activeUser) return true;
    if (!isSupabaseConfigured) return true;
    try {
      const stored = await SecureStore.getItemAsync(SESSION_KEY);
      return Boolean(stored);
    } catch {
      return false;
    }
  },

  async getStoredSession(): Promise<UserProfile | null> {
    try {
      const stored = await SecureStore.getItemAsync(SESSION_KEY);
      if (stored) {
        activeUser = JSON.parse(stored);
        return activeUser;
      }
    } catch {
      // fallback to active user
    }
    if (isSupabaseConfigured) {
      return null;
    }
    return activeUser || CURRENT_USER;
  },

  async persistSession(user: UserProfile | null) {
    activeUser = user;
    if (user) {
      try {
        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(user));
      } catch {
        // storage ignored
      }
    } else {
      try {
        await SecureStore.deleteItemAsync(SESSION_KEY);
      } catch {
        // storage ignored
      }
    }
  },

  /**
   * Sign In with Email and Password
   */
  async signInWithEmail(email: string, _password: string, remember: boolean): Promise<UserProfile> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: _password });
      if (error) throw new Error(error.message);
      if (data.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        const user = profile || {
          ...CURRENT_USER,
          id: data.user.id,
          email,
        };
        if (remember) await this.persistSession(user);
        return user;
      }
    }

    // Demo/offline fallback response
    const user: UserProfile = {
      ...CURRENT_USER,
      email,
    };
    if (remember) await this.persistSession(user);
    return user;
  },

  /**
   * Sign Up with Email and Password
   */
  async signUpWithEmail(data: SignUpData, password: string): Promise<UserProfile> {
    const formattedPhone = formatIndianPhone(data.phone);

    if (isSupabaseConfigured) {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password,
        options: {
          data: {
            full_name: data.full_name,
            wing: data.wing,
            flat_number: data.flat_number,
            phone: formattedPhone,
          },
        },
      });

      if (error) throw new Error(error.message);

      const userId = authData.user?.id || `usr-${Date.now()}`;
      const newProfile: UserProfile = {
        id: userId,
        full_name: data.full_name,
        wing: data.wing,
        flat_number: data.flat_number,
        phone: formattedPhone,
        email: data.email,
        role: 'resident',
        bio: `Resident of ${data.wing}, Flat ${data.flat_number}`,
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        created_at: new Date().toISOString(),
      };

      await supabase.from('profiles').upsert(newProfile);
      await this.persistSession(newProfile);
      return newProfile;
    }

    // Demo fallback
    const newProfile: UserProfile = {
      id: `usr-${Date.now()}`,
      full_name: data.full_name,
      wing: data.wing,
      flat_number: data.flat_number,
      phone: formattedPhone,
      email: data.email,
      role: 'resident',
      bio: `Resident of ${data.wing}, Flat ${data.flat_number}`,
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString(),
    };
    await this.persistSession(newProfile);
    return newProfile;
  },

  /**
   * Sign In with Phone & Password (or triggers OTP)
   */
  async signInWithPhone(phone: string, _password: string, remember: boolean): Promise<UserProfile> {
    const formatted = formatIndianPhone(phone);

    if (isSupabaseConfigured) {
      await this.requestPhoneOtp(phone);
      throw new Error('OTP_REQUIRED');
    }

    const user: UserProfile = {
      ...CURRENT_USER,
      phone: formatted,
    };
    if (remember) await this.persistSession(user);
    return user;
  },

  /**
   * Google OAuth sign-in using WebBrowser & Deep-Link redirect (ashtavinayak://auth/callback)
   */
  async signInWithGoogle(): Promise<{ user: UserProfile; isNewOrIncomplete: boolean }> {
    if (isSupabaseConfigured) {
      const redirectUrl = 'ashtavinayak://auth/callback';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.url) throw new Error('No authorization URL returned from Supabase OAuth.');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type !== 'success' || !result.url) {
        throw new Error('Google Sign-In was cancelled or failed.');
      }

      // Parse the returned URL (handles both PKCE query code and hash tokens)
      const url = result.url;
      if (url.includes('code=')) {
        const parsed = Linking.parse(url);
        const code = parsed.queryParams?.code;
        if (typeof code === 'string') {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw new Error(exchangeError.message);
        }
      } else if (url.includes('access_token=') || url.includes('#')) {
        const hash = url.split('#')[1] || url.split('?')[1] || '';
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (sessionError) throw new Error(sessionError.message);
        }
      }

      // Retrieve user from current active session
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error('Failed to retrieve user after Google sign-in.');
      }

      const authUser = userData.user;

      // Check whether profile already has wing & flat number filled
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (existingProfile && existingProfile.wing && existingProfile.flat_number) {
        await this.persistSession(existingProfile);
        return { user: existingProfile, isNewOrIncomplete: false };
      }

      // Profile is missing or incomplete - mark as incomplete so user is routed to onboarding
      const meta = authUser.user_metadata || {};
      const partialProfile: UserProfile = {
        id: authUser.id,
        full_name: existingProfile?.full_name || meta.full_name || meta.name || authUser.email?.split('@')[0] || 'Resident',
        wing: existingProfile?.wing || 'Wing B',
        flat_number: existingProfile?.flat_number || '',
        phone: existingProfile?.phone || authUser.phone || '',
        email: authUser.email || existingProfile?.email || '',
        role: existingProfile?.role || 'resident',
        bio: existingProfile?.bio || 'Resident of Ashtavinayak Empire',
        avatar_url: existingProfile?.avatar_url || meta.avatar_url || meta.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        created_at: existingProfile?.created_at || new Date().toISOString(),
      };

      await this.persistSession(partialProfile);
      return { user: partialProfile, isNewOrIncomplete: true };
    }

    // Demo fallback when isSupabaseConfigured is false
    const demoUser: UserProfile = {
      ...CURRENT_USER,
      full_name: 'Mayur Patil (Google)',
      email: 'mayur.google@ashtavinayak.org',
    };
    await this.persistSession(demoUser);
    return { user: demoUser, isNewOrIncomplete: false };
  },

  /**
   * Request Phone SMS OTP (for Sign In or Registration)
   */
  async requestPhoneOtp(phone: string): Promise<{ phone: string; otpHint: string }> {
    const formattedPhone = formatIndianPhone(phone);

    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });
      if (error) throw new Error(error.message);
      return { phone: formattedPhone, otpHint: 'SMS Sent' };
    }

    return {
      phone: formattedPhone,
      otpHint: '123456 (Dev Demo Code)',
    };
  },

  /**
   * Request Registration Phone OTP (backward compatible)
   */
  async requestRegistrationOtp(data: SignUpData): Promise<{ phone: string; otpHint: string }> {
    const formattedPhone = formatIndianPhone(data.phone);

    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          data: {
            full_name: data.full_name,
            wing: data.wing,
            flat_number: data.flat_number,
          },
        },
      });
      if (error) throw new Error(error.message);
      return { phone: formattedPhone, otpHint: 'SMS Sent' };
    }

    return {
      phone: formattedPhone,
      otpHint: '123456 (Dev Demo Code)',
    };
  },

  /**
   * Verify Phone OTP and handle registration/sign-in
   */
  async verifyPhoneOtp(
    phone: string,
    otp: string,
    signUpData?: SignUpData
  ): Promise<{ user: UserProfile; isNewOrIncomplete: boolean }> {
    const formattedPhone = formatIndianPhone(phone);

    if (isSupabaseConfigured) {
      const { data: authRes, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: 'sms',
      });

      if (error) {
        throw new Error(error.message);
      }

      const userId = authRes.user?.id;
      if (!userId) throw new Error('Verification succeeded but user session could not be established.');

      // If signUpData was passed, upsert full resident profile
      if (signUpData) {
        const fullProfile: UserProfile = {
          id: userId,
          full_name: signUpData.full_name,
          wing: signUpData.wing,
          flat_number: signUpData.flat_number,
          phone: formattedPhone,
          email: signUpData.email,
          role: 'resident',
          bio: `Resident of ${signUpData.wing}, Flat ${signUpData.flat_number}`,
          avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          created_at: new Date().toISOString(),
        };

        const { error: upsertErr } = await supabase.from('profiles').upsert(fullProfile);
        if (upsertErr) throw new Error(upsertErr.message);

        await this.persistSession(fullProfile);
        return { user: fullProfile, isNewOrIncomplete: false };
      }

      // Existing phone sign-in: retrieve profile
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (existingProfile && existingProfile.wing && existingProfile.flat_number) {
        await this.persistSession(existingProfile);
        return { user: existingProfile, isNewOrIncomplete: false };
      }

      // Profile is incomplete
      const partialProfile: UserProfile = {
        id: userId,
        full_name: existingProfile?.full_name || 'Resident',
        wing: existingProfile?.wing || 'Wing B',
        flat_number: existingProfile?.flat_number || '',
        phone: formattedPhone,
        email: existingProfile?.email || '',
        role: existingProfile?.role || 'resident',
        bio: existingProfile?.bio || 'Resident of Ashtavinayak Empire',
        avatar_url: existingProfile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        created_at: existingProfile?.created_at || new Date().toISOString(),
      };

      await this.persistSession(partialProfile);
      return { user: partialProfile, isNewOrIncomplete: true };
    }

    // Demo / Offline fallback: only allowed when isSupabaseConfigured is FALSE
    if (otp !== '123456' && otp.length !== 6) {
      throw new Error('Invalid OTP code. In demo mode, enter 123456.');
    }

    const demoProfile: UserProfile = {
      id: `usr-${Date.now()}`,
      full_name: signUpData?.full_name || 'Mayur Patil',
      wing: signUpData?.wing || 'Wing B',
      flat_number: signUpData?.flat_number || '402',
      phone: formattedPhone,
      email: signUpData?.email || 'demo@ashtavinayak.org',
      role: 'resident',
      bio: 'Proud resident of Ashtavinayak Empire',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString(),
    };

    await this.persistSession(demoProfile);
    return { user: demoProfile, isNewOrIncomplete: false };
  },

  /**
   * Complete flat details for onboarding (e.g. after Google OAuth or first phone sign-in)
   */
  async completeProfile(data: {
    full_name: string;
    wing: WingCode;
    flat_number: string;
    phone: string;
    email?: string;
  }): Promise<UserProfile> {
    const current = activeUser || (await this.getStoredSession());
    if (!current) throw new Error('No active authenticated user.');

    const formattedPhone = formatIndianPhone(data.phone);
    const updated: UserProfile = {
      ...current,
      full_name: data.full_name.trim(),
      wing: data.wing,
      flat_number: data.flat_number.trim(),
      phone: formattedPhone,
      email: data.email?.trim() || current.email,
      bio: `Resident of ${data.wing}, Flat ${data.flat_number.trim()}`,
    };

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('profiles').upsert(updated);
      if (error) throw new Error(error.message);
    }

    await this.persistSession(updated);
    return updated;
  },

  // Backward compatibility alias
  async verifyOtpAndRegister(data: SignUpData, otp: string): Promise<UserProfile> {
    const { user } = await this.verifyPhoneOtp(data.phone, otp, data);
    return user;
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    await this.persistSession(null);
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    if (!activeUser) throw new Error('No user currently logged in');
    let finalUpdates = { ...updates };
    if (updates.avatar_url && !updates.avatar_url.startsWith('http')) {
      finalUpdates.avatar_url = await uploadMediaToR2(updates.avatar_url, 'avatars', 'image/jpeg');
    }
    const updated = { ...activeUser, ...finalUpdates };
    activeUser = updated;
    await this.persistSession(updated);
    if (isSupabaseConfigured) {
      await supabase.from('profiles').update(finalUpdates).eq('id', updated.id);
    }
    return updated;
  },
};
