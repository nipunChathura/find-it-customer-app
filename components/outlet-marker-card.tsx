import { Layout } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { Outlet } from '@/types/api';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

type OutletMarkerCardProps = {
  outlet: Outlet;
};

export function OutletMarkerCard({ outlet }: OutletMarkerCardProps) {
  const cardBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'cardBorder');
  const availableColor = useThemeColor({}, 'available');

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }, Layout.shadow.lg]}>
      <ThemedText type="subtitle" style={styles.name} numberOfLines={1}>
        {outlet.name}
      </ThemedText>
      <ThemedText style={styles.type}>{outlet.outletType}</ThemedText>
      <ThemedText style={styles.address} numberOfLines={2}>
        {outlet.address}
      </ThemedText>
      {outlet.isOpen && (
        <ThemedText type="defaultSemiBold" style={[styles.openText, { color: availableColor }]}>
          Open Now
        </ThemedText>
      )}
      {outlet.distanceKm != null && (
        <ThemedText style={styles.distance}>
          {outlet.distanceKm < 1
            ? `${Math.round(outlet.distanceKm * 1000)} m away`
            : `${outlet.distanceKm.toFixed(1)} km away`}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  name: {
    marginBottom: 4,
  },
  type: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 6,
  },
  address: {
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 8,
  },
  openText: {
    fontSize: 14,
    marginBottom: 4,
  },
  distance: {
    fontSize: 13,
    opacity: 0.7,
  },
});
