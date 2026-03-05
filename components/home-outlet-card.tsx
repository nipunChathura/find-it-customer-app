/**
 * Reusable outlet card for Home: name, rating, distance, View Route + Add to Favorite.
 * White background, rounded corners, soft shadow, 16px padding.
 */

import { Layout, Theme } from '@/constants/theme';
import type { Outlet } from '@/types/api';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';

type HomeOutletCardProps = {
  outlet: Outlet;
  isFavorite: boolean;
  onToggleFavorite: () => void;
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

export function HomeOutletCard({ outlet, isFavorite, onToggleFavorite }: HomeOutletCardProps) {
  const router = useRouter();
  const distanceText =
    outlet.distanceKm != null
      ? outlet.distanceKm < 1
        ? `${Math.round(outlet.distanceKm * 1000)} m`
        : `${outlet.distanceKm.toFixed(1)} km`
      : '—';

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
          onPress={() => router.push(`/outlet/${outlet.id}`)}
        >
          <ThemedText style={styles.viewRouteText}>View Route</ThemedText>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.favBtn, pressed && styles.btnPressed]}
          onPress={onToggleFavorite}
        >
          <IconSymbol
            name="heart.fill"
            size={24}
            color={isFavorite ? '#dc2626' : Theme.textPrimary}
          />
        </Pressable>
      </View>
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
});
