import { Layout } from '@/constants/theme';
import { customerOnboarding, getCountries } from '@/services/customer-api';
import type { CustomerOnboardingRequest } from '@/types/api';
import { Link, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

const GENDERS: Array<'MALE' | 'FEMALE'> = ['MALE', 'FEMALE'];

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10;
}

/** NIC: 9 digits + V or 12 digits */
function isValidNic(value: string): boolean {
  const trimmed = value.trim().toUpperCase();
  if (/^\d{9}[VvXx]$/.test(trimmed)) return true;
  if (/^\d{12}$/.test(trimmed)) return true;
  return false;
}

/** DOB YYYY-MM-DD */
function isValidDob(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

/** Username: 4-20 alphanumeric (matches backend @Pattern) */
function isValidUsername(value: string): boolean {
  return /^[a-zA-Z0-9]{4,20}$/.test(value.trim());
}

/** Password: 6-12 chars, at least one letter and one digit, letters/digits only (matches backend @Pattern) */
function isValidPassword(value: string): boolean {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,12}$/.test(value);
}

type FormErrors = Partial<Record<keyof CustomerOnboardingRequest | 'confirmPassword', string>>;

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [nic, setNic] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [countryName, setCountryName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countriesError, setCountriesError] = useState<string | null>(null);

  const validate = (): { valid: boolean; errorMessages: string[] } => {
    const next: FormErrors = {};
    if (!firstName.trim()) next.firstName = 'First name is required';
    if (!lastName.trim()) next.lastName = 'Last name is required';
    if (!email.trim()) next.email = 'Email is required';
    else if (!isValidEmail(email)) next.email = 'Enter a valid email';
    if (!phoneNumber.trim()) next.phoneNumber = 'Phone number is required';
    else if (!isValidPhone(phoneNumber)) next.phoneNumber = 'Enter a valid phone number (at least 10 digits)';
    if (!nic.trim()) next.nic = 'NIC is required';
    else if (!isValidNic(nic)) next.nic = 'Enter valid NIC (e.g. 199512345678 or 912345678V)';
    if (!dob.trim()) next.dob = 'Date of birth is required';
    else if (!isValidDob(dob)) next.dob = 'Use format YYYY-MM-DD';
    if (!countryName.trim()) next.countryName = 'Select a country';
    if (!username.trim()) next.username = 'Username is required';
    else if (!isValidUsername(username)) next.username = 'Username must be 4-20 alphanumeric characters';
    if (!password) next.password = 'Password is required';
    else if (!isValidPassword(password)) next.password = 'Password must be 6-12 characters with at least one letter and one digit';
    if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match';
    setErrors(next);
    const errorMessages = Object.values(next).filter(Boolean) as string[];
    return { valid: errorMessages.length === 0, errorMessages };
  };

  const handleRegister = async () => {
    const { valid, errorMessages } = validate();
    if (!valid) {
      if (errorMessages.length) Alert.alert('Validation Error', errorMessages.join('\n'));
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      const phoneDigits = phoneNumber.replace(/\D/g, '');
      const phoneFormatted =
        phoneDigits.length === 9 ? `0${phoneDigits}` : phoneDigits.startsWith('0') ? phoneDigits : `0${phoneDigits.slice(-9)}`;
      const payload: CustomerOnboardingRequest = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneNumber: phoneFormatted,
        nic: nic.trim().toUpperCase(),
        dob: dob.trim(),
        gender,
        countryName: countryName.trim(),
        profileImage: null,
        membershipType: 'SILVER',
        username: username.trim(),
        password,
      };
      await customerOnboarding(payload);
      router.replace('/login');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Registration failed. Try again.';
      setErrors({ email: message });
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const clearError = (field: keyof FormErrors) =>
    setErrors((e) => ({ ...e, [field]: undefined }));

  const fetchCountries = useCallback(async (search: string) => {
    setCountriesLoading(true);
    setCountriesError(null);
    try {
      const list = await getCountries(search);
      setCountries(list);
    } catch (e) {
      setCountries([]);
      setCountriesError(e instanceof Error ? e.message : 'Could not load countries');
    } finally {
      setCountriesLoading(false);
    }
  }, []);

  // When modal opens or search changes: load countries (debounced when typing)
  useEffect(() => {
    if (!countryModalVisible) return;
    const isInitial = countrySearch === '';
    const delayMs = isInitial ? 0 : 350;
    const t = setTimeout(() => fetchCountries(countrySearch), delayMs);
    return () => clearTimeout(t);
  }, [countryModalVisible, countrySearch, fetchCountries]);

  const openCountryModal = () => {
    setCountrySearch('');
    setCountryModalVisible(true);
  };

  const selectCountry = (name: string) => {
    setCountryName(name);
    setCountryModalVisible(false);
    clearError('countryName');
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <ThemedText type="title" style={styles.welcome}>
              Create account
            </ThemedText>
            <ThemedText style={styles.hint}>
              Enter your details to register.
            </ThemedText>
          </View>

          <View style={styles.form}>
            <ThemedTextInput
              label="First name"
              placeholder="Jane"
              value={firstName}
              onChangeText={(t) => { setFirstName(t); clearError('firstName'); }}
              autoCapitalize="words"
              error={errors.firstName}
            />
            <ThemedTextInput
              label="Last name"
              placeholder="Doe"
              value={lastName}
              onChangeText={(t) => { setLastName(t); clearError('lastName'); }}
              autoCapitalize="words"
              error={errors.lastName}
            />

            <ThemedTextInput
              label="Email"
              placeholder="jane.doe@example.com"
              value={email}
              onChangeText={(t) => { setEmail(t); clearError('email'); }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
            <ThemedTextInput
              label="Phone number"
              placeholder="0771234567"
              value={phoneNumber}
              onChangeText={(t) => { setPhoneNumber(t); clearError('phoneNumber'); }}
              keyboardType="phone-pad"
              error={errors.phoneNumber}
            />
            <ThemedTextInput
              label="NIC"
              placeholder="199512345678 or 912345678V"
              value={nic}
              onChangeText={(t) => { setNic(t); clearError('nic'); }}
              autoCapitalize="characters"
              error={errors.nic}
            />
            <ThemedTextInput
              label="Date of birth"
              placeholder="1995-08-20"
              value={dob}
              onChangeText={(t) => { setDob(t); clearError('dob'); }}
              error={errors.dob}
            />

            <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>Gender</ThemedText>
            <View style={styles.chipRow}>
              {GENDERS.map((g) => (
                <Pressable
                  key={g}
                  style={[styles.chip, gender === g && styles.chipActive]}
                  onPress={() => setGender(g)}
                >
                  <ThemedText style={gender === g ? styles.chipTextActive : undefined}>{g}</ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>Country</ThemedText>
            <Pressable
              style={[styles.countryButton, errors.countryName && styles.countryButtonError]}
              onPress={openCountryModal}
            >
              <ThemedText style={countryName ? undefined : styles.countryPlaceholder}>
                {countryName || 'Search and select country'}
              </ThemedText>
            </Pressable>
            {errors.countryName ? (
              <ThemedText style={styles.errorText}>{errors.countryName}</ThemedText>
            ) : null}

            <ThemedTextInput
              label="Username"
              placeholder="4-20 letters or numbers"
              value={username}
              onChangeText={(t) => { setUsername(t); clearError('username'); }}
              autoCapitalize="none"
              error={errors.username}
            />
            <View style={styles.passwordFieldWrap}>
              <ThemedTextInput
                label="Password"
                placeholder="6-12 chars, letter + digit"
                value={password}
                onChangeText={(t) => { setPassword(t); clearError('password'); if (confirmPassword) clearError('confirmPassword'); }}
                secureTextEntry={!showPassword}
                error={errors.password}
                containerStyle={styles.passwordInputContainer}
              />
              <Pressable
                style={styles.eyeButton}
                onPress={() => setShowPassword((v) => !v)}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <IconSymbol
                  name={showPassword ? 'eye.slash' : 'eye'}
                  size={24}
                  color="#64748B"
                />
              </Pressable>
            </View>
            <View style={styles.passwordFieldWrap}>
              <ThemedTextInput
                label="Confirm password"
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); clearError('confirmPassword'); }}
                secureTextEntry={!showConfirmPassword}
                error={errors.confirmPassword}
                containerStyle={styles.passwordInputContainer}
              />
              <Pressable
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword((v) => !v)}
                accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                <IconSymbol
                  name={showConfirmPassword ? 'eye.slash' : 'eye'}
                  size={24}
                  color="#64748B"
                />
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={handleRegister}
              disabled={loading}
            >
              <ThemedText style={styles.buttonText}>
                {loading ? 'Creating account…' : 'Create account'}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>Already have an account? </ThemedText>
            <Link href="/login" asChild>
              <Pressable>
                <ThemedText type="link">Login</ThemedText>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={countryModalVisible} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setCountryModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle" style={styles.modalTitle}>Select country</ThemedText>
            <ThemedTextInput
              placeholder="Search country..."
              value={countrySearch}
              onChangeText={setCountrySearch}
              containerStyle={styles.modalSearch}
            />
            {countriesLoading ? (
              <ActivityIndicator size="small" color={Layout.primary} style={styles.modalLoader} />
            ) : countriesError ? (
              <ThemedText style={styles.countryError}>{countriesError}</ThemedText>
            ) : (
              <FlatList
                data={countries}
                keyExtractor={(item) => item}
                style={styles.countryList}
                renderItem={({ item }) => (
                  <Pressable style={styles.countryItem} onPress={() => selectCountry(item)}>
                    <ThemedText>{item}</ThemedText>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <ThemedText style={styles.emptyCountry}>No countries found. Try a different search.</ThemedText>
                }
              />
            )}
            <Pressable style={styles.modalClose} onPress={() => setCountryModalVisible(false)}>
              <ThemedText type="link">Close</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  keyboard: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  header: { marginBottom: 24 },
  welcome: {
    color: Layout.primary,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  hint: { color: '#64748B', fontSize: 16 },
  form: { marginBottom: 24 },
  fieldLabel: { marginBottom: 8, marginTop: 8 },
  chipRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: Layout.primary, borderColor: Layout.primary },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  countryButton: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Layout.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F1F5F9',
  },
  countryButtonError: { borderColor: '#dc2626' },
  countryPlaceholder: { color: '#64748B' },
  errorText: { color: '#dc2626', fontSize: 13, marginTop: 4 },
  passwordFieldWrap: { position: 'relative', marginBottom: 16 },
  passwordInputContainer: { marginBottom: 0 },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 34,
    padding: 8,
    zIndex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: Layout.radius.xl,
    borderTopRightRadius: Layout.radius.xl,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: { marginBottom: 16 },
  modalSearch: { marginBottom: 12 },
  modalLoader: { paddingVertical: 24 },
  countryList: { maxHeight: 280 },
  countryItem: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  emptyCountry: { padding: 20, textAlign: 'center', opacity: 0.7 },
  countryError: { padding: 20, textAlign: 'center', color: '#dc2626' },
  modalClose: { marginTop: 16, alignItems: 'center' },
  button: {
    backgroundColor: Layout.primary,
    borderRadius: Layout.radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    ...Layout.shadow.sm,
  },
  buttonPressed: { opacity: 0.9 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 4,
  },
  footerText: { color: '#64748B' },
});
