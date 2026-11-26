import React, { useState, useEffect } from 'react';
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
import { WingCode, ResidentType } from '@/types';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { SignUpData } from '@/services/auth';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
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
    signUpWithEmail,
    signInWithGoogle,
    resetPasswordForEmail,
  } = useAuth();

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Sign In state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);

  // Forgot Password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  // Sign Up state
  const [fullName, setFullName] = useState('');
  const [selectedWing, setSelectedWing] = useState<WingCode>('Wing B');
  const [flatNumber, setFlatNumber] = useState('');
  const [residentType, setResidentType] = useState<ResidentType>('owner');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showWingModal, setShowWingModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Listen for incoming OAuth deep link redirect on login screen (Expo Go or Standalone)
  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (!url || !isSupabaseConfigured) return;
      if (url.includes('auth/callback') || url.includes('code=') || url.includes('access_token=')) {
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

          const { data } = await supabase.auth.getUser();
          if (data?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();
            if (profile && profile.wing && profile.flat_number) {
              router.replace('/(tabs)/feed');
            } else {
              router.replace('/(auth)/complete-profile');
            }
          }
        } catch (e) {
          console.warn('[LoginScreen] OAuth deep link handle error:', e);
        }
      }
    };

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    return () => sub.remove();
  }, [router]);

  const handleSignIn = async () => {
    if (submitting) return;

    if (!signInEmail || !signInEmail.includes('@')) {
      island.error('Validation Error', 'Please enter a valid email address.');
      return;
    }

    if (!signInPassword) {
      island.error('Validation Error', 'Please enter your password.');
      return;
    }

    try {
      setSubmitting(true);
      await signInWithEmail(signInEmail, signInPassword, rememberDevice);
      router.replace('/(tabs)/feed');
    } catch {
      // toast shown in context
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (forgotSubmitting) return;
    if (!forgotEmail || !forgotEmail.includes('@')) {
      island.error('Validation Error', 'Please enter a valid email address.');
      return;
    }
    try {
      setForgotSubmitting(true);
      await resetPasswordForEmail(forgotEmail);
      setShowForgotModal(false);
      setForgotEmail('');
    } catch {
      // toast shown in context
    } finally {
      setForgotSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const { isNewOrIncomplete, resultUrl } = await signInWithGoogle();

      // Ensure both PKCE (?code=) and hash tokens (#access_token=) are handled if resultUrl is returned
      if (resultUrl && isSupabaseConfigured) {
        if (resultUrl.includes('code=')) {
          const parsed = Linking.parse(resultUrl);
          const code = parsed.queryParams?.code;
          const codeStr = Array.isArray(code) ? code[0] : code;
          if (typeof codeStr === 'string' && codeStr.length > 0) {
            await supabase.auth.exchangeCodeForSession(codeStr);
          }
        } else if (resultUrl.includes('access_token=') || resultUrl.includes('#')) {
          const hash = resultUrl.split('#')[1] || resultUrl.split('?')[1] || '';
          const params = new URLSearchParams(hash);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
          }
        }
      }

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
      const signUpData: SignUpData = {
        full_name: fullName.trim(),
        wing: selectedWing,
        flat_number: flatNumber.trim(),
        phone: cleanPhone,
        email: signUpEmail.trim().toLowerCase(),
        password: signUpPassword,
        resident_type: residentType,
      };

      await signUpWithEmail(signUpData, signUpPassword);
      router.push({
        pathname: '/(auth)/otp',
        params: {
          signUpData: JSON.stringify(signUpData),
          targetEmail: signUpEmail.trim().toLowerCase(),
        },
      });
    } catch (err: any) {
      const msg = err?.message || 'Failed to create account.';
      if (msg.includes('already exists') || msg.includes('already registered')) {
        island.error('Account Already Exists', 'An account with this email already exists. Please Sign In instead.');
      } else {
        island.error('Registration Error', msg);
      }
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
              <GlassInput
                label="Registered Email"
                placeholder=""
                value={signInEmail}
                onChangeText={setSignInEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Mail size={16} strokeWidth={1.5} color={tokens.textSecondary} />}
              />

              {/* Password */}
              <GlassInput
                label="Password"
                placeholder=""
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

                <TouchableOpacity onPress={() => setShowForgotModal(true)}>
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

              {/* Secondary Sign-In Options (Google OAuth) */}
              <TouchableOpacity
                style={[
                  styles.googleFullBtn,
                  {
                    backgroundColor: isDark ? '#161616' : '#FAFAFA',
                    borderColor: tokens.borderSubtle,
                  },
                ]}
                onPress={handleGoogleSignIn}
                activeOpacity={0.8}
              >
                <Text style={styles.googleGText}>G</Text>
                <Text style={[styles.secondaryMethodLabel, { color: tokens.textPrimary, marginLeft: 10 }]}>
                  Continue with Google
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ===================== SIGN UP (NEW RESIDENT) VIEW ===================== */
            <View style={styles.formContainer}>
              {/* Full Name */}
              <GlassInput
                label="Full Name"
                placeholder=""
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
                    placeholder=""
                    value={flatNumber}
                    onChangeText={setFlatNumber}
                    keyboardType="number-pad"
                    leftIcon={<Home size={16} strokeWidth={1.5} color={tokens.textSecondary} />}
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              </View>

              {/* Resident Type: Owner vs Tenant */}
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.inputLabel, { color: tokens.textSecondary, marginBottom: 8 }]}>
                  Resident Type
                </Text>
                <View style={styles.residentTypeRow}>
                  <TouchableOpacity
                    style={[
                      styles.residentTypeBtn,
                      residentType === 'owner' && {
                        backgroundColor: isDark ? '#FFFFFF' : '#111111',
                        borderColor: isDark ? '#FFFFFF' : '#111111',
                      },
                      residentType !== 'owner' && {
                        backgroundColor: isDark ? '#141414' : '#F4F4F5',
                        borderColor: tokens.borderSubtle,
                      },
                    ]}
                    onPress={() => setResidentType('owner')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.residentTypeBtnText,
                        { color: residentType === 'owner' ? (isDark ? '#000000' : '#FFFFFF') : tokens.textSecondary },
                      ]}
                    >
                      Owner
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.residentTypeBtn,
                      residentType === 'tenant' && {
                        backgroundColor: isDark ? '#FFFFFF' : '#111111',
                        borderColor: isDark ? '#FFFFFF' : '#111111',
                      },
                      residentType !== 'tenant' && {
                        backgroundColor: isDark ? '#141414' : '#F4F4F5',
                        borderColor: tokens.borderSubtle,
                      },
                    ]}
                    onPress={() => setResidentType('tenant')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.residentTypeBtnText,
                        { color: residentType === 'tenant' ? (isDark ? '#000000' : '#FFFFFF') : tokens.textSecondary },
                      ]}
                    >
                      Tenant
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Mobile Number with +91 prefix */}
              <View style={{ marginTop: 14 }}>
                <GlassInput
                  label="Mobile Number (for society records)"
                  placeholder=""
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
                label="Email Address (for 6-digit confirmation code)"
                placeholder=""
                value={signUpEmail}
                onChangeText={setSignUpEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Mail size={16} strokeWidth={1.5} color={tokens.textSecondary} />}
              />

              {/* Create Password */}
              <GlassInput
                label="Create Password (min. 8 characters)"
                placeholder=""
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

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setShowForgotModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: isDark ? '#141414' : '#FFFFFF',
                  borderColor: tokens.borderSubtle,
                },
              ]}
            >
              <Text style={[styles.modalTitle, { color: tokens.textPrimary }]}>
                Reset Password
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: tokens.textSecondary,
                  textAlign: 'center',
                  marginBottom: 16,
                  lineHeight: 18,
                }}
              >
                Enter your registered society email. We will send you instructions to reset your password.
              </Text>

              <GlassInput
                label="Registered Email"
                placeholder=""
                value={forgotEmail}
                onChangeText={setForgotEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Mail size={16} strokeWidth={1.5} color={tokens.textSecondary} />}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <TouchableOpacity
                  style={[
                    styles.secondaryMethodBtn,
                    {
                      backgroundColor: isDark ? '#1C1C1C' : '#F4F4F5',
                      borderColor: tokens.borderSubtle,
                    },
                  ]}
                  onPress={() => setShowForgotModal(false)}
                  disabled={forgotSubmitting}
                >
                  <Text style={{ color: tokens.textSecondary, fontWeight: '500' }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryCta,
                    {
                      flex: 1,
                      marginTop: 0,
                      backgroundColor: isDark ? '#F5F5F5' : '#111111',
                    },
                  ]}
                  onPress={handleForgotPassword}
                  disabled={forgotSubmitting}
                >
                  <Text
                    style={{
                      color: isDark ? '#000000' : '#FFFFFF',
                      fontWeight: '600',
                      fontSize: 13,
                    }}
                  >
                    {forgotSubmitting ? 'Sending...' : 'Send Reset Link'}
                  </Text>
                </TouchableOpacity>
              </View>
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
  googleFullBtn: {
    width: '100%',
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  residentTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  residentTypeBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  residentTypeBtnText: {
    fontSize: 13,
    fontWeight: '600',
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
