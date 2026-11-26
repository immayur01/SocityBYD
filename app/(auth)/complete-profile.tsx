import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  Platform,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  Building2,
  Home,
  Phone,
  Check,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  LogOut,
} from 'lucide-react-native';
import { GlassCard } from '@/components/GlassCard';
import { GlassInput } from '@/components/GlassInput';
import { ShimmerTitle } from '@/components/ShimmerTitle';
import { useAuth } from '@/context/AuthContext';
import { island } from '@/context/IslandContext';
import { useTheme } from '@/context/ThemeContext';
import { WingCode, ResidentType } from '@/types';
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

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { user, completeProfile, signOut } = useAuth();
  const { tokens, isDark } = useTheme();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [selectedWing, setSelectedWing] = useState<WingCode>(user?.wing || 'Wing B');
  const [flatNumber, setFlatNumber] = useState(user?.flat_number || '');
  const [phone, setPhone] = useState(user?.phone?.replace('+91', '').trim() || '');
  const [residentType, setResidentType] = useState<ResidentType>(user?.resident_type || 'owner');
  const [showWingModal, setShowWingModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Disable hardware back button on Android so incomplete profile cannot be bypassed
  useEffect(() => {
    const onBackPress = () => true;
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const handleComplete = async () => {
    if (submitting) return;

    if (!fullName.trim()) {
      island.error('Validation Error', 'Please enter your full name as per society records.');
      return;
    }
    if (!flatNumber.trim()) {
      island.error('Validation Error', 'Please enter your flat number (e.g. 402).');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      island.error('Validation Error', 'Please enter a valid 10-digit Indian phone number.');
      return;
    }

    try {
      setSubmitting(true);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }

      await completeProfile({
        full_name: fullName.trim(),
        wing: selectedWing,
        flat_number: flatNumber.trim(),
        phone: cleanPhone,
        resident_type: residentType,
        email: user?.email,
      });

      island.success('Profile Saved', 'Welcome to the Ashtavinayak Empire community!');
      router.replace('/(tabs)/feed');
    } catch (err: any) {
      island.error('Setup Failed', err.message || 'Could not save flat details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: tokens.bgApp }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Icon & Sign Out */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <LogOut size={14} color={tokens.textSecondary} />
            <Text style={[styles.signOutText, { color: tokens.textSecondary }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: isDark ? '#1C1C1C' : '#F4F4F5',
                borderColor: tokens.borderSubtle,
              },
            ]}
          >
            <ShieldCheck size={28} strokeWidth={1.5} color={tokens.textPrimary} />
          </View>
          <ShimmerTitle subtitle="Complete Your Flat Details" />
          <Text style={[styles.subtitle, { color: tokens.textSecondary }]}>
            Verify your residency in Ashtavinayak Empire to access community notices and services.
          </Text>
        </View>

        {/* Glass Card Form */}
        <GlassCard style={styles.formCard}>
          {/* Full Name */}
          <GlassInput
            label="Full Name"
            placeholder=""
            value={fullName}
            onChangeText={setFullName}
            leftIcon={<User size={16} strokeWidth={1.5} color={tokens.textSecondary} />}
            autoCapitalize="words"
          />

          {/* Wing Selector Trigger */}
          <View style={styles.wingField}>
            <Text style={[styles.inputLabel, { color: tokens.textPrimary }]}>
              Society Wing
            </Text>
            <TouchableOpacity
              style={[
                styles.wingSelectBtn,
                {
                  backgroundColor: isDark ? '#161616' : '#F4F4F5',
                  borderColor: tokens.borderSubtle,
                },
              ]}
              onPress={() => setShowWingModal(true)}
              activeOpacity={0.8}
            >
              <View style={styles.wingSelectRow}>
                <Building2 size={16} strokeWidth={1.5} color={tokens.textMuted} />
                <Text style={[styles.wingSelectText, { color: tokens.textPrimary }]}>
                  {selectedWing}
                </Text>
              </View>
              <ChevronDown size={16} strokeWidth={1.5} color={tokens.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Flat Number */}
          <GlassInput
            label="Flat Number"
            placeholder=""
            value={flatNumber}
            onChangeText={setFlatNumber}
            leftIcon={<Home size={16} strokeWidth={1.5} color={tokens.textSecondary} />}
            keyboardType="number-pad"
          />

          {/* Phone Number */}
          <GlassInput
            label="Phone Number"
            placeholder=""
            value={phone}
            onChangeText={setPhone}
            leftIcon={<Phone size={16} strokeWidth={1.5} color={tokens.textSecondary} />}
            keyboardType="phone-pad"
            maxLength={10}
          />

          {/* Resident Type Selector (Owner vs Tenant) */}
          <View style={{ marginBottom: 18 }}>
            <Text style={[styles.inputLabel, { color: tokens.textPrimary, marginBottom: 8 }]}>
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
                    backgroundColor: isDark ? '#161616' : '#F4F4F5',
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
                    backgroundColor: isDark ? '#161616' : '#F4F4F5',
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

          {/* Submit CTA */}
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: tokens.textPrimary },
              submitting && styles.btnDisabled,
            ]}
            onPress={handleComplete}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryBtnText, { color: tokens.bgApp }]}>
              {submitting ? 'Saving Details...' : 'Save & Enter Community'}
            </Text>
            <ArrowRight size={16} strokeWidth={2} color={tokens.bgApp} />
          </TouchableOpacity>
        </GlassCard>
      </ScrollView>

      {/* Wing Picker Modal */}
      <Modal
        visible={showWingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWingModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowWingModal(false)}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? '#141414' : '#FFFFFF',
                borderColor: tokens.borderSubtle,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: tokens.textPrimary }]}>
              Select Your Wing
            </Text>
            <FlatList
              data={WINGS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = selectedWing === item;
                return (
                  <TouchableOpacity
                    style={[
                      styles.wingOption,
                      isSelected && {
                        backgroundColor: isDark ? '#222222' : '#F4F4F5',
                      },
                    ]}
                    onPress={() => {
                      setSelectedWing(item);
                      setShowWingModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.wingOptionText,
                        {
                          color: isSelected ? tokens.textPrimary : tokens.textSecondary,
                          fontWeight: isSelected ? '600' : '400',
                        },
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected && (
                      <Check size={16} strokeWidth={2} color={tokens.textPrimary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 40,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '500',
  },
  residentTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  residentTypeBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  residentTypeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  shimmerTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 320,
  },
  formCard: {
    width: '100%',
    padding: 20,
    borderRadius: 20,
  },
  wingField: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  wingSelectBtn: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  wingSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wingSelectText: {
    fontSize: 14,
    fontWeight: '500',
  },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxHeight: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  wingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  wingOptionText: {
    fontSize: 15,
  },
});
