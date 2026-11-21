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
import { LinearGradient } from 'expo-linear-gradient';
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
  ShieldCheck,
} from 'lucide-react-native';
import { GlassCard } from '@/components/GlassCard';
import { GlassInput } from '@/components/GlassInput';
import { ShimmerTitle } from '@/components/ShimmerTitle';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { WingCode } from '@/types';
import * as Haptics from 'expo-haptics';

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
  const { signInWithEmail, signInWithPhone, signInWithGoogle, requestRegistrationOtp } = useAuth();
  const { showToast } = useToast();

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
        showToast('Validation Error', 'Please enter a valid email address.', 'error');
        return;
      }
    } else {
      if (!signInPhone || signInPhone.length < 10) {
        showToast('Validation Error', 'Please enter a valid 10-digit phone number.', 'error');
        return;
      }
    }

    if (!signInPassword) {
      showToast('Validation Error', 'Please enter your password.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (signInMethod === 'email') {
        await signInWithEmail(signInEmail, signInPassword, rememberDevice);
      } else {
        await signInWithPhone(signInPhone, signInPassword, rememberDevice);
      }
      router.replace('/(tabs)/feed');
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
      await signInWithGoogle();
      router.replace('/(tabs)/feed');
    } catch {
      // handled
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    if (submitting) return;

    if (!fullName.trim()) {
      showToast('Validation Error', 'Please enter your full name as per society records.', 'error');
      return;
    }
    if (!flatNumber.trim()) {
      showToast('Validation Error', 'Please enter your flat number (e.g. 402).', 'error');
      return;
    }
    const cleanPhone = signUpPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      showToast('Validation Error', 'Please enter a valid 10-digit Indian mobile number.', 'error');
      return;
    }
    if (!signUpEmail || !signUpEmail.includes('@')) {
      showToast('Validation Error', 'Please enter a valid email address.', 'error');
      return;
    }
    if (!signUpPassword || signUpPassword.length < 8) {
      showToast('Validation Error', 'Password must be at least 8 characters long.', 'error');
      return;
    }
    if (!agreeTerms) {
      showToast('Validation Error', 'You must agree to society rules and privacy policy.', 'error');
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
    <LinearGradient
      colors={['#0D1120', '#13122B', '#090D16']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.container}
    >
      {/* Ambient background glow orbs */}
      <View style={[styles.glowOrb, styles.glowOrb1]} />
      <View style={[styles.glowOrb, styles.glowOrb2]} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={styles.card}>
          {/* Header: Shimmer Title only (no logo) */}
          <View style={styles.headerArea}>
            <ShimmerTitle
              fontSize={21}
              letterSpacing={2}
              subtitle="Premier Resident Portal & Community Hub"
              align="center"
            />
          </View>

          {/* Segmented Tab Switcher: Sign In vs Sign Up */}
          <View style={styles.modeSwitcher}>
            <TouchableOpacity
              style={[styles.modeTab, authMode === 'signin' && styles.modeTabActive]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                setAuthMode('signin');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeTabText, authMode === 'signin' && styles.modeTabTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, authMode === 'signup' && styles.modeTabActive]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                setAuthMode('signup');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeTabText, authMode === 'signup' && styles.modeTabTextActive]}>
                Sign Up (New Resident)
              </Text>
            </TouchableOpacity>
          </View>

          {/* ===================== SIGN IN VIEW ===================== */}
          {authMode === 'signin' ? (
            <View style={styles.formContainer}>
              {/* Email or Phone Input (driven by circular button selection below) */}
              {signInMethod === 'email' ? (
                <GlassInput
                  label="Registered Email"
                  placeholder="resident@ashtavinayak.org"
                  value={signInEmail}
                  onChangeText={setSignInEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon={<Mail size={18} color="#94a3b8" />}
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
                      <Text style={styles.countryCodeText}>+91</Text>
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
                leftIcon={<Lock size={18} color="#94a3b8" />}
              />

              {/* Remember device + Forgot Password */}
              <View style={styles.optionsRow}>
                <View style={styles.rememberRow}>
                  <Switch
                    value={rememberDevice}
                    onValueChange={setRememberDevice}
                    trackColor={{ false: '#334155', true: '#7c3aed' }}
                    thumbColor={rememberDevice ? '#ffffff' : '#94a3b8'}
                  />
                  <Text style={styles.rememberText}>Remember this device</Text>
                </View>

                <TouchableOpacity
                  onPress={() =>
                    showToast(
                      'Password Reset',
                      'Please contact society admin Rajesh Sharma (Wing A-101) to reset your passkey.',
                      'info'
                    )
                  }
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* Primary Sign In CTA */}
              <TouchableOpacity
                style={styles.primaryCta}
                onPress={handleSignIn}
                activeOpacity={0.85}
                disabled={submitting}
              >
                <LinearGradient
                  colors={['#7c3aed', '#ec4899', '#f59e0b']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaGradient}
                >
                  <Text style={styles.ctaText}>
                    {submitting ? 'Authenticating...' : 'Sign In to Ashtavinayak Empire'}
                  </Text>
                  <ArrowRight size={18} color="#ffffff" />
                </LinearGradient>
              </TouchableOpacity>

              {/* OR divider */}
              <View style={styles.orDividerRow}>
                <View style={styles.orDividerLine} />
                <Text style={styles.orDividerText}>OR SIGN IN WITH</Text>
                <View style={styles.orDividerLine} />
              </View>

              {/* Circular social / method buttons */}
              <View style={styles.socialButtonsRow}>
                {/* Google */}
                <TouchableOpacity
                  style={styles.socialCircleBtn}
                  onPress={handleGoogleSignIn}
                  activeOpacity={0.8}
                >
                  <View style={[styles.socialCircleInner, styles.socialCircleGoogle]}>
                    <Text style={styles.googleGText}>G</Text>
                  </View>
                  <Text style={styles.socialCircleLabel}>Google</Text>
                </TouchableOpacity>

                {/* Email */}
                <TouchableOpacity
                  style={styles.socialCircleBtn}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                    setSignInMethod('email');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.socialCircleInner,
                    styles.socialCirclePurple,
                    signInMethod === 'email' && styles.socialCircleActive,
                  ]}>
                    <Mail size={22} color="#ffffff" />
                  </View>
                  <Text style={[
                    styles.socialCircleLabel,
                    signInMethod === 'email' && styles.socialCircleLabelActive,
                  ]}>
                    Email
                  </Text>
                </TouchableOpacity>

                {/* Phone */}
                <TouchableOpacity
                  style={styles.socialCircleBtn}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                    setSignInMethod('phone');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.socialCircleInner,
                    styles.socialCirclePurple,
                    signInMethod === 'phone' && styles.socialCircleActive,
                  ]}>
                    <Phone size={22} color="#ffffff" />
                  </View>
                  <Text style={[
                    styles.socialCircleLabel,
                    signInMethod === 'phone' && styles.socialCircleLabelActive,
                  ]}>
                    Phone
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
                placeholder="As on your society records"
                value={fullName}
                onChangeText={setFullName}
                leftIcon={<User size={18} color="#94a3b8" />}
              />

              {/* 2-Column: Wing Picker + Flat Number */}
              <View style={styles.twoColRow}>
                <View style={[styles.colItem, { marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Society Wing</Text>
                  <TouchableOpacity
                    style={styles.wingSelectorButton}
                    onPress={() => setShowWingModal(true)}
                    activeOpacity={0.8}
                  >
                    <Building2 size={16} color="#c084fc" />
                    <Text style={styles.wingSelectedText}>{selectedWing}</Text>
                    <ChevronDown size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                <View style={[styles.colItem, { marginLeft: 8 }]}>
                  <GlassInput
                    label="Flat Number"
                    placeholder="e.g. 402"
                    value={flatNumber}
                    onChangeText={setFlatNumber}
                    keyboardType="number-pad"
                    leftIcon={<Home size={16} color="#94a3b8" />}
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              </View>

              {/* Mobile Number with +91 prefix */}
              <View style={{ marginTop: 14 }}>
                <GlassInput
                  label="Mobile Number (for OTP verification)"
                  placeholder="98765 43210"
                  value={signUpPhone}
                  onChangeText={setSignUpPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                  leftIcon={
                    <View style={styles.countryCodeBadge}>
                      <Text style={styles.countryCodeText}>+91</Text>
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
                leftIcon={<Mail size={18} color="#94a3b8" />}
              />

              {/* Create Password */}
              <GlassInput
                label="Create Password (min. 8 characters)"
                placeholder="••••••••"
                value={signUpPassword}
                onChangeText={setSignUpPassword}
                isPassword
                leftIcon={<Lock size={18} color="#94a3b8" />}
              />

              {/* Agreement Checkbox */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAgreeTerms((prev) => !prev)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
                  {agreeTerms && <Check size={14} color="#ffffff" />}
                </View>
                <Text style={styles.checkboxLabel}>
                  I agree to the society rules and privacy policy.
                </Text>
              </TouchableOpacity>

              {/* Sign Up Primary CTA */}
              <TouchableOpacity
                style={styles.primaryCta}
                onPress={handleSignUp}
                activeOpacity={0.85}
                disabled={submitting}
              >
                <LinearGradient
                  colors={['#7c3aed', '#ec4899', '#f59e0b']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaGradient}
                >
                  <Text style={styles.ctaText}>
                    {submitting ? 'Sending OTP...' : 'Send verification code →'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Secure Portal Footer */}
          <View style={styles.cardFooter}>
            <ShieldCheck size={14} color="#10b981" />
            <Text style={styles.footerText}>
              Verified Resident Access • Ashtavinayak Empire Co-op Housing Society
            </Text>
          </View>
        </GlassCard>
      </ScrollView>

      {/* Wing Picker Modal */}
      <Modal visible={showWingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Your Wing</Text>
            <FlatList
              data={WINGS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.wingModalItem,
                    item === selectedWing && styles.wingModalItemActive,
                  ]}
                  onPress={() => {
                    setSelectedWing(item);
                    setShowWingModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.wingModalText,
                      item === selectedWing && styles.wingModalTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                  {item === selectedWing && <Check size={18} color="#c084fc" />}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowWingModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  glowOrb: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.22,
  },
  glowOrb1: {
    top: -50,
    right: -50,
    backgroundColor: '#7c3aed',
  },
  glowOrb2: {
    bottom: -60,
    left: -40,
    backgroundColor: '#ec4899',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    padding: 24,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modeTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTabActive: {
    backgroundColor: '#7c3aed',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modeTabText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  modeTabTextActive: {
    color: '#ffffff',
  },
  formContainer: {
    width: '100%',
  },
  countryCodeBadge: {
    paddingHorizontal: 4,
  },
  countryCodeText: {
    color: '#c084fc',
    fontSize: 14,
    fontWeight: '700',
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
    color: '#94a3b8',
    fontSize: 12,
    marginLeft: 8,
  },
  forgotText: {
    color: '#c084fc',
    fontSize: 12,
    fontWeight: '600',
  },
  primaryCta: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    paddingHorizontal: 16,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginRight: 8,
  },
  // OR divider below CTA
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 18,
  },
  orDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  orDividerText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginHorizontal: 10,
  },
  // Circular social/method buttons row
  socialButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 28,
    marginBottom: 8,
  },
  socialCircleBtn: {
    alignItems: 'center',
    gap: 6,
  },
  socialCircleInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  socialCircleGoogle: {
    backgroundColor: '#ffffff',
  },
  socialCirclePurple: {
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
  },
  socialCircleActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.55)',
    borderColor: '#c084fc',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  googleGText: {
    color: '#ea4335',
    fontSize: 22,
    fontWeight: '900',
  },
  socialCircleLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  socialCircleLabelActive: {
    color: '#c084fc',
    fontWeight: '700',
  },
  // Sign Up specific
  twoColRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  colItem: {
    flex: 1,
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  wingSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 50,
  },
  wingSelectedText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  checkboxActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  checkboxLabel: {
    color: '#94a3b8',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  // Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  footerText: {
    color: '#64748b',
    fontSize: 10,
    marginLeft: 6,
    fontWeight: '600',
  },
  // Wing Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#181534',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    padding: 20,
    maxHeight: 450,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 14,
    textAlign: 'center',
  },
  wingModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  wingModalItemActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
  },
  wingModalText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  wingModalTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  modalCloseBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
});
