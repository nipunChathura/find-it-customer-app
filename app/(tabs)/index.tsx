/**
 * Home Screen: header (#2563EB), search bar, map (~40%), scrollable nearest outlet cards.
 * Uses theme constants; notification → Notifications, profile → Profile tab, logout → clear token & login.
 */

import { FilterSheet, type FilterState } from '@/components/filter-sheet';
import { HomeOutletCard } from '@/components/home-outlet-card';
import { NotificationPopup } from '@/components/notification-popup';
import { OutletsMap } from '@/components/outlets-map';
import { SearchBar } from '@/components/search-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { OUTLET_TYPE_VALUES } from '@/constants/outlet-types';
import { Layout, Theme } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useFavorites } from '@/contexts/favorites-context';
import { useHistory } from '@/contexts/history-context';
import { api } from '@/services/api';
import { getFindItCategories, getNearestOutlets, getNotifications, saveSearchHistory } from '@/services/customer-api';
import type { ItemCategory, Outlet } from '@/types/api';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useFocusEffect, useGlobalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MAP_HEIGHT_RATIO = 0.4;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomeScreen() {
  const { logout, token, user } = useAuth();
  const { isFavorite, addFavorite, removeFavoriteByOutletId } = useFavorites();
  const { refreshSearchHistory } = useHistory();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const searchParams = useGlobalSearchParams<{
    searchLat?: string;
    searchLng?: string;
    searchDistanceKm?: string;
    searchText?: string;
  }>();

  const [searchQuery, setSearchQuery] = useState('');
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ maxDistanceKm: 1 });
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [notificationPopupVisible, setNotificationPopupVisible] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNearest = useCallback(
    async (
      query: string,
      lat?: number,
      lng?: number,
      filterState?: FilterState,
      isRefresh = false,
      saveToHistory = false
    ) => {
      if (!isRefresh) setLoading(true);
      else setRefreshing(true);
      const distanceKm = filterState?.maxDistanceKm ?? 10;
      const outletType = filterState?.outletType ?? null;
      try {
        if (token && lat != null && lng != null) {
          const list = await getNearestOutlets(token, {
            latitude: lat,
            longitude: lng,
            itemName: query.trim(),
            distanceKm,
            categoryId: null,
            outletType,
          });
          setOutlets(list);
          const hasSearchValue = query.trim() !== '';
          if (saveToHistory && hasSearchValue) {
            await saveSearchHistory(token, {
              searchText: query.trim(),
              latitude: lat,
              longitude: lng,
              distanceKm,
              categoryId: null,
              outletType,
            });
            refreshSearchHistory();
          }
        } else {
          const opts = {
            category: filterState?.category,
            outletType: filterState?.outletType,
            maxDistanceKm: filterState?.maxDistanceKm ?? 1,
          };
          const list = await api.searchNearestOutlets(query, lat, lng, opts);
          setOutlets(list);
        }
      } catch (e) {
        setOutlets([]);
      } finally {
        if (!isRefresh) setLoading(false);
        else setRefreshing(false);
      }
    },
    [token, refreshSearchHistory]
  );

  const loadUnreadNotificationCount = useCallback(async () => {
    const userId = user?.userId != null ? String(user.userId) : null;
    if (!token || !userId) return;
    try {
      const list = await getNotifications(token, userId);
      const unread = list.filter((n) => !n.read).length;
      setUnreadNotificationCount(unread);
    } catch {
      setUnreadNotificationCount(0);
    }
  }, [token, user?.userId]);

  const onRefresh = useCallback(async () => {
    let lat = location?.lat;
    let lng = location?.lng;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        setLocation({ lat, lng });
      }
    } catch {
      // keep previous location
    }
    await fetchNearest(searchQuery.trim(), lat, lng, filters, true, false);
    loadUnreadNotificationCount();
  }, [location, searchQuery, filters, fetchNearest, loadUnreadNotificationCount]);

  useEffect(() => {
    loadUnreadNotificationCount();
  }, [loadUnreadNotificationCount]);

  useFocusEffect(
    useCallback(() => {
      loadUnreadNotificationCount();
    }, [loadUnreadNotificationCount])
  );

  useFocusEffect(
    useCallback(() => {
      const lat = searchParams.searchLat != null ? parseFloat(searchParams.searchLat) : NaN;
      const lng = searchParams.searchLng != null ? parseFloat(searchParams.searchLng) : NaN;
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        const distanceKm = searchParams.searchDistanceKm != null ? parseFloat(searchParams.searchDistanceKm) : 5;
        const query = searchParams.searchText ?? '';
        setSearchQuery(query);
        setFilters((f) => ({ ...f, maxDistanceKm: distanceKm }));
        setLocation({ lat, lng });
        fetchNearest(query, lat, lng, { maxDistanceKm: distanceKm }, false, false);
        router.replace('/(tabs)');
      }
    }, [searchParams.searchLat, searchParams.searchLng, searchParams.searchDistanceKm, searchParams.searchText, fetchNearest, router])
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (token) {
          const findItCats = await getFindItCategories({ token, name: '', categoryType: '', status: '' });
          if (mounted) setCategories(findItCats.slice(0, 10).map((c) => c.categoryName));
        } else {
          const mockCats = await api.getCategories();
          if (mounted) setCategories(mockCats);
        }
      } catch {
        if (mounted) setCategories([]);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  const fetchCategoriesByName = useCallback(
    async (name: string) => {
      if (!token) return;
      setCategoriesLoading(true);
      try {
        const list = await getFindItCategories({
          token,
          name: name.trim(),
          categoryType: '',
          status: '',
        });
        setCategories(list.slice(0, 10).map((c) => c.categoryName));
      } catch {
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!mounted) return;
        if (status !== 'granted') {
          setLocationError('Location permission denied');
          fetchNearest('', undefined, undefined, filters);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocation({ lat, lng });
        fetchNearest('', lat, lng, filters);
      } catch (e) {
        if (mounted) {
          setLocationError('Could not get location');
          fetchNearest('', undefined, undefined, filters);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [fetchNearest]);

  const handleSearchSubmit = useCallback(() => {
    Keyboard.dismiss();
    fetchNearest(searchQuery.trim(), location?.lat, location?.lng, filters, false, true);
  }, [searchQuery, location, filters, fetchNearest]);

  const handleApplyFilters = useCallback(
    (newFilters: FilterState) => {
      setFilters(newFilters);
      setFilterSheetVisible(false);
      fetchNearest(searchQuery.trim(), location?.lat, location?.lng, newFilters, false, true);
    },
    [searchQuery, location, fetchNearest]
  );

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
        <Pressable
          style={({ pressed }) => [styles.headerLeft, pressed && styles.iconBtnPressed]}
          onPress={onRefresh}
          accessibilityLabel="Reload"
        >
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <ThemedText style={styles.headerTitle}>Find It</ThemedText>
        </Pressable>
        <View style={styles.headerIcons}>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            onPress={() => setNotificationPopupVisible(true)}
            accessibilityLabel="Notifications"
          >
            <View>
              <IconSymbol name="bell.fill" size={24} color={Theme.white} />
              {unreadNotificationCount > 0 ? (
                <View style={styles.notifBadge}>
                  <ThemedText style={styles.notifBadgeText}>
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </ThemedText>
                </View>
              ) : null}
            </View>
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

      {/* Search bar + search button + clear + filter button */}
      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, Layout.shadow.sm, styles.searchBarFlex, searchQuery.length > 0 && styles.searchBarWithClear]}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search items, products or services..."
              onSubmit={handleSearchSubmit}
            />
            {searchQuery.length > 0 ? (
              <Pressable
                style={({ pressed }) => [styles.clearSearchBtn, pressed && styles.clearSearchBtnPressed]}
                onPress={() => setSearchQuery('')}
                accessibilityLabel="Clear search"
              >
                <IconSymbol name="xmark.circle.fill" size={22} color="#64748B" />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            style={({ pressed }) => [styles.searchSubmitBtn, pressed && styles.searchSubmitBtnPressed]}
            onPress={handleSearchSubmit}
            accessibilityLabel="Search"
          >
            <IconSymbol name="magnifyingglass" size={22} color={Theme.white} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.filterBtn, pressed && styles.filterBtnPressed]}
            onPress={() => setFilterSheetVisible(true)}
            accessibilityLabel="Filters"
          >
            <IconSymbol name="line.3.horizontal.decrease.circle.fill" size={28} color={Theme.primary} />
          </Pressable>
        </View>
        <FilterSheet
          visible={filterSheetVisible}
          onClose={() => setFilterSheetVisible(false)}
          filters={filters}
          onApply={handleApplyFilters}
          categories={categories}
          outletTypes={[...OUTLET_TYPE_VALUES]}
          onCategoryNameSearch={token ? fetchCategoriesByName : undefined}
          categoriesLoading={categoriesLoading}
        />
        <NotificationPopup
          visible={notificationPopupVisible}
          onClose={() => {
            setNotificationPopupVisible(false);
            loadUnreadNotificationCount();
          }}
          onNotificationsUpdated={loadUnreadNotificationCount}
        />
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
            pinColor="#E53935"
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
      <FlatList
        data={outlets}
        keyExtractor={(o) => o.id}
        contentContainerStyle={outlets.length === 0 ? styles.listContentEmpty : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Theme.primary]}
            tintColor={Theme.primary}
          />
        }
        ListEmptyComponent={
          loading && outlets.length === 0 ? (
            <View style={styles.loadingList}>
              <ActivityIndicator size="small" color={Theme.primary} />
            </View>
          ) : !loading && outlets.length === 0 ? (
            <View style={styles.emptyList}>
              <ThemedText style={styles.emptyListText}>No outlets found.</ThemedText>
              <ThemedText style={styles.emptyListHint}>Try a different search or adjust filters.</ThemedText>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <HomeOutletCard
            outlet={item}
            isFavorite={isFavorite(item.id)}
            onAddFavorite={addFavorite}
            onRemoveFavorite={removeFavoriteByOutletId}
          />
        )}
      />

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
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: Theme.white,
    fontSize: 11,
    fontWeight: '700',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Theme.background,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBar: {
    backgroundColor: Theme.inputBg,
    borderRadius: Layout.radius.lg,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 48,
    justifyContent: 'center',
    position: 'relative',
  },
  searchBarFlex: { flex: 1 },
  searchBarWithClear: { paddingRight: 40 },
  clearSearchBtn: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  clearSearchBtnPressed: { opacity: 0.7 },
  searchSubmitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Layout.radius.lg,
    minHeight: 48,
  },
  searchSubmitBtnPressed: { opacity: 0.9 },
  filterBtn: { padding: 6 },
  filterBtnPressed: { opacity: 0.8 },
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
  emptyList: {
    padding: 32,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 16,
    marginBottom: 8,
  },
  emptyListHint: {
    fontSize: 14,
    opacity: 0.7,
  },
  listContent: {
    paddingBottom: 24,
  },
  listContentEmpty: {
    flexGrow: 1,
    paddingBottom: 24,
  },
});
