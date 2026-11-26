import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Mail,
  Phone,
  Lock,
  User,
  Building2,
  Home,
  Check,
  ChevronDown,
  ArrowRight,
} from 'lucide-react-native';
import { GlassCard } from '@/components/GlassCard';
import { GlassInput } from '@/components/GlassInput';
import { ShimmerTitle } from '@/components/ShimmerTitle';
import { useAuth } from '@/context/AuthContext';
import { island } from '@/context/IslandContext';
import { useTheme } from '@/context/ThemeContext';
import { WingCode } from '@/types';
import { isSupabaseConfigured } from '@/services/supabase';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const WINGS: WingCode[] = [
  'Wing A',
  'Wing B',
  'Wing C',
  'Wing D',
  'Wing E',
  'Wing F',
  'Wing G',
  'Wing H',
  'Wing I',
  'Wing J',
  'Wing K',
  'Wing L',
];

export default function LoginScreen() {
  const router = useRouter();
  const { tokens, isDark } = useTheme();
  const {
    signInWithEmail,
    signInWithPhone,
    signInWithGoogle,
    requestRegistrationOtp,
    requestPhoneOtp,
  } = useAuth();

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [signInMethod, setSignInMethod] = useState<'email' | 'phone'>('email');

  // Sign In state
  const [signInEmail, setSignInEmail] = useState('mayur.patil@ashtavinayak.org');
  const [signInPhone, setSignInPhone] = useState('9876543210');
  const [signInPassword, setSignInPassword] = useState('password123');
  const [rememberDevice, setRememberDevice] = useState(true);

  // Sign Up state
  const [fullName, setFullName] = useState('');
  const [selectedWing, setSelectedWing] = useState<WingCode>('Wing B');
  const [flatNumber, setFlatNumber] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showWingModal, setShowWingModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async () => {
    if (submitting) return;

    if (signInMethod === 'email') {
      if (!signInEmail || !signInEmail.includes('@')) {
        island.error('Validation Error', 'Please enter a valid email address.');
        return;
      }
    } else {
      if (!signInPhone || signInPhone.length < 10) {
        island.error('Validation Error', 'Please enter a valid 10-digit phone number.');
        return;
      }
    }

    if (!signInPassword) {
      island.error('Validation Error', 'Please enter your password.');
      return;
    }

    try {
      setSubmitting(true);
      if (signInMethod === 'email') {
        if (!signInPassword) {
          island.error('Validation Error', 'Please enter your password.');
          return;
        }
        await signInWithEmail(signInEmail, signInPassword, rememberDevice);
        router.replace('/(tabs)/feed');
      } else {
        const cleanPhone = signInPhone.replace(/[^0-9]/g, '');
        if (cleanPhone.length !== 10) {
          island.error('Validation Error', 'Please enter a valid 10-digit Indian mobile number.');
          return;
        }
        if (isSupabaseConfigured) {
          await requestPhoneOtp(cleanPhone);
          router.push({
            pathname: '/(auth)/otp',
            params: { targetPhone: cleanPhone },
          });
        } else {
          if (signInPassword) {
            await signInWithPhone(cleanPhone, signInPassword, rememberDevice);
            router.replace('/(tabs)/feed');
          } else {
            await requestPhoneOtp(cleanPhone);
            router.push({
              pathname: '/(auth)/otp',
              params: { targetPhone: cleanPhone },
            });
          }
        }
      }
    } catch {
      // toast shown in context
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const { isNewOrIncomplete } = await signInWithGoogle();
      if (isNewOrIncomplete) {
        router.replace('/(auth)/complete-profile');
      } else {
        router.replace('/(tabs)/feed');
      }
    } catch {
      // handled
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    if (submitting) return;

    if (!fullName.trim()) {
      island.error('Validation Error', 'Please enter your full name as per society records.');
      return;
    }
    if (!flatNumber.trim()) {
      island.error('Validation Error', 'Please enter your flat number (e.g. 402).');
      return;
    }
    const cleanPhone = signUpPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      island.error('Validation Error', 'Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!signUpEmail || !signUpEmail.includes('@')) {
      island.error('Validation Error', 'Please enter a valid email address.');
      return;
    }
    if (!signUpPassword || signUpPassword.length < 8) {
      island.error('Validation Error', 'Password must be at least 8 characters long.');
      return;
    }
    if (!agreeTerms) {
      island.error('Validation Error', 'You must agree to society rules and privacy policy.');
      return;
    }

    try {
      setSubmitting(true);
      const signUpData = {
        full_name: fullName.trim(),
        wing: selectedWing,
        flat_number: flatNumber.trim(),
        phone: cleanPhone,
        email: signUpEmail.trim(),
        password: signUpPassword,
      };

      await requestRegistrationOtp(signUpData);
      router.push({
        pathname: '/(auth)/otp',
        params: {
          signUpData: JSON.stringify(signUpData),
          targetPhone: cleanPhone,
        },
      });
    } catch {
      // handled
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: tokens.bgApp }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={styles.card}>
          {/* Header */}
          <View style={styles.headerArea}>
            <ShimmerTitle
              fontSize={20}
              letterSpacing={1.5}
              subtitle="Sign in to your flat account"
              align="center"
            />
          </View>

          {/* Segmented Tab Switcher: Sign In vs Sign Up */}
          <View
            style={[
              styles.modeSwitcher,
              {
                backgroundColor: isDark ? '#141414' : '#F4F4F5',
                borderColor: tokens.borderSubtle,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.modeTab,
                authMode === 'signin' && [
                  styles.modeTabActive,
                  {
                    backgroundColor: isDark ? '#222222' : '#FFFFFF',
                    borderColor: tokens.borderSubtle,
                  },
                ],
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                setAuthMode('signin');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.modeTabText,
                  { color: authMode === 'signin' ? tokens.textPrimary : tokens.textSecondary },
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTab,
                authMode === 'signup' && [
                  styles.modeTabActive,
                  {
                    backgroundColor: isDark ? '#222222' : '#FFFFFF',
                    borderColor: tokens.borderSubtle,
                  },
                ],
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                setAuthMode('signup');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.modeTabText,
                  { color: authMode === 'signup' ? tokens.textPrimary : tokens.textSecondary },
                ]}
              >
                Sign Up (New Resident)
              </Text>
            </TouchableOpacity>
          </View>

          {/* ===================== SIGN IN VIEW ===================== */}
          {authMode === 'signin' ? (
            <View style={styles.formContainer}>
              {signInMethod === 'email' ? (
                <GlassInput
                  label="Registered Email"
                  placeholder="resident@ashtavinayak.org"
                  value={signInEmail}
                  onChangeText={setSignInEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon={<Mail size={16} strokeWidth={1.5} color={tokens.textSecondary} />}
                />
              ) : (
                <GlassInput
                  label="Registered Mobile Number"
                  placeholder="98765 43210"
                  value={signInPhone}
                  onChangeText={setSignInPhone}
                  keyboardType="phone-pad"
                  leftIcon={
                    <View style={styles.countryCodeBadge}>
                      <Text style={[styles.countryCodeText, { color: tokens.textSecondary }]}>
                        +91
                      </Text>
                    </View>
                  }
                />
              )}

              {/* Password */}
              <GlassInput
                label="Password"
                placeholder="••••••••"
                value={signInPassword}
                onChangeText={setSignInPassword}
                isPassword
                leftIcon={<Lock size={16} strokeWidth={1.5} color={tokens.textSecondary} />}
              />

              {/* Remember device + Forgot Password */}
              <View style={styles.optionsRow}>
                <View style={styles.rememberRow}>
                  <Switch
                    value={rememberDevice}
                    onValueChange={setRememberDevice}
                    trackColor={{
                      false: isDark ? '#262626' : '#E4E4E7',
                      true: isDark ? '#FFFFFF' : '#111111',
                    }}
                    thumbColor={
                      rememberDevice
                        ? (isDark ? '#000000' : '#FFFFFF')
                        : (isDark ? '#71717A' : '#A1A1AA')
                    }
                  />
                  <Text style={[styles.rememberText, { color: tokens.textSecondary }]}>
                    Remember this device
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() =>
                    island.info(
                      'Password Reset',
                      'Please contact society admin Rajesh Sharma (Wing A-101) to reset your passkey.'
                    )
                  }
                >
                  <Text style={[styles.forgotText, { color: tokens.textSecondary }]}>
                    Forgot password?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Primary Sign In CTA */}
              <TouchableOpacity
                style={[
                  styles.primaryCta,
                  { backgroundColor: isDark ? '#F5F5F5' : '#111111' },
                ]}
                onPress={handleSignIn}
                activeOpacity={0.85}
                disabled={submitting}
              >
                <Text
                  style={[
                    styles.ctaText,
                    { color: isDark ? '#000000' : '#FFFFFF' },
                  ]}
                >
                  {submitting ? 'Signing in...' : 'Sign In'}
                </Text>
                <ArrowRight
                  size={16}
                  strokeWidth={1.5}
                  color={isDark ? '#000000' : '#FFFFFF'}
                />
              </TouchableOpacity>

              {/* OR divider */}
              <View style={styles.orDividerRow}>
                <View style={[styles.orDividerLine, { backgroundColor: tokens.borderSubtle }]} />
                <Text style={[styles.orDividerText, { color: tokens.textMuted }]}>
                  OR SIGN IN WITH
                </Text>
                <View style={[styles.orDividerLine, { backgroundColor: tokens.borderSubtle }]} />
              </View>

              {/* Secondary Sign-In Options (Google and Phone toggle) */}
              <View style={styles.socialButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.secondaryMethodBtn,
                    {
                      backgroundColor: isDark ? '#161616' : '#FAFAFA',
                      borderColor: tokens.borderSubtle,
                    },
                  ]}
                  onPress={handleGoogleSignIn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.googleGText}>G</Text>
                  <Text style={[styles.secondaryMethodLabel, { color: tokens.textPrimary }]}>
                    Google
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.secondaryMethodBtn,
                    {
                      backgroundColor: isDark ? '#161616' : '#FAFAFA',
                      borderColor: tokens.borderSubtle,
                    },
                  ]}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                    setSignInMethod((prev) => (prev === 'phone' ? 'email' : 'phone'));
                  }}
                  activeOpacity={0.8}
                >
                  {signInMethod === 'phone' ? (
                    <Mail size={16} strokeWidth={1.5} color={tokens.textPrimary} />
                  ) : (
                    <Phone size={16} strokeWidth={1.5} color={tokens.textPrimary} />
                  )}
                  <Text style={[styles.secondaryMethodLabel, { color: tokens.textPrimary }]}>
                    {signInMethod === 'phone' ? 'Use Email' : 'Phone'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ===================== SIGN UP (NEW RESIDENT) VIEW ===================== */
            <View style={styles.formContainer}>
              {/* Full Name */}
              <GlassInput
                label="Full Name"
                placeholder="As on society records"
                value={fullName}
                onChangeText={setFullName}
                leftIcon={<User size={16} strokeWidth={1.5} color={tokens.textSecondary} />}
              />

              {/* 2-Column: Wing Picker + Flat Number */}
              <View style={styles.twoColRow}>
                <View style={[styles.colItem, { marginRight: 8 }]}>
                  <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>
                    Society Wing
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.wingSelectorButton,
                      {
                        backgroundColor: isDark ? '#141414' : '#F4F4F5',
                        borderColor: tokens.borderSubtle,
                      },
                    ]}
                    onPress={() => setShowWingModal(true)}
                    activeOpacity={0.8}
                  >
                    <Building2 size={16} strokeWidth={1.5} color={tokens.textSecondary} />
                    <Text style={[styles.wingSelectedText, { color: tokens.textPrimary }]}>
                      {selectedWing}
                    </Text>
                    <ChevronDown size={16} strokeWidth={1.5} color={tokens.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.colItem, { marginLeft: 8 }]}>
                  <GlassInput
                    label="Flat Number"
                    placeholder="e.g. 402"
                    value={flatNumber}
                    onChangeText={setFlatNumber}
                    keyboardType="number-pad"
                    leftIcon={<Home size={16} strokeWidth={1.5} color={tokens.textSecondary} />}
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              </View>

              {/* Mobile Number with +91 prefix */}
              <View style={{ marginTop: 14 }}>
                <GlassInput
                  label="Mobile Number (for verification code)"
                  placeholder="98765 43210"
                  value={signUpPhone}
                  onChangeText={setSignUpPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                  leftIcon={
                    <View style={styles.countryCodeBadge}>
                      <Text style={[styles.countryCodeText, { color: tokens.textSecondary }]}>
                        +91
                      </Text>
                    </View>
                  }
                />
              </View>

              {/* Email Address */}
              <GlassInput
                label="Email Address"
                placeholder="name@example.com"
                value={signUpEmail}
                onChangeText={setSignUpEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Mail size={16} strokeWidth={1.5} color={tokens.textSecondary} />}
              />

              {/* Create Password */}
              <GlassInput
                label="Create Password (min. 8 characters)"
                placeholder="••••••••"
                value={signUpPassword}
                onChangeText={setSignUpPassword}
                isPassword
                leftIcon={<Lock size={16} strokeWidth={1.5} color={tokens.textSecondary} />}
              />

              {/* Agreement Checkbox */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAgreeTerms((prev) => !prev)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: agreeTerms
                        ? (isDark ? '#F5F5F5' : '#111111')
                        : tokens.borderSubtle,
                      backgroundColor: agreeTerms
                        ? (isDark ? '#F5F5F5' : '#111111')
                        : 'transparent',
                    },
                  ]}
                >
                  {agreeTerms && (
                    <Check
                      size={12}
                      strokeWidth={2}
                      color={isDark ? '#000000' : '#FFFFFF'}
                    />
                  )}
                </View>
                <Text style={[styles.checkboxLabel, { color: tokens.textSecondary }]}>
                  I agree to the society rules and privacy policy.
                </Text>
              </TouchableOpacity>

              {/* Sign Up Primary CTA */}
              <TouchableOpacity
                style={[
                  styles.primaryCta,
                  { backgroundColor: isDark ? '#F5F5F5' : '#111111' },
                ]}
                onPress={handleSignUp}
                activeOpacity={0.85}
                disabled={submitting}
              >
                <Text
                  style={[
                    styles.ctaText,
                    { color: isDark ? '#000000' : '#FFFFFF' },
                  ]}
                >
                  {submitting ? 'Sending code...' : 'Send verification code'}
                </Text>
                <ArrowRight
                  size={16}
                  strokeWidth={1.5}
                  color={isDark ? '#000000' : '#FFFFFF'}
                />
              </TouchableOpacity>
            </View>
          )}
        </GlassCard>
      </ScrollView>

      {/* Wing Picker Modal */}
      {showWingModal && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setShowWingModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: tokens.bgCard,
                  borderColor: tokens.borderSubtle,
                },
              ]}
            >
              <Text style={[styles.modalTitle, { color: tokens.textPrimary }]}>
                Select Wing
              </Text>
              <FlatList
                data={WINGS}
                keyExtractor={(item) => item}
                renderItem={({ item }) => {
                  const isSelected = item === selectedWing;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.wingModalItem,
                        isSelected && {
                          backgroundColor: isDark ? '#1C1C1C' : '#F4F4F5',
                          borderWidth: 1,
                          borderColor: tokens.borderSubtle,
                        },
                      ]}
                      onPress={() => {
                        setSelectedWing(item);
                        setShowWingModal(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.wingModalText,
                          {
                            color: isSelected ? tokens.textPrimary : tokens.textSecondary,
                            fontWeight: isSelected ? '600' : '400',
                          },
                        ]}
                      >
                        {item}
                      </Text>
                      {isSelected && (
                        <Check
                          size={16}
                          strokeWidth={1.5}
                          color={tokens.textPrimary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowWingModal(false)}
              >
                <Text style={[styles.modalCloseText, { color: tokens.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modeSwitcher: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
    marginBottom: 20,
    borderWidth: 1,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTabActive: {
    borderWidth: 1,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '500',
  },
  formContainer: {
    width: '100%',
  },
  countryCodeBadge: {
    paddingHorizontal: 4,
  },
  countryCodeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberText: {
    fontSize: 12,
    marginLeft: 8,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '500',
  },
  primaryCta: {
    width: '100%',
    borderRadius: 8,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  orDividerLine: {
    flex: 1,
    height: 1,
  },
  orDividerText: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1,
    marginHorizontal: 12,
  },
  socialButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  secondaryMethodBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  googleGText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EA4335',
  },
  secondaryMethodLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  twoColRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  colItem: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  wingSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  wingSelectedText: {
    fontSize: 13,
    fontWeight: '500',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxLabel: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    maxHeight: 420,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  wingModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 2,
  },
  wingModalText: {
    fontSize: 13,
  },
  modalCloseBtn: {
    marginTop: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
