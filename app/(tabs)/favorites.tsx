

import { useFavorites } from '@/contexts/favorites-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Layout, Theme } from '@/constants/theme';

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { favorites, loading, refreshFavorites, removeFavorite } = useFavorites();
  const router = useRouter();
  const cardBg = useThemeColor({}, 'card');
  const cardBorder = useThemeColor({}, 'cardBorder');

  if (loading && favorites.length === 0) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Theme.primary} />
          <ThemedText style={styles.loadingText}>Loading favorites…</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (favorites.length === 0) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.empty}>
          <View style={[styles.emptyIconWrap, { backgroundColor: Theme.primary + '18' }]}>
            <IconSymbol name="heart.fill" size={56} color={Theme.primary} />
          </View>
          <ThemedText type="subtitle" style={[styles.emptyTitle, { color: Theme.primary }]}>No favorites yet</ThemedText>
          <ThemedText style={styles.emptyText}>
            When you tap &quot;I've arrived&quot; at an outlet, you can add it here.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.headerStrip, { backgroundColor: Theme.primary + '14' }]}>
        <View style={[styles.headerIconWrap, { backgroundColor: Theme.primary }]}>
          <IconSymbol name="heart.fill" size={24} color="#fff" />
        </View>
        <View style={styles.headerTextWrap}>
          <ThemedText type="subtitle" style={[styles.headerTitle, { color: Theme.primary }]}>
            Your favorites
          </ThemedText>
          <ThemedText style={styles.headerCount}>
            {favorites.length} {favorites.length === 1 ? 'outlet' : 'outlets'} saved
          </ThemedText>
        </View>
        <View style={[styles.countBadge, { backgroundColor: Theme.primary }]}>
          <ThemedText style={styles.countBadgeText}>{favorites.length}</ThemedText>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {favorites.map((entry) => {
          const outlet = entry.outlet;
          const hasNickname = Boolean(entry.nickname?.trim());
          const distanceText =
            outlet.distanceKm != null
              ? outlet.distanceKm < 1
                ? `${Math.round(outlet.distanceKm * 1000)} m`
                : `${outlet.distanceKm.toFixed(1)} km`
              : '—';
          const rating = outlet.rating ?? 0;
          const outletParams = {
            pathname: '/outlet/[id]' as const,
            params: {
              id: outlet.id,
              name: outlet.name,
              address: outlet.address,
              outletType: outlet.outletType,
              latitude: String(outlet.latitude),
              longitude: String(outlet.longitude),
              isOpen: outlet.isOpen ? '1' : '0',
              ...(outlet.distanceKm != null && { distanceKm: String(outlet.distanceKm) }),
              ...(outlet.rating != null && { rating: String(outlet.rating) }),
            },
          };
          return (
            <View key={entry.customer_favorite_id} style={[styles.singleCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={[styles.cardAccent, { backgroundColor: Theme.primary }]} />
              <Pressable
                style={({ pressed }) => [styles.cardContent, pressed && styles.pressed]}
                onPress={() => router.push(outletParams)}
              >
                <View style={styles.cardTitleRow}>
                  <ThemedText type="defaultSemiBold" style={styles.cardName} numberOfLines={1}>
                    {outlet.name}
                  </ThemedText>
                  {rating > 0 && (
                    <ThemedText style={[styles.cardRating, { color: Theme.accent }]}>★ {rating.toFixed(1)}</ThemedText>
                  )}
                </View>
                {hasNickname && (
                  <ThemedText style={[styles.nicknameOnCard, { color: Theme.primary }]} numberOfLines={1}>
                    Nickname: {entry.nickname!.trim()}
                  </ThemedText>
                )}
                <ThemedText style={styles.cardMeta}>
                  {outlet.outletType} · {distanceText} away
                </ThemedText>
                <ThemedText style={styles.cardAddress} numberOfLines={1}>
                  {outlet.address}
                </ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
                onPress={() => removeFavorite(entry.customer_favorite_id)}
              >
                <ThemedText style={styles.removeText}>Remove</ThemedText>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: Layout.radius.lg,
    gap: 14,
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  headerCount: { fontSize: 13, opacity: 0.85 },
  countBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countBadgeText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  scroll: { padding: 16, paddingBottom: 32 },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 16, opacity: 0.8 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { marginTop: 20, fontSize: 18 },
  emptyText: { marginTop: 10, textAlign: 'center', opacity: 0.85, paddingHorizontal: 24 },
  singleCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 14,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...Layout.shadow.sm,
  },
  cardAccent: { width: 5 },
  cardContent: { flex: 1, paddingVertical: 14, paddingHorizontal: 14, paddingRight: 8 },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardName: { flex: 1, fontSize: 16 },
  cardRating: { fontSize: 14, fontWeight: '600' },
  cardMeta: { marginTop: 4, fontSize: 13, opacity: 0.8 },
  cardAddress: { marginTop: 2, fontSize: 13, opacity: 0.7 },
  nicknameOnCard: { marginTop: 4, fontSize: 13, opacity: 0.9 },
  removeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  removeText: { color: '#dc2626', fontSize: 14, fontWeight: '600' },
});
