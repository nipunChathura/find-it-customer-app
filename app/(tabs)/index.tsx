/**
 * Home Screen: header (#2563EB), search bar, map (~40%), scrollable nearest outlet cards.
 * Uses theme constants; notification → Notifications, profile → Profile tab, logout → clear token & login.
 */

import { HomeOutletCard } from '@/components/home-outlet-card';
import { OutletsMap } from '@/components/outlets-map';
import { SearchBar } from '@/components/search-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Layout, Theme } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useFavorites } from '@/contexts/favorites-context';
import { api } from '@/services/api';
import type { Outlet } from '@/types/api';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Keyboard,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MAP_HEIGHT_RATIO = 0.4;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const fetchNearest = useCallback(
    async (query: string, lat?: number, lng?: number) => {
      setLoading(true);
      try {
        const list = await api.searchNearestOutlets(query, lat, lng);
        setOutlets(list);
      } catch (e) {
        setOutlets([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!mounted) return;
        if (status !== 'granted') {
          setLocationError('Location permission denied');
          fetchNearest('', undefined, undefined);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocation({ lat, lng });
        fetchNearest('', lat, lng);
      } catch (e) {
        if (mounted) {
          setLocationError('Could not get location');
          fetchNearest('', undefined, undefined);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [fetchNearest]);

  const handleSearchSubmit = useCallback(() => {
    Keyboard.dismiss();
    fetchNearest(searchQuery.trim(), location?.lat, location?.lng);
  }, [searchQuery, location, fetchNearest]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const initialRegion =
    location != null
      ? {
          latitude: location.lat,
          longitude: location.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }
      : undefined;

  const mapHeight = Math.round(SCREEN_HEIGHT * MAP_HEIGHT_RATIO);

  return (
    <ThemedView style={styles.container}>
      {/* Header: #2563EB, logo left, "Find It" center, white icons right */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <ThemedText style={styles.headerTitle}>Find It</ThemedText>
        </View>
        <View style={styles.headerIcons}>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            onPress={() => router.push('/notifications')}
          >
            <IconSymbol name="bell.fill" size={24} color={Theme.white} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <IconSymbol name="person.circle.fill" size={24} color={Theme.white} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            onPress={handleLogout}
          >
            <IconSymbol
              name="rectangle.portrait.and.arrow.right"
              size={22}
              color={Theme.white}
            />
          </Pressable>
        </View>
      </View>

      {/* Search bar: white bg, rounded, shadow, 12–16px padding */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, Layout.shadow.sm]}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search items, products or services..."
            onSubmit={handleSearchSubmit}
          />
        </View>
      </View>

      {/* Map: ~40% height, user location + 5 nearest outlets, blue markers */}
      <View style={[styles.mapContainer, { height: mapHeight }]}>
        {loading && outlets.length === 0 ? (
          <View style={styles.mapPlaceholder}>
            <ActivityIndicator size="large" color={Theme.primary} />
          </View>
        ) : (
          <OutletsMap
            outlets={outlets}
            initialRegion={initialRegion}
            style={StyleSheet.absoluteFill}
            pinColor={Theme.primary}
          />
        )}
      </View>

      {/* Nearest outlet list */}
      <View style={styles.listHeader}>
        <ThemedText type="defaultSemiBold" style={styles.listTitle}>
          Nearest outlets
        </ThemedText>
        {locationError ? (
          <ThemedText style={styles.locationHint}>{locationError}</ThemedText>
        ) : null}
      </View>
      {loading && outlets.length === 0 ? (
        <View style={styles.loadingList}>
          <ActivityIndicator size="small" color={Theme.primary} />
        </View>
      ) : (
        <FlatList
          data={outlets}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <HomeOutletCard
              outlet={item}
              isFavorite={isFavorite(item.id)}
              onToggleFavorite={() => toggleFavorite(item)}
            />
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Theme.primary,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 36, height: 36 },
  headerTitle: {
    fontWeight: '700',
    fontSize: 20,
    color: Theme.white,
  },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 8 },
  iconBtnPressed: { opacity: 0.8 },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Theme.background,
  },
  searchBar: {
    backgroundColor: Theme.inputBg,
    borderRadius: Layout.radius.lg,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 48,
    justifyContent: 'center',
  },
  mapContainer: {
    width: '100%',
    minHeight: 200,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.background,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  listTitle: { fontSize: 17 },
  locationHint: { fontSize: 12, opacity: 0.7, marginTop: 2 },
  loadingList: {
    padding: 24,
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
});
