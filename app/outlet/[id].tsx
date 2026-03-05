/**
 * Outlet detail screen: info, Navigate (route from current location, distance, ETA),
 * "I've arrived" to add to favorites and open feedback.
 */

import { Layout } from '@/constants/theme';
import { useFavorites } from '@/contexts/favorites-context';
import { useHistory } from '@/contexts/history-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { api } from '@/services/api';
import type { Outlet, RouteInfo } from '@/types/api';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// Dummy outlet store when opening by id (in real app, fetch from API)
const DUMMY_OUTLETS: Outlet[] = [
  { id: 'o1', name: 'Tech Haven', outletType: 'Retail', address: '123 Main St, Colombo', latitude: 6.9271, longitude: 79.8612, isOpen: true, distanceKm: 1.2, rating: 4.5 },
  { id: 'o2', name: 'Gadget Mall', outletType: 'Mall', address: '456 Oak Ave, Colombo', latitude: 6.9300, longitude: 79.8700, isOpen: true, distanceKm: 2.5, rating: 4.2 },
  { id: 'o3', name: 'Fresh Mart', outletType: 'Supermarket', address: '789 Market Rd', latitude: 6.9280, longitude: 79.8650, isOpen: true, distanceKm: 0.8, rating: 4.8 },
  { id: 'o4', name: 'Health Plus', outletType: 'Pharmacy', address: '321 Health St', latitude: 6.9250, longitude: 79.8580, isOpen: true, distanceKm: 1.5, rating: 4.6 },
  { id: 'o5', name: 'City Central', outletType: 'Mall', address: '100 Central Blvd', latitude: 6.9320, longitude: 79.8480, isOpen: true, distanceKm: 3.0, rating: 4.0 },
  { id: 'o6', name: 'Quick Stop', outletType: 'Convenience', address: '55 Park Lane', latitude: 6.9200, longitude: 79.8550, isOpen: true, distanceKm: 1.8, rating: 3.9 },
];

function getOutletById(id: string): Outlet | undefined {
  return DUMMY_OUTLETS.find((o) => o.id === id);
}

export default function OutletDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addFavorite, isFavorite } = useFavorites();
  const { addVisitedOutlet } = useHistory();
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const tint = useThemeColor({}, 'tint');

  useEffect(() => {
    const o = id ? getOutletById(id) : undefined;
    setOutlet(o ?? null);
  }, [id]);

  /** Fetch route from current location to outlet; show distance and ETA */
  const loadRoute = useCallback(async () => {
    if (!outlet) return;
    setRouteLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setRouteInfo(null);
        setRouteLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const info = await api.getRoute(
        loc.coords.latitude,
        loc.coords.longitude,
        outlet.latitude,
        outlet.longitude
      );
      setRouteInfo(info);
    } catch {
      setRouteInfo(null);
    } finally {
      setRouteLoading(false);
    }
  }, [outlet]);

  useEffect(() => {
    if (outlet) loadRoute();
  }, [outlet, loadRoute]);

  /** User marks "I've arrived": add to visited, prompt add to favorites, then open feedback */
  const handleArrived = useCallback(() => {
    if (!outlet) return;
    addVisitedOutlet(outlet);
    const fav = isFavorite(outlet.id);
    if (!fav) {
      Alert.alert(
        'Add to favorites?',
        `Add ${outlet.name} to your favorites?`,
        [
          { text: 'Not now', onPress: () => router.push(`/feedback/${outlet.id}`) },
          { text: 'Add', onPress: () => { addFavorite(outlet); router.push(`/feedback/${outlet.id}`); } },
        ]
      );
    } else {
      router.push(`/feedback/${outlet.id}`);
    }
  }, [outlet, addVisitedOutlet, addFavorite, isFavorite, router]);

  if (!outlet) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.empty}>Outlet not found.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="title" style={styles.name}>{outlet.name}</ThemedText>
        <ThemedText style={styles.type}>{outlet.outletType}</ThemedText>
        <ThemedText style={styles.address}>{outlet.address}</ThemedText>
        {outlet.rating != null && (
          <ThemedText style={styles.rating}>★ {outlet.rating.toFixed(1)}</ThemedText>
        )}

        <View style={styles.section}>
          <ThemedText type="subtitle">Route</ThemedText>
          {routeLoading ? (
            <ActivityIndicator size="small" color={tint} style={styles.routeLoader} />
          ) : routeInfo ? (
            <>
              <ThemedText style={styles.routeText}>
                Distance: {routeInfo.distanceKm < 1
                  ? `${Math.round(routeInfo.distanceKm * 1000)} m`
                  : `${routeInfo.distanceKm.toFixed(1)} km`}
              </ThemedText>
              <ThemedText style={styles.routeText}>
                Est. travel time: ~{routeInfo.durationMinutes} min
              </ThemedText>
            </>
          ) : (
            <ThemedText style={styles.hint}>Enable location to see distance and time.</ThemedText>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={handleArrived}
        >
          <ThemedText style={styles.buttonText}>I've arrived — Add to favorites & feedback</ThemedText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          onPress={() => router.push(`/feedback/${outlet.id}`)}
        >
          <ThemedText type="link">Submit feedback only</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  empty: { padding: 20 },
  name: { marginBottom: 4 },
  type: { marginBottom: 4, opacity: 0.8 },
  address: { marginBottom: 8, opacity: 0.9 },
  rating: { marginBottom: 20, opacity: 0.9 },
  section: { marginBottom: 20 },
  map: { marginVertical: 12 },
  routeLoader: { marginVertical: 8 },
  routeText: { marginTop: 4, opacity: 0.9 },
  hint: { marginTop: 4, opacity: 0.7, fontSize: 14 },
  button: {
    backgroundColor: Layout.primary,
    borderRadius: Layout.radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryBtn: { alignItems: 'center', paddingVertical: 12 },
  pressed: { opacity: 0.9 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
