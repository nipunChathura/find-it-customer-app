/**
 * Outlet detail: outlet details, route (distance, ETA, Show route), items list + search.
 * Then "I've arrived" and feedback.
 */

import { Layout, Theme } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useFavorites } from '@/contexts/favorites-context';
import { useHistory } from '@/contexts/history-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { api } from '@/services/api';
import { getOutletDiscounts, searchItems as searchItemsApi, submitFeedback } from '@/services/customer-api';
import { getOutletFromCache } from '@/services/outlet-cache';
import type { Item, Outlet, OutletDiscount, RouteInfo } from '@/types/api';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    View,
} from 'react-native';

const DISCOUNT_IMAGE_TYPE = 'discount';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FIND_IT_API_BASE } from '@/constants/api';
import { Image } from 'expo-image';

function buildOutletFromParams(p: Record<string, string | undefined>): Outlet | null {
  const id = p.id;
  const name = p.name;
  if (!id || !name) return null;
  const lat = parseFloat(p.latitude ?? '0');
  const lng = parseFloat(p.longitude ?? '0');
  if (isNaN(lat) || isNaN(lng)) return null;
  const distanceKm = p.distanceKm != null ? parseFloat(p.distanceKm) : undefined;
  const rating = p.rating != null ? parseFloat(p.rating) : undefined;
  return {
    id,
    name,
    address: p.address ?? '',
    outletType: (p.outletType as Outlet['outletType']) ?? '',
    latitude: lat,
    longitude: lng,
    isOpen: p.isOpen === '1',
    ...(distanceKm != null && !isNaN(distanceKm) && { distanceKm }),
    ...(rating != null && !isNaN(rating) && { rating }),
  };
}

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

