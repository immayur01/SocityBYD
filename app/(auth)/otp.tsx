import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck, RotateCw, X } from 'lucide-react-native';
import { GlassCard } from '@/components/GlassCard';
import { OtpInput } from '@/components/OtpInput';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { SignUpData } from '@/services/auth';
import * as Haptics from 'expo-haptics';

export default function OtpVerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ signUpData?: string; targetPhone?: string }>();
  const { verifyOtpAndRegister } = useAuth();
  const { showToast } = useToast();

  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(30);

  const signUpData: SignUpData | null = params.signUpData
    ? JSON.parse(params.signUpData)
    : null;

  const displayPhone = params.targetPhone
    ? `+91 ${params.targetPhone}`
    : signUpData?.phone || '+91 98765 43210';

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
      showToast('Validation Error', 'Please enter all 6 digits of the verification code.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (signUpData) {
        await verifyOtpAndRegister(signUpData, otp);
      }
      router.replace('/(tabs)/feed');
    } catch {
      // toast shown in context
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setCooldown(30);
    showToast('Code Resent', `A fresh 6-digit code has been sent to ${displayPhone}`, 'info');
  };

  return (
    <LinearGradient
      colors={['#0D1120', '#13122B', '#090D16']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Close / Cancel Button */}
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <X size={20} color="#94a3b8" />
        </TouchableOpacity>

        <GlassCard style={styles.card}>
          {/* Header Icon */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#7c3aed', '#ec4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconBadge}
            >
              <ShieldCheck size={28} color="#ffffff" />
            </LinearGradient>
          </View>

          <Text style={styles.title}>Verify Resident Phone</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit security code sent to{' '}
            <Text style={styles.targetPhone}>{displayPhone}</Text>
          </Text>

          {/* Demo Hint Banner */}
          <View style={styles.demoHintBanner}>
            <Text style={styles.demoHintText}>Demo Code: 123456</Text>
          </View>

          {/* 6 Individual Numeric OTP Boxes with Auto-Advance */}
          <OtpInput value={otp} onChange={setOtp} length={6} />

          {/* Verify & Register Primary CTA */}
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={handleVerify}
            activeOpacity={0.85}
            disabled={submitting}
          >
            <LinearGradient
              colors={['#7c3aed', '#ec4899', '#f59e0b']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientCta}
            >
              <Text style={styles.verifyText}>
                {submitting ? 'Verifying Code...' : 'Verify & Register →'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Resend Code with Cooldown Timer */}
          <View style={styles.resendContainer}>
            {cooldown > 0 ? (
              <Text style={styles.cooldownText}>
                Resend code in <Text style={styles.cooldownCount}>{cooldown}s</Text>
              </Text>
            ) : (
              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleResend}
                activeOpacity={0.7}
              >
                <RotateCw size={14} color="#c084fc" />
                <Text style={styles.resendText}>Resend code</Text>
              </TouchableOpacity>
            )}
          </View>
        </GlassCard>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 20,
    position: 'relative',
  },
  cancelBtn: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  card: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 14,
  },
  targetPhone: {
    color: '#c084fc',
    fontWeight: '700',
  },
  demoHintBanner: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
  },
  demoHintText: {
    color: '#d8b4fe',
    fontSize: 12,
    fontWeight: '700',
  },
  verifyButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 20,
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  gradientCta: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  resendContainer: {
    marginTop: 18,
    alignItems: 'center',
  },
  cooldownText: {
    color: '#64748b',
    fontSize: 13,
  },
  cooldownCount: {
    color: '#c084fc',
    fontWeight: '700',
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resendText: {
    color: '#c084fc',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
});
