import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ShieldCheck, RotateCw, X } from 'lucide-react-native';
import { GlassCard } from '@/components/GlassCard';
import { OtpInput } from '@/components/OtpInput';
import { useAuth } from '@/context/AuthContext';
import { island } from '@/context/IslandContext';
import { useTheme } from '@/context/ThemeContext';
import { SignUpData } from '@/services/auth';
import { isSupabaseConfigured } from '@/services/supabase';
import * as Haptics from 'expo-haptics';

export default function OtpVerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ signUpData?: string; targetEmail?: string; targetPhone?: string }>();
  const { verifyEmailOtp, resendSignUpOtp, verifyPhoneOtp, requestPhoneOtp } = useAuth();
  const { tokens, isDark } = useTheme();

  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(30);

  const signUpData: SignUpData | null = params.signUpData
    ? JSON.parse(params.signUpData)
    : null;

  const targetEmail = params.targetEmail || signUpData?.email || '';
  const displayTarget = targetEmail || (params.targetPhone ? `+91 ${params.targetPhone}` : 'your email');

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleVerify = async () => {
    if (submitting) return;

    if (otp.length !== 6) {
      island.error('Validation Error', 'Please enter all 6 digits of the verification code.');
      return;
    }

    try {
      setSubmitting(true);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }

      if (targetEmail && signUpData) {
        await verifyEmailOtp(targetEmail, otp, signUpData);
        router.replace('/(tabs)/feed');
        return;
      }

      // Backward compatible phone flow fallback
      const rawPhone = params.targetPhone || signUpData?.phone || '';
      const cleanPhone = rawPhone.replace(/[^0-9]/g, '').slice(-10);
      const { isNewOrIncomplete } = await verifyPhoneOtp(cleanPhone, otp, signUpData || undefined);

      if (isNewOrIncomplete) {
        router.replace('/(auth)/complete-profile');
      } else {
        router.replace('/(tabs)/feed');
      }
    } catch (err: any) {
      island.error('Verification Failed', err?.message || 'Invalid or expired OTP code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setCooldown(30);

    try {
      if (targetEmail) {
        await resendSignUpOtp(targetEmail);
        island.info('Code Resent', `A fresh 6-digit confirmation code has been sent to ${targetEmail}`);
      } else if (params.targetPhone) {
        const cleanPhone = params.targetPhone.replace(/[^0-9]/g, '').slice(-10);
        await requestPhoneOtp(cleanPhone);
        island.info('Code Resent', `A fresh 6-digit SMS verification code has been sent to ${displayTarget}`);
      }
    } catch (err: any) {
      island.error('Resend Failed', err.message || 'Could not resend verification code.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: tokens.bgApp }]}>
      <View style={styles.content}>
        {/* Cancel Button */}
        <TouchableOpacity
          style={[
            styles.cancelBtn,
            {
              backgroundColor: isDark ? '#141414' : '#F4F4F5',
              borderColor: tokens.borderSubtle,
            },
          ]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <X size={16} strokeWidth={1.5} color={tokens.textSecondary} />
        </TouchableOpacity>

        <GlassCard style={styles.card}>
          {/* Header Icon */}
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: isDark ? '#1C1C1C' : '#F4F4F5',
                borderColor: tokens.borderSubtle,
              },
            ]}
          >
            <ShieldCheck size={20} strokeWidth={1.5} color={tokens.textPrimary} />
          </View>

          <Text style={[styles.title, { color: tokens.textPrimary }]}>
            Verify Account
          </Text>
          <Text style={[styles.subtitle, { color: tokens.textSecondary }]}>
            Enter the 6-digit confirmation code sent to{' '}
            <Text style={{ color: tokens.textPrimary, fontWeight: '500' }}>
              {displayTarget}
            </Text>
          </Text>

          {/* Demo / Email Hint Banner */}
          <View
            style={[
              styles.demoHintBanner,
              {
                backgroundColor: isDark ? '#161616' : '#F4F4F5',
                borderColor: tokens.borderSubtle,
              },
            ]}
          >
            <Text style={[styles.demoHintText, { color: tokens.textMuted }]}>
              {isSupabaseConfigured
                ? (targetEmail ? 'Check your email inbox or spam folder for the code' : 'Check your phone SMS for the 6-digit code')
                : 'Demo mode code: 123456'}
            </Text>
          </View>

          {/* 6 Individual Numeric OTP Boxes */}
          <OtpInput value={otp} onChange={setOtp} length={6} />

          {/* Verify & Register Primary CTA */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              { backgroundColor: isDark ? '#F5F5F5' : '#111111' },
            ]}
            onPress={handleVerify}
            activeOpacity={0.85}
            disabled={submitting}
          >
            <Text
              style={[
                styles.verifyText,
                { color: isDark ? '#000000' : '#FFFFFF' },
              ]}
            >
              {submitting ? 'Verifying code...' : 'Verify and register'}
            </Text>
          </TouchableOpacity>

          {/* Resend Code with Cooldown Timer */}
          <View style={styles.resendContainer}>
            {cooldown > 0 ? (
              <Text style={[styles.cooldownText, { color: tokens.textMuted }]}>
                Resend code in {cooldown}s
              </Text>
            ) : (
              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleResend}
                activeOpacity={0.7}
              >
                <RotateCw size={14} strokeWidth={1.5} color={tokens.textPrimary} />
                <Text style={[styles.resendText, { color: tokens.textPrimary }]}>
                  Resend code
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </GlassCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 20,
  },
  cancelBtn: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  card: {
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: -8,
  },
  demoHintBanner: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  demoHintText: {
    fontSize: 11,
    fontWeight: '500',
  },
  verifyButton: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resendContainer: {
    alignItems: 'center',
  },
  cooldownText: {
    fontSize: 12,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 6,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
