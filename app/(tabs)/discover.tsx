/**
 * Discover screen: search for an item → show 5 nearest outlets on map + list.
 * Uses user location for distance; saves search to history. List shows name, distance, rating.
 */

import { Layout } from '@/constants/theme';
import { useHistory } from '@/contexts/history-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { api } from '@/services/api';
import type { Outlet } from '@/types/api';
import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OutletListItem } from '@/components/outlet-list-item';
import { OutletsMap } from '@/components/outlets-map';
import { SearchBar } from '@/components/search-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

type ViewMode = 'list' | 'map';

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { addSearchHistory } = useHistory();
  const [searchQuery, setSearchQuery] = useState('');
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [locationError, setLocationError] = useState<string | null>(null);

  const tint = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'icon');

  /** Run search: get user location, fetch 5 nearest outlets, save to history */
  const runSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query) return;
    setLoading(true);
    setLocationError(null);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      } catch {
        setLocationError('Location unavailable; showing default order.');
      }
      const result = await api.searchNearestOutlets(query, lat, lng);
      setOutlets(result);
      addSearchHistory(query, result);
    } catch {
      setOutlets([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, addSearchHistory]);

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search for an item..."
          onSubmit={runSearch}
        />
        <Pressable
          style={({ pressed }) => [styles.searchBtn, pressed && styles.pressed, loading && styles.searchBtnDisabled]}
          onPress={runSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <IconSymbol name="magnifyingglass" size={22} color="#fff" />
          )}
        </Pressable>
      </View>

      {locationError ? (
        <View style={styles.banner}>
          <ThemedText style={styles.bannerText}>{locationError}</ThemedText>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={tint} />
          <ThemedText style={styles.loadingText}>Finding nearest outlets...</ThemedText>
        </View>
      ) : outlets.length === 0 ? (
        <View style={styles.centered}>
          <ThemedText style={styles.emptyText}>
            Search for an item to see the 5 nearest outlets on the map and list.
          </ThemedText>
        </View>
      ) : (
        <>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <IconSymbol name="list.bullet" size={20} color={viewMode === 'list' ? '#fff' : iconColor} />
              <ThemedText style={viewMode === 'list' ? styles.toggleTextActive : undefined}>
                List
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
              onPress={() => setViewMode('map')}
            >
              <IconSymbol name="map" size={20} color={viewMode === 'map' ? '#fff' : iconColor} />
              <ThemedText style={viewMode === 'map' ? styles.toggleTextActive : undefined}>
                Map
              </ThemedText>
            </Pressable>
          </View>

          {viewMode === 'map' ? (
            <View style={styles.mapWrap}>
              <OutletsMap outlets={outlets} />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {outlets.map((outlet) => (
                <OutletListItem key={outlet.id} outlet={outlet} />
              ))}
            </ScrollView>
          )}
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBtn: {
    backgroundColor: Layout.primary,
    width: 44,
    height: 44,
    borderRadius: Layout.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.9 },
  searchBtnDisabled: { opacity: 0.7 },
  banner: { backgroundColor: 'rgba(59, 130, 246, 0.15)', paddingVertical: 8, paddingHorizontal: 16 },
  bannerText: { fontSize: 13, textAlign: 'center' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: { marginTop: 12, opacity: 0.8 },
  emptyText: { textAlign: 'center', opacity: 0.8 },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Layout.radius.md,
  },
  toggleBtnActive: { backgroundColor: Layout.primary },
  toggleTextActive: { color: '#fff', fontWeight: '600' },
  mapWrap: { flex: 1, minHeight: 280 },
  listContent: { padding: 16, paddingBottom: 32 },
});
