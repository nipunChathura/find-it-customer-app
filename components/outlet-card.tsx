import { Layout } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { Outlet } from '@/types/api';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

type OutletCardProps = {
  outlet: Outlet;
};

export function OutletCard({ outlet }: OutletCardProps) {
  const cardBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'cardBorder');
  const availableColor = useThemeColor({}, 'available');

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }, Layout.shadow.md]}>
      <View style={styles.row}>
        <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={1}>
          {outlet.name}
        </ThemedText>
        {outlet.isOpen && (
          <View style={styles.openBadge}>
            <ThemedText style={[styles.openBadgeText, { color: availableColor }]}>
              Open Now
            </ThemedText>
          </View>
        )}
      </View>
      <ThemedText style={styles.type}>{outlet.outletType}</ThemedText>
      <ThemedText style={styles.address} numberOfLines={2}>
        {outlet.address}
      </ThemedText>
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
    padding: Layout.radius.lg,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 17,
  },
  openBadge: {},
  openBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  type: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.8,
  },
  address: {
    marginTop: 6,
    fontSize: 14,
    opacity: 0.9,
  },
  distance: {
    marginTop: 6,
    fontSize: 13,
    opacity: 0.7,
  },
});
