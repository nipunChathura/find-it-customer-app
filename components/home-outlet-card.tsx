

import { Layout, Theme } from '@/constants/theme';
import { setOutletCache } from '@/services/outlet-cache';
import type { Outlet } from '@/types/api';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';

type HomeOutletCardProps = {
  outlet: Outlet;
  isFavorite: boolean;
  onAddFavorite: (outlet: Outlet, nickname: string) => void;
  onRemoveFavorite: (outletId: string) => void;
};

function StarRating({ rating = 0 }: { rating?: number }) {
  const full = Math.min(5, Math.round(rating));
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <ThemedText key={i} style={styles.star}>
          {i <= full ? '★' : '☆'}
        </ThemedText>
      ))}
      <ThemedText style={styles.ratingText}> {rating.toFixed(1)}</ThemedText>
    </View>
  );
}

export function HomeOutletCard({ outlet, isFavorite, onAddFavorite, onRemoveFavorite }: HomeOutletCardProps) {
  const router = useRouter();
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);
  const [removeConfirmVisible, setRemoveConfirmVisible] = useState(false);
  const [nickname, setNickname] = useState('');

  const distanceText =
    outlet.distanceKm != null
      ? outlet.distanceKm < 1
        ? `${Math.round(outlet.distanceKm * 1000)} m`
        : `${outlet.distanceKm.toFixed(1)} km`
      : '—';

  const openNicknameModal = () => {
    setNickname(outlet.name);
    setNicknameModalVisible(true);
  };

  const closeNicknameModal = () => {
    setNicknameModalVisible(false);
    setNickname('');
  };

  const confirmAddFavorite = () => {
    onAddFavorite(outlet, nickname.trim() || outlet.name);
    closeNicknameModal();
  };

  const confirmRemoveFavorite = () => {
    onRemoveFavorite(outlet.id);
    setRemoveConfirmVisible(false);
  };

  const handleHeartPress = () => {
    if (isFavorite) {
      setRemoveConfirmVisible(true);
    } else {
      openNicknameModal();
    }
  };

  return (
    <View style={[styles.card, Layout.shadow.md]}>
      <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={1}>
        {outlet.name}
      </ThemedText>
      <StarRating rating={outlet.rating ?? 0} />
      <ThemedText style={styles.distance}>{distanceText} away</ThemedText>
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.viewRouteBtn, pressed && styles.btnPressed]}
          onPress={() => {
            setOutletCache(outlet);
            router.push({
              pathname: '/outlet/[id]',
              params: {
                id: outlet.id,
                name: outlet.name,
                address: outlet.address,
                outletType: outlet.outletType,
                latitude: String(outlet.latitude),
                longitude: String(outlet.longitude),
                isOpen: outlet.isOpen ? '1' : '0',
                ...(outlet.distanceKm != null && { distanceKm: String(outlet.distanceKm) }),
                ...(outlet.rating != null && { rating: String(outlet.rating) }),
              },
            });
          }}
        >
          <ThemedText style={styles.viewRouteText}>View Outlet</ThemedText>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.favBtn, pressed && styles.btnPressed]}
          onPress={handleHeartPress}
        >
          <IconSymbol
            name="heart.fill"
            size={24}
            color={isFavorite ? '#dc2626' : Theme.textPrimary}
          />
        </Pressable>
      </View>

      <Modal
        visible={nicknameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeNicknameModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeNicknameModal}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <ThemedText type="defaultSemiBold" style={styles.modalTitle}>Add to Favorites</ThemedText>
            <ThemedText style={styles.modalLabel}>Nickname (optional)</ThemedText>
            <TextInput
              style={styles.nicknameInput}
              placeholder={outlet.name}
              placeholderTextColor={Theme.textPrimary + '99'}
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="words"
            />
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalCancel, pressed && styles.btnPressed]}
                onPress={closeNicknameModal}
              >
                <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalConfirm, pressed && styles.btnPressed]}
                onPress={confirmAddFavorite}
              >
                <ThemedText style={styles.modalConfirmText}>Add</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={removeConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRemoveConfirmVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRemoveConfirmVisible(false)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <ThemedText type="defaultSemiBold" style={styles.modalTitle}>Remove from Favorites?</ThemedText>
            <ThemedText style={styles.removeConfirmMessage}>
              Remove "{outlet.name}" from your favorites?
            </ThemedText>
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalCancel, pressed && styles.btnPressed]}
                onPress={() => setRemoveConfirmVisible(false)}
              >
                <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalRemove, pressed && styles.btnPressed]}
                onPress={confirmRemoveFavorite}
              >
                <ThemedText style={styles.modalConfirmText}>Remove</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.cardBg,
    borderRadius: Layout.radius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  name: { fontSize: 17, marginBottom: 6 },
  starRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  star: { fontSize: 14, color: '#f59e0b' },
  ratingText: { fontSize: 13, opacity: 0.9 },
  distance: { fontSize: 14, opacity: 0.8, marginBottom: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  viewRouteBtn: {
    backgroundColor: Theme.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Layout.radius.md,
  },
  viewRouteText: { color: Theme.white, fontWeight: '600', fontSize: 14 },
  favBtn: { padding: 4 },
  btnPressed: { opacity: 0.9 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: Theme.cardBg,
    borderRadius: Layout.radius.lg,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: { fontSize: 18, marginBottom: 16 },
  modalLabel: { fontSize: 14, opacity: 0.9, marginBottom: 8 },
  nicknameInput: {
    borderWidth: 1,
    borderColor: Theme.primary + '60',
    borderRadius: Layout.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Theme.textPrimary,
    marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: Layout.radius.md },
  modalCancel: { backgroundColor: Theme.inputBg },
  modalConfirm: { backgroundColor: Theme.primary },
  modalRemove: { backgroundColor: '#dc2626' },
  modalCancelText: { color: Theme.textPrimary, fontWeight: '600' },
  modalConfirmText: { color: Theme.white, fontWeight: '600' },
  removeConfirmMessage: { fontSize: 15, opacity: 0.9, marginBottom: 20 },
});
