/**
 * Outlet list item for search results: name, distance, rating. Tappable to open outlet detail.
 */

import { Layout } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { Outlet } from '@/types/api';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

interface OutletListItemProps {
  outlet: Outlet;
}

export function OutletListItem({ outlet }: OutletListItemProps) {
  const router = useRouter();
  const cardBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'cardBorder');

  const distanceText =
    outlet.distanceKm != null
      ? outlet.distanceKm < 1
        ? `${Math.round(outlet.distanceKm * 1000)} m`
        : `${outlet.distanceKm.toFixed(1)} km`
      : '—';
  const rating = outlet.rating ?? 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: cardBg, borderColor },
        Layout.shadow.sm,
        pressed && styles.pressed,
      ]}
      onPress={() => router.push(`/outlet/${outlet.id}`)}
    >
      <View style={styles.row}>
        <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={1}>
          {outlet.name}
        </ThemedText>
        {rating > 0 && (
          <ThemedText style={styles.rating}>★ {rating.toFixed(1)}</ThemedText>
        )}
      </View>
      <ThemedText style={styles.meta}>
        {outlet.outletType} · {distanceText} away
      </ThemedText>
      <ThemedText style={styles.address} numberOfLines={1}>
        {outlet.address}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  pressed: { opacity: 0.9 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  name: { flex: 1, fontSize: 16 },
  rating: { fontSize: 14, opacity: 0.9 },
  meta: { marginTop: 4, fontSize: 13, opacity: 0.8 },
  address: { marginTop: 2, fontSize: 13, opacity: 0.7 },
});
