

import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FIND_IT_API_BASE } from '@/constants/api';
import { Layout, Theme } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
    changePassword,
    getCountries,
    updateCustomerProfile,
    updateProfileImageOnServer,
    uploadProfileImage,
} from '@/services/customer-api';
import type { User } from '@/types/api';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function getInitials(user: User): string {
  const first = user.firstName?.trim() ?? '';
  const last = user.lastName?.trim() ?? '';
  if (first && last) return (first[0] + last[0]).toUpperCase();
  const name = user.name?.trim() ?? user.username ?? user.email ?? '';
  return (name[0] ?? '?').toUpperCase();
}

function getProfileImageUri(profileImageUrl?: string): string | null {
  if (!profileImageUrl?.trim()) return null;
  const raw = profileImageUrl.trim();
  if (raw.startsWith('http') || raw.startsWith('file://')) {
    return raw;
  }
  return `${FIND_IT_API_BASE}/images/show?type=profile&fileName=${encodeURIComponent(raw)}`;
}

function FieldRow({ label, value, borderColor }: { label: string; value?: string | null; borderColor?: string }) {
  if (value == null || value === '') return null;
  return (
    <View style={[styles.fieldRow, borderColor ? { borderBottomColor: borderColor } : undefined]}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <ThemedText style={styles.fieldValue}>{value}</ThemedText>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, updateUser } = useAuth();
  const cardBorder = useThemeColor({}, 'cardBorder');
  const iconColor = useThemeColor({}, 'icon');
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countriesError, setCountriesError] = useState<string | null>(null);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    nic: '',
    dob: '',
    gender: '',
    countryName: '',
  });

  const startEdit = useCallback(() => {
    if (!user) return;
    setEditForm({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phoneNumber: user.phoneNumber ?? user.mobile ?? '',
      nic: user.nic ?? '',
      dob: user.dob ?? '',
      gender: user.gender ?? '',
      countryName: user.countryName ?? '',
    });
    setEditing(true);
  }, [user]);

  const cancelEdit = useCallback(() => setEditing(false), []);

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

  useEffect(() => {
    if (!countryModalVisible) return;
    const isInitial = countrySearch === '';
    const delayMs = isInitial ? 0 : 350;
    const t = setTimeout(() => fetchCountries(countrySearch), delayMs);
    return () => clearTimeout(t);
  }, [countryModalVisible, countrySearch, fetchCountries]);

  const openCountryModal = useCallback(() => {
    setCountrySearch('');
    setCountryModalVisible(true);
  }, []);

  const selectCountry = useCallback((name: string) => {
    setEditForm((f) => ({ ...f, countryName: name }));
    setCountryModalVisible(false);
  }, []);

  const openPasswordModal = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordModalVisible(true);
  }, []);

  const closePasswordModal = useCallback(() => {
    setPasswordModalVisible(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
  }, []);

  const handleChangePassword = useCallback(async () => {
    if (!token) return;
    setPasswordError(null);
    if (!currentPassword.trim()) {
      setPasswordError('Enter your current password');
      return;
    }
    if (!newPassword.trim()) {
      setPasswordError('Enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    setPasswordChanging(true);
    try {
      await changePassword(
        { currentPassword: currentPassword.trim(), newPassword: newPassword.trim() },
        token
      );
      Alert.alert('Success', 'Password changed successfully.');
      closePasswordModal();
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : 'Failed to change password');
    } finally {
      setPasswordChanging(false);
    }
  }, [token, currentPassword, newPassword, confirmPassword, closePasswordModal]);

  const saveProfile = useCallback(async () => {
    if (!user || !token) return;
    setSaving(true);
    try {
      await updateCustomerProfile(
        {
          firstName: editForm.firstName || undefined,
          lastName: editForm.lastName || undefined,
          phoneNumber: editForm.phoneNumber || undefined,
          nic: editForm.nic || undefined,
          dob: editForm.dob || undefined,
          gender: editForm.gender || undefined,
          countryName: editForm.countryName || undefined,
        },
        token
      );
      const updates: Partial<User> = {
        firstName: editForm.firstName || undefined,
        lastName: editForm.lastName || undefined,
        phoneNumber: editForm.phoneNumber || undefined,
        mobile: editForm.phoneNumber || undefined,
        nic: editForm.nic || undefined,
        dob: editForm.dob || undefined,
        gender: editForm.gender || undefined,
        countryName: editForm.countryName || undefined,
      };
      const fullName = [editForm.firstName, editForm.lastName].filter(Boolean).join(' ').trim();
      if (fullName) updates.name = fullName;
      await updateUser(updates);
      setEditing(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Update failed';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  }, [user, token, editForm, updateUser]);

  const pickAndUploadImage = useCallback(async () => {
    if (!user || !token) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photos to change profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    const uri = result.assets[0].uri;
    setUploading(true);
    try {
      const fileName = await uploadProfileImage(uri, { token });
      await updateProfileImageOnServer(fileName, token);
      await updateUser({ profileImageUrl: fileName });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to upload image';
      Alert.alert('Upload failed', message);
    } finally {
      setUploading(false);
    }
  }, [user, token, updateUser]);

  if (!user) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.content}>
          <ThemedText style={styles.hint}>Sign in to see your profile.</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <ThemedText type="title" style={styles.title}>Profile</ThemedText>
        </View>

        <View style={[styles.card, { borderColor: cardBorder }]}>
          <View style={styles.avatarSection}>
            <Pressable
              onPress={pickAndUploadImage}
              disabled={uploading}
              style={({ pressed }) => [styles.avatarWrap, pressed && styles.avatarPressed]}
              accessibilityLabel="Change profile photo"
            >
              <View style={[styles.avatarRing, { borderColor: Theme.primary }]}>
                {getProfileImageUri(user.profileImageUrl) ? (
                  <Image
                    key={user.profileImageUrl ?? 'photo'}
                    source={{
                      uri: getProfileImageUri(user.profileImageUrl)!,
                      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    }}
                    style={styles.avatar}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <ThemedText style={styles.avatarInitials}>{getInitials(user)}</ThemedText>
                  </View>
                )}
                {uploading ? (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                ) : (
                  <View style={styles.changeBadge}>
                    <ThemedText style={styles.changeBadgeText}>Change photo</ThemedText>
                  </View>
                )}
              </View>
            </Pressable>
          </View>

          {!editing ? (
            <>
              <ThemedText style={[styles.sectionTitle, { color: iconColor }]}>Personal details</ThemedText>
              <View style={styles.fieldGroup}>
                <FieldRow label="Name" value={user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined} borderColor={cardBorder} />
                <FieldRow label="First name" value={user.firstName} borderColor={cardBorder} />
                <FieldRow label="Last name" value={user.lastName} borderColor={cardBorder} />
                <FieldRow label="Date of birth" value={user.dob} borderColor={cardBorder} />
                <FieldRow label="Gender" value={user.gender} borderColor={cardBorder} />
                <FieldRow label="NIC" value={user.nic} borderColor={cardBorder} />
                <FieldRow label="Country" value={user.countryName} />
              </View>
              <ThemedText style={[styles.sectionTitle, { color: iconColor }]}>Account & contact</ThemedText>
              <View style={styles.fieldGroup}>
                <FieldRow label="Email" value={user.email} borderColor={cardBorder} />
                <FieldRow label="Username" value={user.username} borderColor={cardBorder} />
                <FieldRow label="Phone" value={user.phoneNumber || user.mobile} borderColor={cardBorder} />
                <FieldRow label="Membership" value={user.membershipType} borderColor={cardBorder} />
                <FieldRow label="Status" value={user.customerStatus || user.userStatus} />
              </View>
              <ThemedText style={[styles.sectionTitle, { color: iconColor }]}>Security</ThemedText>
              <Pressable
                style={({ pressed }) => [styles.passwordBtn, { borderColor: cardBorder }, pressed && styles.editBtnPressed]}
                onPress={openPasswordModal}
              >
                <ThemedText style={[styles.passwordBtnText, { color: Theme.primary }]}>Change password</ThemedText>
                <IconSymbol name="chevron.right" size={20} color={iconColor} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.editBtn, pressed && styles.editBtnPressed]}
                onPress={startEdit}
              >
                <ThemedText style={styles.editBtnText}>Edit profile</ThemedText>
              </Pressable>
            </>
          ) : (
            <>
              <ThemedText style={[styles.sectionTitle, { color: iconColor }]}>Personal details</ThemedText>
              <View style={styles.editFormGroup}>
                <ThemedTextInput
                  label="First name"
                  value={editForm.firstName}
                  onChangeText={(t) => setEditForm((f) => ({ ...f, firstName: t }))}
                  placeholder="First name"
                  containerStyle={styles.inputRow}
                />
                <ThemedTextInput
                  label="Last name"
                  value={editForm.lastName}
                  onChangeText={(t) => setEditForm((f) => ({ ...f, lastName: t }))}
                  placeholder="Last name"
                  containerStyle={styles.inputRow}
                />
                <ThemedTextInput
                  label="Date of birth"
                  value={editForm.dob}
                  onChangeText={(t) => setEditForm((f) => ({ ...f, dob: t }))}
                  placeholder="YYYY-MM-DD"
                  containerStyle={styles.inputRow}
                />
                <ThemedTextInput
                  label="Gender"
                  value={editForm.gender}
                  onChangeText={(t) => setEditForm((f) => ({ ...f, gender: t }))}
                  placeholder="e.g. MALE, FEMALE"
                  containerStyle={styles.inputRow}
                />
                <ThemedTextInput
                  label="NIC"
                  value={editForm.nic}
                  onChangeText={(t) => setEditForm((f) => ({ ...f, nic: t }))}
                  placeholder="NIC"
                  containerStyle={styles.inputRow}
                />
              </View>
              <ThemedText style={[styles.sectionTitle, { color: iconColor }]}>Location & contact</ThemedText>
              <View style={styles.editFormGroup}>
                <ThemedText type="defaultSemiBold" style={styles.countryLabel}>Country</ThemedText>
                <Pressable
                  style={[styles.countryButton, { borderColor: cardBorder }]}
                  onPress={openCountryModal}
                >
                  <ThemedText style={editForm.countryName ? undefined : styles.countryPlaceholder} numberOfLines={1}>
                    {editForm.countryName || 'Search and select country'}
                  </ThemedText>
                  <IconSymbol name="chevron.right" size={20} color={iconColor} />
                </Pressable>
                <ThemedTextInput
                  label="Phone number"
                  value={editForm.phoneNumber}
                  onChangeText={(t) => setEditForm((f) => ({ ...f, phoneNumber: t }))}
                  placeholder="0771234567"
                  keyboardType="phone-pad"
                  containerStyle={styles.inputRow}
                />
              </View>
              <View style={styles.editActions}>
                <Pressable
                  style={({ pressed }) => [styles.cancelBtn, { borderColor: cardBorder }, pressed && styles.editBtnPressed]}
                  onPress={cancelEdit}
                  disabled={saving}
                >
                  <ThemedText style={[styles.cancelBtnText, { color: iconColor }]}>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.updateBtn, pressed && styles.editBtnPressed]}
                  onPress={saveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <ThemedText style={styles.updateBtnText}>Save changes</ThemedText>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <Modal visible={passwordModalVisible} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={closePasswordModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboard}
          >
            <Pressable style={[styles.passwordModalSheet, { backgroundColor: Theme.background, borderColor: cardBorder }]} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalHandle, { backgroundColor: cardBorder }]} />
              <View style={[styles.passwordModalHeader, { backgroundColor: Theme.primary + '12' }]}>
                <View style={[styles.passwordModalIconWrap, { backgroundColor: Theme.primary }]}>
                  <IconSymbol name="lock.fill" size={24} color="#fff" />
                </View>
                <ThemedText type="subtitle" style={[styles.passwordModalTitle, { color: Theme.primary }]}>Change password</ThemedText>
                <ThemedText style={styles.passwordModalSubtitle}>Enter your current password and choose a new one.</ThemedText>
              </View>
              <View style={styles.passwordModalForm}>
                <ThemedTextInput
                  label="Current password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChangeText={(t) => { setCurrentPassword(t); setPasswordError(null); }}
                  secureTextEntry
                  containerStyle={styles.passwordModalInput}
                />
                <ThemedTextInput
                  label="New password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChangeText={(t) => { setNewPassword(t); setPasswordError(null); }}
                  secureTextEntry
                  containerStyle={styles.passwordModalInput}
                />
                <ThemedTextInput
                  label="Confirm new password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setPasswordError(null); }}
                  secureTextEntry
                  containerStyle={styles.passwordModalInput}
                />
                {passwordError ? (
                  <View style={[styles.passwordErrorWrap, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                    <ThemedText style={styles.passwordErrorText}>{passwordError}</ThemedText>
                  </View>
                ) : null}
                <View style={styles.passwordModalActions}>
                  <Pressable
                    style={({ pressed }) => [styles.passwordCancelBtn, { borderColor: cardBorder }, pressed && styles.editBtnPressed]}
                    onPress={closePasswordModal}
                    disabled={passwordChanging}
                  >
                    <ThemedText style={[styles.passwordCancelBtnText, { color: iconColor }]}>Cancel</ThemedText>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.passwordSubmitBtn, pressed && styles.editBtnPressed]}
                    onPress={handleChangePassword}
                    disabled={passwordChanging}
                  >
                    {passwordChanging ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <ThemedText style={styles.passwordSubmitBtnText}>Submit</ThemedText>
                    )}
                  </Pressable>
                </View>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <Modal visible={countryModalVisible} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setCountryModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: Theme.background }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalHandle, { backgroundColor: cardBorder }]} />
            <ThemedText type="subtitle" style={styles.modalTitle}>Select country</ThemedText>
            <ThemedTextInput
              placeholder="Search country..."
              value={countrySearch}
              onChangeText={setCountrySearch}
              containerStyle={styles.modalSearch}
            />
            {countriesLoading ? (
              <ActivityIndicator size="small" color={Theme.primary} style={styles.modalLoader} />
            ) : countriesError ? (
              <ThemedText style={styles.countryError}>{countriesError}</ThemedText>
            ) : (
              <FlatList
                data={countries}
                keyExtractor={(item) => item}
                style={styles.countryList}
                renderItem={({ item }) => (
                  <Pressable style={({ pressed }) => [styles.countryItem, { borderBottomColor: cardBorder }, pressed && styles.countryItemPressed]} onPress={() => selectCountry(item)}>
                    <ThemedText>{item}</ThemedText>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <ThemedText style={styles.emptyCountry}>No countries found. Try a different search.</ThemedText>
                }
              />
            )}
            <Pressable style={styles.modalClose} onPress={() => setCountryModalVisible(false)}>
              <ThemedText style={styles.modalCloseText}>Close</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.background,
  },
  scroll: { flex: 1 },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: Theme.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    overflow: 'hidden',
    ...Layout.shadow.md,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarPressed: { opacity: 0.92 },
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 98,
    height: 98,
    borderRadius: 49,
  },
  avatarPlaceholder: {
    width: 98,
    height: 98,
    borderRadius: 49,
    backgroundColor: Theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '600',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    width: 98,
    height: 98,
    borderRadius: 49,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    backgroundColor: 'rgba(37, 99, 235, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 4,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldRow: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  fieldLabel: {
    fontSize: 12,
    opacity: 0.75,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  editBtn: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: Theme.primary,
    borderRadius: 14,
    alignItems: 'center',
    ...Layout.shadow.sm,
  },
  editBtnPressed: { opacity: 0.9 },
  editBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editFormGroup: {
    marginBottom: 20,
  },
  inputRow: {
    marginBottom: 16,
  },
  countryLabel: { fontSize: 14, marginBottom: 8 },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Layout.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    backgroundColor: Theme.cardBg,
  },
  countryPlaceholder: { color: '#64748B' },
  editActions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 16,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  cancelBtnText: { fontWeight: '600', fontSize: 16 },
  updateBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Theme.primary,
    alignItems: 'center',
    minWidth: 120,
    ...Layout.shadow.sm,
  },
  updateBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  hint: { opacity: 0.8 },
  passwordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Layout.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  passwordBtnText: { fontSize: 16, fontWeight: '500' },
  modalKeyboard: {
    justifyContent: 'flex-end',
  },
  passwordModalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 24,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  passwordModalHeader: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: Layout.radius.lg,
    marginBottom: 24,
    alignItems: 'center',
  },
  passwordModalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  passwordModalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  passwordModalSubtitle: { fontSize: 14, opacity: 0.85, textAlign: 'center' },
  passwordModalForm: { paddingHorizontal: 4 },
  passwordModalInput: { marginBottom: 16 },
  passwordErrorWrap: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    marginBottom: 20,
  },
  passwordErrorText: { color: '#dc2626', fontSize: 14 },
  passwordModalActions: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 24,
  },
  passwordCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  passwordCancelBtnText: { fontSize: 16, fontWeight: '600' },
  passwordSubmitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Layout.radius.lg,
    backgroundColor: Theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  passwordSubmitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
    maxHeight: '72%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { marginBottom: 16, fontSize: 20 },
  modalSearch: { marginBottom: 16 },
  modalLoader: { paddingVertical: 24 },
  countryList: { maxHeight: 300 },
  countryItem: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  countryItemPressed: { opacity: 0.7 },
  emptyCountry: { padding: 24, textAlign: 'center', opacity: 0.75 },
  countryError: { padding: 24, textAlign: 'center', color: '#dc2626' },
  modalClose: { marginTop: 20, alignItems: 'center', paddingVertical: 12 },
  modalCloseText: { fontSize: 16, fontWeight: '600', color: Theme.primary },
});
