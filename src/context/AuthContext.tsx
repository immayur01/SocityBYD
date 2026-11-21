import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import { authService, SignUpData } from '@/services/auth';
import { useToast } from './ToastContext';

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  signInWithEmail: (email: string, pass: string, remember: boolean) => Promise<void>;
  signInWithPhone: (phone: string, pass: string, remember: boolean) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  requestRegistrationOtp: (data: SignUpData) => Promise<{ phone: string; otpHint: string }>;
  verifyOtpAndRegister: (data: SignUpData, otp: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  useEffect(() => {
    // Check initial stored session
    authService
      .getStoredSession()
      .then((stored) => {
        setUser(stored);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const signInWithEmail = async (email: string, pass: string, remember: boolean) => {
    try {
      const loggedIn = await authService.signInWithEmail(email, pass, remember);
      setUser(loggedIn);
      showToast('Welcome back!', `Signed in as ${loggedIn.full_name}`, 'success');
    } catch (err: any) {
      showToast('Authentication Failed', err.message || 'Please check your email and password.', 'error');
      throw err;
    }
  };

  const signInWithPhone = async (phone: string, pass: string, remember: boolean) => {
    try {
      const loggedIn = await authService.signInWithPhone(phone, pass, remember);
      setUser(loggedIn);
      showToast('Welcome back!', `Signed in to ${loggedIn.wing} - Flat ${loggedIn.flat_number}`, 'success');
    } catch (err: any) {
      showToast('Login Error', err.message || 'Failed to sign in with phone number.', 'error');
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const loggedIn = await authService.signInWithGoogle();
      setUser(loggedIn);
      showToast('Google Sign-In', `Signed in as ${loggedIn.full_name}`, 'success');
    } catch (err: any) {
      showToast('Google Sign-In Failed', err.message || 'Failed to connect with Google.', 'error');
      throw err;
    }
  };

  const requestRegistrationOtp = async (data: SignUpData) => {
    try {
      const res = await authService.requestRegistrationOtp(data);
      showToast('OTP Code Sent', `A 6-digit verification code has been sent to ${res.phone}`, 'info');
      return res;
    } catch (err: any) {
      showToast('Registration Error', err.message || 'Could not send verification code.', 'error');
      throw err;
    }
  };

  const verifyOtpAndRegister = async (data: SignUpData, otp: string) => {
    try {
      const newUser = await authService.verifyOtpAndRegister(data, otp);
      setUser(newUser);
      showToast('Registration Successful!', `Welcome to Ashtavinayak Empire, ${newUser.full_name}!`, 'success');
    } catch (err: any) {
      showToast('Verification Failed', err.message || 'Incorrect OTP code.', 'error');
      throw err;
    }
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    showToast('Signed Out', 'You have been safely signed out.', 'info');
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const updated = await authService.updateProfile(updates);
      setUser(updated);
      showToast('Profile Updated', 'Your resident profile has been saved successfully.', 'success');
    } catch (err: any) {
      showToast('Update Failed', err.message || 'Could not update profile.', 'error');
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signInWithPhone,
        signInWithGoogle,
        requestRegistrationOtp,
        verifyOtpAndRegister,
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
