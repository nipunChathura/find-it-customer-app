/**
 * Route screen: map with route polyline from current location to outlet.
 * Travel mode: Car, Bike, Walk.
 */

import { Theme } from '@/constants/theme';
import { fetchRoute, type RouteResult, type TravelMode } from '@/services/route-directions';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

const MODES: { key: TravelMode; label: string; icon: 'car.fill' | 'bicycle' | 'figure.walk' }[] = [
  { key: 'car', label: 'Car', icon: 'car.fill' },
  { key: 'bike', label: 'Bike', icon: 'bicycle' },
  { key: 'walk', label: 'Walk', icon: 'figure.walk' },
];

function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

/** Map style: hide POIs; keep road names and city/locality names visible. */
const MAP_STYLE_ROADS_AND_CITIES = [
  { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', elementType: 'all', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];
function formatDuration(s: number): string {
  const min = Math.round(s / 60);
  return min < 60 ? `~${min} min` : `~${Math.round(min / 60)} h`;
}

export default function RouteScreen() {
  const params = useLocalSearchParams<{
    destLat: string;
    destLng: string;
    outletName?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const destLat = parseFloat(params.destLat ?? '0');
  const destLng = parseFloat(params.destLng ?? '0');
  const outletName = params.outletName ?? 'Destination';

  const mapRef = useRef<MapView>(null);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mode, setMode] = useState<TravelMode>('car');
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRouteForMode = useCallback(
    async (originLat: number, originLng: number, travelMode: TravelMode) => {
      setLoading(true);
      const result = await fetchRoute(originLat, originLng, destLat, destLng, travelMode);
      setRoute(result);
      setLoading(false);
    },
    [destLat, destLng]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission required');
        setLoading(false);
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        const { latitude, longitude } = loc.coords;
        setOrigin({ lat: latitude, lng: longitude });
        const result = await fetchRoute(latitude, longitude, destLat, destLng, 'car');
        if (!cancelled) setRoute(result);
      } catch {
        if (!cancelled) setLocationError('Could not get location');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [destLat, destLng]);

  useEffect(() => {
    if (!origin) return;
    fetchRouteForMode(origin.lat, origin.lng, mode);
  }, [mode, origin, fetchRouteForMode]);

  // Fit map to show full route from current location to destination
  useEffect(() => {
    if (!route?.coordinates?.length || !origin) return;
    const points = [
      { latitude: origin.lat, longitude: origin.lng },
      ...route.coordinates,
      { latitude: destLat, longitude: destLng },
    ];
    mapRef.current?.fitToCoordinates(points, {
      edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
      animated: true,
    });
  }, [route, origin, destLat, destLng]);

  const region =
    origin && (destLat !== 0 || destLng !== 0)
      ? {
          latitude: (origin.lat + destLat) / 2,
          longitude: (origin.lng + destLng) / 2,
          latitudeDelta: Math.max(0.05, Math.abs(origin.lat - destLat) * 2.5),
          longitudeDelta: Math.max(0.05, Math.abs(origin.lng - destLng) * 2.5),
        }
      : {
          latitude: destLat || 6.9271,
          longitude: destLng || 79.8612,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };

  if (locationError) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.error}>{locationError}</ThemedText>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ThemedText style={styles.backBtnText}>Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={Theme.primary} />
          <ThemedText style={styles.backBtnText}>Back</ThemedText>
        </Pressable>
        <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={1}>
          {outletName}
        </ThemedText>
      </View>

      <View style={styles.modeRow}>
        {MODES.map((m) => (
          <Pressable
            key={m.key}
            style={[
              styles.modeBtn,
              mode === m.key && styles.modeBtnActive,
            ]}
            onPress={() => setMode(m.key)}
          >
            <IconSymbol
              name={m.icon}
              size={20}
              color={mode === m.key ? '#fff' : Theme.textPrimary}
            />
            <ThemedText
              style={[styles.modeLabel, mode === m.key && styles.modeLabelActive]}
            >
              {m.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Theme.primary} />
          <ThemedText style={styles.loaderText}>
            {route ? `Loading ${mode === 'car' ? 'Car' : mode === 'bike' ? 'Bike' : 'Walk'} route…` : 'Getting your location…'}
          </ThemedText>
        </View>
      ) : null}

      {route && !loading ? (
        <View style={styles.stats}>
          <ThemedText type="defaultSemiBold" style={styles.stat}>
            {formatDistance(route.distanceMeters)} · {formatDuration(route.durationSeconds)}
            <ThemedText style={styles.statMode}> ({mode === 'car' ? 'Car' : mode === 'bike' ? 'Bike' : 'Walk'})</ThemedText>
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          showsUserLocation
          showsMyLocationButton
          customMapStyle={MAP_STYLE_ROADS_AND_CITIES}
        >
          {origin && (
            <Marker
              coordinate={{ latitude: origin.lat, longitude: origin.lng }}
              title="Your location"
              pinColor={Theme.primary}
            />
          )}
          <Marker
            coordinate={{ latitude: destLat, longitude: destLng }}
            title={outletName}
            pinColor="#E53935"
          />
          {route && origin && route.coordinates.length > 0 && (
            <Polyline
              coordinates={[
                { latitude: origin.lat, longitude: origin.lng },
                ...route.coordinates,
              ]}
              strokeColor={Theme.primary}
              strokeWidth={4}
            />
          )}
        </MapView>
        <View style={styles.destinationLabel} pointerEvents="none">
          <ThemedText type="defaultSemiBold" style={styles.destinationLabelText} numberOfLines={1}>
            {outletName}
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  backBtnText: { fontSize: 16, color: Theme.primary },
  title: { flex: 1, fontSize: 17 },
  modeRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.primary,
  },
  modeBtnActive: {
    backgroundColor: Theme.primary,
    borderColor: Theme.primary,
  },
  modeLabel: { fontSize: 14 },
  modeLabelActive: { color: '#fff', fontWeight: '600' },
  stats: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  stat: { fontSize: 14, opacity: 0.9 },
  statMode: { fontWeight: '400', opacity: 0.85 },
  loader: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 180,
    alignItems: 'center',
    zIndex: 1,
  },
  loaderText: { marginTop: 8, fontSize: 14 },
  error: { padding: 20, textAlign: 'center' },
  mapWrap: { flex: 1, minHeight: 300 },
  destinationLabel: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  destinationLabelText: { fontSize: 15, textAlign: 'center' },
});