/** Haversine distance in km (client-side fallback when route API is unavailable) */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function OutletDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    address?: string;
    outletType?: string;
    latitude?: string;
    longitude?: string;
    isOpen?: string;
    distanceKm?: string;
    rating?: string;
    itemsJson?: string;
  }>();
  const router = useRouter();
  const { token } = useAuth();
  const { addFavorite, isFavorite, getFavoriteEntry } = useFavorites();
  const { addVisitedOutlet } = useHistory();
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const ITEMS_PAGE_SIZE = 5;
  const [defaultItems, setDefaultItems] = useState<Item[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [itemDisplayLimit, setItemDisplayLimit] = useState(ITEMS_PAGE_SIZE);
  const [arrivedModalVisible, setArrivedModalVisible] = useState(false);
  const [addToFavoritesChecked, setAddToFavoritesChecked] = useState(false);
  const [addToFavoritesNickname, setAddToFavoritesNickname] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [discounts, setDiscounts] = useState<OutletDiscount[]>([]);
  const [discountsLoading, setDiscountsLoading] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<OutletDiscount | null>(null);

  const tint = useThemeColor({}, 'tint');
  const cardBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'cardBorder');

  useEffect(() => {
    const cached = params.id ? getOutletFromCache(params.id) : undefined;
    if (cached) {
      setOutlet(cached);
      setDefaultItems(cached.items ?? []);
      return;
    }
    const fromParams = buildOutletFromParams(params as Record<string, string | undefined>);
    if (fromParams) {
      setOutlet(fromParams);
    } else {
      setOutlet(null);
    }
    if (params.itemsJson) {
      try {
        const parsed = JSON.parse(params.itemsJson) as unknown;
        const list = Array.isArray(parsed)
          ? parsed.filter(
              (i): i is Item =>
                i != null &&
                typeof i === 'object' &&
                'id' in i &&
                'name' in i &&
                'category' in i &&
                'availability' in i
            )
          : [];
        setDefaultItems(list);
      } catch {
        setDefaultItems([]);
      }
    } else {
      setDefaultItems([]);
    }
  }, [params.id, params.name, params.address, params.outletType, params.latitude, params.longitude, params.isOpen, params.distanceKm, params.rating, params.itemsJson]);

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
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const fromLat = loc.coords.latitude;
      const fromLng = loc.coords.longitude;
      const toLat = outlet.latitude;
      const toLng = outlet.longitude;
      try {
        const info = await api.getRoute(fromLat, fromLng, toLat, toLng);
        setRouteInfo(info);
      } catch {
        // Fallback: compute distance client-side when route API is unavailable
        const distanceKm = haversineKm(fromLat, fromLng, toLat, toLng);
        const durationMinutes = Math.max(1, Math.round(distanceKm * 2)); // ~2 min per km rough estimate
        setRouteInfo({ distanceKm, durationMinutes });
      }
    } catch {
      setRouteInfo(null);
    } finally {
      setRouteLoading(false);
    }
  }, [outlet]);

  useEffect(() => {
    if (!token || !outlet?.id) {
      setDiscounts([]);
      return;
    }
    let mounted = true;
    setDiscountsLoading(true);
    getOutletDiscounts(token, outlet.id)
      .then((list) => {
        if (mounted) setDiscounts(list);
      })
      .finally(() => {
        if (mounted) setDiscountsLoading(false);
      });
    return () => { mounted = false; };
  }, [token, outlet?.id]);

  const openMaps = useCallback(() => {
    if (!outlet) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${outlet.latitude},${outlet.longitude}`;
    Linking.openURL(url);
  }, [outlet]);

  useEffect(() => {
    const q = itemSearch.trim().toLowerCase();
    if (defaultItems.length > 0) {
      const filtered = q
        ? defaultItems.filter(
            (i) =>
              i.name.toLowerCase().includes(q) || (i.category && i.category.toLowerCase().includes(q))
          )
        : defaultItems;
      setItems(filtered);
      setItemsLoading(false);
      setItemDisplayLimit(ITEMS_PAGE_SIZE);
      return;
    }
    if (!outlet?.id) {
      setItems([]);
      setItemsLoading(false);
      return;
    }
    let cancelled = false;
    setItemsLoading(true);
    if (token) {
      searchItemsApi(token, {
        search: q || undefined,
        outletId: outlet.id,
        availability: true,
      })
        .then((list) => {
          if (!cancelled) setItems(list);
        })
        .finally(() => {
          if (!cancelled) setItemsLoading(false);
        });
    } else {
      api
        .searchItems({ query: q || undefined })
        .then((list) => {
          if (!cancelled) setItems(list);
        })
        .finally(() => {
          if (!cancelled) setItemsLoading(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [itemSearch, defaultItems, outlet?.id, token]);

  useEffect(() => {
    setItemDisplayLimit(ITEMS_PAGE_SIZE);
  }, [items.length]);

  const visibleItems = items.slice(0, itemDisplayLimit);
  const hasMoreItems = items.length > itemDisplayLimit;
  const loadMoreItems = useCallback(() => {
    setItemDisplayLimit((prev) => prev + ITEMS_PAGE_SIZE);
  }, []);

  const openArrivedModal = useCallback(() => {
    if (!outlet) return;
    addVisitedOutlet(outlet);
    const alreadyFavorite = isFavorite(outlet.id);
    setAddToFavoritesChecked(alreadyFavorite);
    setAddToFavoritesNickname(alreadyFavorite ? (getFavoriteEntry(outlet.id)?.nickname?.trim() ?? outlet.name) : outlet.name);
    setFeedbackRating(5);
    setFeedbackText('');
    setArrivedModalVisible(true);
  }, [outlet, addVisitedOutlet, isFavorite, getFavoriteEntry]);

  const closeArrivedModal = useCallback(() => {
    setArrivedModalVisible(false);
  }, []);

  const handleArrivedSubmit = useCallback(async () => {
    if (!outlet) return;
    setFeedbackSubmitting(true);
    try {
      if (addToFavoritesChecked) addFavorite(outlet, addToFavoritesNickname.trim() || outlet.name);
      if (token) {
        const outletIdNum = Number(outlet.id);
        if (!Number.isNaN(outletIdNum)) {
          await submitFeedback(token, {
            outletId: outletIdNum,
            feedbackText: feedbackText.trim(),
            rating: feedbackRating,
          });
        }
      }
    } finally {
      setFeedbackSubmitting(false);
      setArrivedModalVisible(false);
    }
  }, [outlet, addToFavoritesChecked, addToFavoritesNickname, feedbackRating, feedbackText, addFavorite, token]);

  if (!outlet) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.empty}>Outlet not found.</ThemedText>
      </ThemedView>
    );
  }

  const routeDistance = routeInfo ? formatDistance(routeInfo.distanceKm) : null;
  const routeTime = routeInfo ? `~${routeInfo.durationMinutes} min` : null;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ——— Outlet details ——— */}
        <View style={[styles.section, styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={[styles.sectionTitleRow, { backgroundColor: Theme.secondary + '12' }]}>
            <IconSymbol name="map.fill" size={20} color={Theme.secondary} />
            <ThemedText type="subtitle" style={[styles.sectionTitle, styles.sectionTitleColored, { color: Theme.secondary }]}>
              Outlet details
            </ThemedText>
          </View>
          <View style={styles.outletNameRow}>
            <ThemedText type="defaultSemiBold" style={styles.name}>{outlet.name}</ThemedText>
            {isFavorite(outlet.id) && (
              <View style={styles.favoriteBadge}>
                <IconSymbol name="heart.fill" size={16} color="#dc2626" />
                <ThemedText style={styles.favoriteBadgeText}>
                  {getFavoriteEntry(outlet.id)?.nickname?.trim() || 'Favorite'}
                </ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={styles.type}>{outlet.outletType}</ThemedText>
          <ThemedText style={styles.address}>{outlet.address}</ThemedText>
          <View style={styles.row}>
            {outlet.rating != null && (
              <ThemedText style={styles.rating}>★ {outlet.rating.toFixed(1)}</ThemedText>
            )}
            <ThemedText style={[styles.openStatus, outlet.isOpen && styles.openStatusGreen]}>
              {outlet.isOpen ? 'Open' : 'Closed'}
            </ThemedText>
          </View>
        </View>

        {/* ——— Route details ——— */}
        <View style={[styles.section, styles.card, { backgroundColor: cardBg, borderColor }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Route details
          </ThemedText>
          {routeLoading && (
            <View style={styles.routeLoaderWrap}>
              <ActivityIndicator size="small" color={tint} />
              <ThemedText style={styles.hint}>Getting route…</ThemedText>
            </View>
          )}
          {!routeLoading && routeInfo && (
            <>
              <ThemedText style={styles.routeRow}>
                Distance: <ThemedText type="defaultSemiBold">{routeDistance}</ThemedText>
              </ThemedText>
              <ThemedText style={styles.routeRow}>
                Est. travel time: <ThemedText type="defaultSemiBold">{routeTime}</ThemedText>
              </ThemedText>
            </>
          )}
          <Pressable
            style={({ pressed }) => [styles.showRouteBtn, pressed && styles.pressed]}
            onPress={() => {
              if (!routeInfo && !routeLoading) loadRoute();
              else if (routeInfo) {
                router.push({
                  pathname: '/route',
                  params: {
                    destLat: String(outlet.latitude),
                    destLng: String(outlet.longitude),
                    outletName: outlet.name,
                  },
                });
              }
            }}
          >
            <IconSymbol name="map.fill" size={18} color="#fff" />
            <ThemedText style={styles.showRouteText}>
              {routeInfo ? 'Show route' : routeLoading ? 'Loading…' : 'Get distance & Show route'}
            </ThemedText>
          </Pressable>
          {routeInfo && (
            <Pressable style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]} onPress={openMaps}>
              <ThemedText type="link">Open in Maps</ThemedText>
            </Pressable>
          )}
        </View>

        {/* ——— Available discount now ——— */}
        <View style={[styles.section, styles.discountSectionCard, { backgroundColor: cardBg, borderColor }]}>
          <View style={[styles.discountSectionHeader, { backgroundColor: Theme.primary + '12' }]}>
            <View style={[styles.discountSectionIconWrap, { backgroundColor: Theme.primary }]}>
              <IconSymbol name="tag.fill" size={22} color="#fff" />
            </View>
            <View style={styles.discountSectionHeaderText}>
              <ThemedText type="subtitle" style={styles.discountSectionTitle}>
                Available discount now
              </ThemedText>
              <ThemedText style={styles.discountSectionSubtitle}>Tap a card for details</ThemedText>
            </View>
          </View>
          {discountsLoading ? (
            <View style={[styles.discountLoaderWrap, { paddingHorizontal: 18, paddingBottom: 20 }]}>
              <ActivityIndicator size="small" color={tint} />
              <ThemedText style={styles.hint}>Loading discounts…</ThemedText>
            </View>
          ) : discounts.length === 0 ? (
            <ThemedText style={[styles.hint, { paddingHorizontal: 18, paddingBottom: 20 }]}>No current discounts.</ThemedText>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.discountScrollContent}
            >
              {discounts.map((d) => {
                const discountFileName = d.image?.includes('/') ? d.image.split('/').pop() : d.image;
                const discountImageUri = d.image && discountFileName
                  ? `${FIND_IT_API_BASE}/images/show?type=${DISCOUNT_IMAGE_TYPE}&fileName=${encodeURIComponent(discountFileName)}`
                  : null;
                return (
                  <Pressable
                    key={d.id}
                    style={({ pressed }) => [styles.discountCard, { borderColor }, pressed && styles.discountCardPressed]}
                    onPress={() => setSelectedDiscount(d)}
                  >
                    {discountImageUri ? (
                      <Image
                        source={{ uri: discountImageUri, headers: token ? { Authorization: `Bearer ${token}` } : undefined }}
                        style={styles.discountImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.discountImagePlaceholder, { backgroundColor: borderColor }]} />
                    )}
                    <View style={[styles.discountNameStrip, { backgroundColor: Theme.primary }]}>
                      <ThemedText type="defaultSemiBold" style={styles.discountCardTitle} numberOfLines={2}>
                        {d.title}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ——— Items ——— */}
        <View style={[styles.section, styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={[styles.sectionTitleRow, { backgroundColor: Theme.accent + '18' }]}>
            <IconSymbol name="list.bullet" size={20} color={Theme.accent} />
            <ThemedText type="subtitle" style={[styles.sectionTitle, styles.sectionTitleColored, { color: Theme.accent }]}>
              Items
            </ThemedText>
          </View>
          <View style={[styles.searchWrap, { borderColor }]}>
            <IconSymbol name="magnifyingglass" size={18} color={tint} />
            <TextInput
              style={[styles.searchInput, { color: Theme.text }]}
              placeholder="Search items…"
              placeholderTextColor={Theme.textPrimary + '99'}
              value={itemSearch}
              onChangeText={setItemSearch}
            />
          </View>
          {itemsLoading ? (
            <ActivityIndicator size="small" color={tint} style={styles.itemsLoader} />
          ) : (
            <View style={styles.itemList}>
              {items.length === 0 ? (
                <ThemedText style={styles.hint}>No items found.</ThemedText>
              ) : (
                <>
                  {visibleItems.map((item) => {
                  const displayName = item.itemName ?? item.name;
                  const displayCategory = item.categoryName ?? item.category;
                  const itemFileName = item.itemImage?.includes('/')
                    ? item.itemImage.split('/').pop()
                    : item.itemImage;
                  const imageUri = item.itemImage
                    ? (item.itemImage.startsWith('http')
                        ? item.itemImage
                        : itemFileName
                          ? `${FIND_IT_API_BASE}/images/show?type=item&fileName=${encodeURIComponent(itemFileName)}`
                          : null)
                    : null;
                  const imageHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;
                  return (
                    <View key={item.id} style={[styles.itemCard, { borderColor }]}>
                      <View style={styles.itemRowInner}>
                        {imageUri ? (
                          <Image
                            source={{ uri: imageUri, headers: imageHeaders }}
                            style={styles.itemImage}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={[styles.itemImagePlaceholder, { backgroundColor: borderColor }]} />
                        )}
                        <View style={styles.itemDetails}>
                          <ThemedText type="defaultSemiBold" style={styles.itemName}>{displayName}</ThemedText>
                          <ThemedText style={styles.itemMeta}>{displayCategory} · {item.availability}</ThemedText>
                          {item.itemDescription ? (
                            <ThemedText style={styles.itemDesc} numberOfLines={2}>{item.itemDescription}</ThemedText>
                          ) : null}
                          <View style={styles.itemPriceRow}>
                            {item.offerPrice != null && (
                              <ThemedText type="defaultSemiBold" style={styles.offerPrice}>
                                LKR {item.offerPrice.toFixed(2)}
                              </ThemedText>
                            )}
                            {item.price != null && (
                              <ThemedText style={item.offerPrice != null ? styles.priceStrike : styles.price}>
                                LKR {item.price.toFixed(2)}
                              </ThemedText>
                            )}
                            {item.discountAvailable && (
                              <View style={styles.discountBadge}>
                                <ThemedText style={styles.discountText}>Discount</ThemedText>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                  })}
                  {hasMoreItems && (
                    <Pressable
                      style={({ pressed }) => [styles.loadMoreBtn, { borderColor }, pressed && styles.pressed]}
                      onPress={loadMoreItems}
                    >
                      <ThemedText style={styles.loadMoreText}>
                        Load more ({items.length - itemDisplayLimit} more)
                      </ThemedText>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          )}
        </View>

        {/* ——— Actions ——— */}
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={openArrivedModal}
        >
          <ThemedText style={styles.buttonText}>I've arrived</ThemedText>
        </Pressable>
      </ScrollView>

      {/* I've arrived popup: add to favorites + feedback + rating */}
      <Modal
        visible={arrivedModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeArrivedModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeArrivedModal}>
          <Pressable style={[styles.modalContent, { backgroundColor: cardBg }]} onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {outlet.name}
            </ThemedText>
            <ThemedText style={styles.modalSubtitle}>Add to favorites & give feedback</ThemedText>

            <View style={styles.toggleRow}>
              <ThemedText style={styles.toggleLabel}>
                {isFavorite(outlet.id) ? 'In favorites – toggle off to hide nickname' : 'Add this outlet to favorites?'}
              </ThemedText>
              <Switch
                value={addToFavoritesChecked}
                onValueChange={(v) => setAddToFavoritesChecked(v)}
                trackColor={{ false: '#94a3b8', true: Theme.primary }}
                thumbColor="#ffffff"
              />
            </View>
            {addToFavoritesChecked && (
              <View style={styles.nicknameRow}>
                <ThemedText style={styles.feedbackLabel}>
                  {isFavorite(outlet.id) ? 'Nickname (edit)' : 'Nickname (optional)'}
                </ThemedText>
                <TextInput
                  style={[styles.feedbackInput, styles.nicknameInput, { borderColor, color: Theme.text }]}
                  placeholder={outlet.name}
                  placeholderTextColor={Theme.textPrimary + '99'}
                  value={addToFavoritesNickname}
                  onChangeText={setAddToFavoritesNickname}
                />
              </View>
            )}

            <ThemedText type="defaultSemiBold" style={styles.feedbackLabel}>Rate this outlet (1–5)</ThemedText>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setFeedbackRating(n)}
                  style={[styles.starBtn, feedbackRating >= n && styles.starBtnActive]}
                >
                  <ThemedText style={[styles.starIcon, feedbackRating >= n && styles.starIconActive]}>★</ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedText type="defaultSemiBold" style={styles.feedbackLabel}>Feedback (optional)</ThemedText>
            <TextInput
              style={[styles.feedbackInput, { borderColor, color: Theme.text }]}
              placeholder="Share your experience..."
              placeholderTextColor={Theme.textPrimary + '99'}
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [styles.cancelBtn, { borderColor }, pressed && styles.pressed]}
                onPress={closeArrivedModal}
              >
                <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
                onPress={handleArrivedSubmit}
                disabled={feedbackSubmitting}
              >
                {feedbackSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.submitBtnText}>Submit</ThemedText>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Discount detail popup */}
      <Modal visible={selectedDiscount != null} transparent animationType="fade">
        <Pressable style={styles.discountModalOverlay} onPress={() => setSelectedDiscount(null)}>
          <Pressable style={[styles.discountModalContent, { backgroundColor: cardBg }]} onPress={(e) => e.stopPropagation()}>
            {selectedDiscount && (() => {
              const d = selectedDiscount;
              const discountFileName = d.image?.includes('/') ? d.image.split('/').pop() : d.image;
              const discountImageUri = d.image && discountFileName
                ? `${FIND_IT_API_BASE}/images/show?type=${DISCOUNT_IMAGE_TYPE}&fileName=${encodeURIComponent(discountFileName)}`
                : null;
              const formatDate = (s?: string) => s ? new Date(s).toLocaleDateString(undefined, { dateStyle: 'medium' }) : null;
              return (
                <>
                  <View style={[styles.discountModalHeader, { borderColor }]}>
                    <View style={styles.discountModalHeaderLeft}>
                      <View style={[styles.discountModalPill, { backgroundColor: Theme.primary + '18' }]}>
                        <IconSymbol name="tag.fill" size={16} color={Theme.primary} />
                        <ThemedText type="defaultSemiBold" style={[styles.discountModalLabel, { color: Theme.primary }]}>Offer</ThemedText>
                      </View>
                      <ThemedText type="subtitle" style={styles.discountModalTitle} numberOfLines={2}>{d.title}</ThemedText>
                    </View>
                    <Pressable hitSlop={16} onPress={() => setSelectedDiscount(null)} style={[styles.discountModalClose, { backgroundColor: borderColor }]}>
                      <IconSymbol name="xmark.circle.fill" size={26} color={Theme.primary} />
                    </Pressable>
                  </View>
                  <View style={styles.discountModalImageWrap}>
                    {discountImageUri ? (
                      <Image
                        source={{ uri: discountImageUri, headers: token ? { Authorization: `Bearer ${token}` } : undefined }}
                        style={styles.discountModalImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.discountModalImagePlaceholder, { backgroundColor: borderColor }]} />
                    )}
                    {d.discountPercentage != null && (
                      <View style={[styles.discountModalPctBadge, { backgroundColor: Theme.primary }]}>
                        <ThemedText type="defaultSemiBold" style={styles.discountModalPctText}>
                          {d.discountPercentage}% off
                        </ThemedText>
                      </View>
                    )}
                  </View>
                  <View style={styles.discountModalBody}>
                    {d.description ? (
                      <ThemedText style={styles.discountModalDesc}>{d.description}</ThemedText>
                    ) : null}
                    {(d.validFrom || d.validTo) ? (
                      <View style={[styles.discountModalDates, { backgroundColor: Theme.primary + '0c', borderColor }]}>
                        {d.validFrom && (
                          <ThemedText style={styles.discountModalDate}>From {formatDate(d.validFrom)}</ThemedText>
                        )}
                        {d.validTo && (
                          <ThemedText style={styles.discountModalDate}>Until {formatDate(d.validTo)}</ThemedText>
                        )}
                      </View>
                    ) : null}
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.discountModalCloseBtn, pressed && styles.pressed]}
                    onPress={() => setSelectedDiscount(null)}
                  >
                    <ThemedText style={styles.discountModalCloseBtnText}>Close</ThemedText>
                  </Pressable>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  empty: { padding: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { marginBottom: 12 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Layout.radius.md,
    marginBottom: 14,
  },
  sectionTitleColored: { color: Theme.primary, marginBottom: 0 },
  sectionDiscount: { borderLeftWidth: 4, borderLeftColor: Theme.primary },
  discountSectionCard: {
    marginBottom: 20,
    borderRadius: Layout.radius.xl,
    borderWidth: 1,
    padding: 0,
    overflow: 'hidden',
    ...Layout.shadow.md,
  },
  discountSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  discountSectionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountSectionHeaderText: { flex: 1 },
  discountSectionTitle: { fontSize: 17, color: Theme.primary, marginBottom: 2 },
  discountSectionSubtitle: { fontSize: 13, opacity: 0.7 },
  discountScrollContent: { paddingVertical: 16, paddingHorizontal: 18, paddingRight: 18, gap: 14 },
  discountCardPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  card: {
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    padding: 16,
    ...Layout.shadow.md,
  },
  outletNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  name: { fontSize: 18, flex: 1 },
  favoriteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Layout.radius.sm,
  },
  favoriteBadgeText: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
  type: { marginBottom: 4, opacity: 0.8, fontSize: 14 },
  address: { marginBottom: 8, opacity: 0.9, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  rating: { fontSize: 14 },
  openStatus: { fontSize: 14, opacity: 0.8 },
  openStatusGreen: { color: '#16a34a', fontWeight: '600' },
  routeRow: { marginTop: 6, fontSize: 14 },
  routeLoaderWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  hint: { fontSize: 14, opacity: 0.7, marginTop: 8 },
  discountLoaderWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  discountCard: {
    width: 172,
    borderWidth: 1,
    borderRadius: Layout.radius.lg,
    overflow: 'hidden',
    ...Layout.shadow.sm,
  },
  discountImage: { width: '100%', height: 104 },
  discountImagePlaceholder: { width: '100%', height: 104 },
  discountNameStrip: { paddingVertical: 10, paddingHorizontal: 12 },
  discountCardTitle: { fontSize: 14, color: '#fff', textAlign: 'center' },
  discountModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  discountModalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    overflow: 'hidden',
    ...Layout.shadow.lg,
  },
  discountModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  discountModalHeaderLeft: { flex: 1, marginRight: 12 },
  discountModalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  discountModalLabel: { fontSize: 12 },
  discountModalTitle: { fontSize: 18, lineHeight: 24 },
  discountModalClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  discountModalImageWrap: { position: 'relative', marginHorizontal: 16, marginTop: 12 },
  discountModalImage: { width: '100%', height: 200, borderRadius: Layout.radius.lg },
  discountModalImagePlaceholder: { width: '100%', height: 200, borderRadius: Layout.radius.lg },
  discountModalPctBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  discountModalPctText: { fontSize: 15, color: '#fff', fontWeight: '700' },
  discountModalBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  discountModalDesc: { fontSize: 15, lineHeight: 22, opacity: 0.9, marginBottom: 12 },
  discountModalDates: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    gap: 4,
  },
  discountModalDate: { fontSize: 13, opacity: 0.85 },
  discountModalCloseBtn: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 20,
    backgroundColor: Theme.primary,
    paddingVertical: 14,
    borderRadius: Layout.radius.lg,
    alignItems: 'center',
  },
  discountModalCloseBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  showRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Layout.radius.md,
    marginTop: 12,
  },
  showRouteText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  linkBtn: { alignItems: 'center', marginTop: 8 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: Layout.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  itemsLoader: { marginVertical: 16 },
  itemList: { marginTop: 4 },
  itemCard: { borderWidth: 1, borderRadius: Layout.radius.md, padding: 12, marginBottom: 10 },
  itemRowInner: { flexDirection: 'row', gap: 12 },
  itemImage: { width: 72, height: 72, borderRadius: 8 },
  itemImagePlaceholder: { width: 72, height: 72, borderRadius: 8 },
  itemDetails: { flex: 1 },
  itemName: { fontSize: 15 },
  itemMeta: { fontSize: 13, opacity: 0.8, marginTop: 2 },
  itemDesc: { fontSize: 12, opacity: 0.85, marginTop: 4 },
  itemPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  offerPrice: { fontSize: 15, color: Theme.primary },
  price: { fontSize: 14 },
  priceStrike: { fontSize: 13, opacity: 0.7, textDecorationLine: 'line-through' },
  discountBadge: { backgroundColor: '#dc2626', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  discountText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  loadMoreBtn: {
    borderWidth: 1,
    borderRadius: Layout.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  loadMoreText: { fontSize: 14, fontWeight: '600' },
  button: {
    backgroundColor: Theme.primary,
    borderRadius: Layout.radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryBtn: { alignItems: 'center', paddingVertical: 12 },
  pressed: { opacity: 0.9 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: Layout.radius.lg,
    padding: 20,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  modalTitle: { marginBottom: 4, textAlign: 'center' },
  modalSubtitle: { marginBottom: 16, textAlign: 'center', fontSize: 14, opacity: 0.8 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 8,
    minHeight: 48,
  },
  toggleLabel: { fontSize: 16, flex: 1, marginRight: 12 },
  nicknameRow: { marginBottom: 16 },
  nicknameInput: { minHeight: 44 },
  feedbackLabel: { marginBottom: 8, fontSize: 14 },
  starRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  starBtn: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 48,
    borderRadius: Layout.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starBtnActive: { backgroundColor: 'rgba(37, 99, 235, 0.2)' },
  starIcon: { fontSize: 28, opacity: 0.4, color: '#f59e0b' },
  starIconActive: { opacity: 1, color: '#f59e0b' },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: Layout.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 16, fontWeight: '600' },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Layout.radius.md,
    backgroundColor: Theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
