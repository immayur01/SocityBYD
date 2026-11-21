import { supabase, isSupabaseConfigured } from './supabase';
import { UserProfile, WingCode } from '@/types';
import { CURRENT_USER } from './mockData';
import * as SecureStore from 'expo-secure-store';

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
let activeUser: UserProfile | null = CURRENT_USER;

export const authService = {
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
    return activeUser;
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

  async signInWithEmail(email: string, _password: string, remember: boolean): Promise<UserProfile> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: _password });
      if (error) throw new Error(error.message);
      if (data.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        const user = profile || { ...CURRENT_USER, email };
        if (remember) await this.persistSession(user);
        return user;
      }
    }

    // Mock response
    const user: UserProfile = {
      ...CURRENT_USER,
      email,
    };
    if (remember) await this.persistSession(user);
    return user;
  },

  async signInWithPhone(phone: string, _password: string, remember: boolean): Promise<UserProfile> {
    const formatted = phone.startsWith('+91') ? phone : `+91 ${phone}`;
    const user: UserProfile = {
      ...CURRENT_USER,
      phone: formatted,
    };
    if (remember) await this.persistSession(user);
    return user;
  },

  async signInWithGoogle(): Promise<UserProfile> {
    const user: UserProfile = {
      ...CURRENT_USER,
      full_name: 'Mayur Patil (Google)',
      email: 'mayur.google@ashtavinayak.org',
    };
    await this.persistSession(user);
    return user;
  },

  async requestRegistrationOtp(data: SignUpData): Promise<{ phone: string; otpHint: string }> {
    // In production, triggers Supabase auth.signInWithOtp or SMS gateway
    return {
      phone: data.phone.startsWith('+91') ? data.phone : `+91 ${data.phone}`,
      otpHint: '123456',
    };
  },

  async verifyOtpAndRegister(data: SignUpData, otp: string): Promise<UserProfile> {
    if (otp !== '123456' && otp.length !== 6) {
      throw new Error('Invalid OTP code. Please enter 123456 (demo code) or request a new code.');
    }

    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      full_name: data.full_name,
      wing: data.wing,
      flat_number: data.flat_number,
      phone: data.phone.startsWith('+91') ? data.phone : `+91 ${data.phone}`,
      email: data.email,
      role: 'resident',
      bio: `Resident of ${data.wing}, Flat ${data.flat_number}`,
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      await supabase.from('profiles').upsert(newUser);
    }

    await this.persistSession(newUser);
    return newUser;
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    await this.persistSession(null);
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    if (!activeUser) throw new Error('No user currently logged in');
    const updated = { ...activeUser, ...updates };
    activeUser = updated;
    await this.persistSession(updated);
    if (isSupabaseConfigured) {
      await supabase.from('profiles').update(updates).eq('id', updated.id);
    }
    return updated;
  },
};
