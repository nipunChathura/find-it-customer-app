/**
 * Favorites screen: list of saved outlets. Tap to open outlet detail or remove from favorites.
 */

import { useFavorites } from '@/contexts/favorites-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OutletListItem } from '@/components/outlet-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Theme } from '@/constants/theme';

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { favorites, loading, refreshFavorites, removeFavorite } = useFavorites();
  const router = useRouter();
  const iconColor = useThemeColor({}, 'icon');

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
          <IconSymbol name="magnifyingglass" size={48} color={iconColor} />
          <ThemedText type="subtitle" style={styles.emptyTitle}>No favorites yet</ThemedText>
          <ThemedText style={styles.emptyText}>
            When you tap &quot;I've arrived&quot; at an outlet, you can add it here.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedText type="subtitle" style={styles.header}>
        Your favorites ({favorites.length})
      </ThemedText>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {favorites.map((entry) => {
          const outlet = entry.outlet;
          const displayName = entry.nickname?.trim() || outlet.name;
          return (
            <View key={entry.customer_favorite_id} style={styles.row}>
              <Pressable style={styles.itemWrap} onPress={() =>
                router.push({
                  pathname: '/outlet/[id]',
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
                })
              }>
                <View style={styles.favItemInner}>
                  <OutletListItem outlet={{ ...outlet, name: displayName }} />
                  {entry.nickname?.trim() && (
                    <ThemedText style={styles.nicknameLabel} numberOfLines={1}>
                      {outlet.name}
                    </ThemedText>
                  )}
                </View>
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
  header: { paddingHorizontal: 16, paddingVertical: 12 },
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
    padding: 24,
  },
  emptyTitle: { marginTop: 16 },
  emptyText: { marginTop: 8, textAlign: 'center', opacity: 0.8 },
  row: { marginBottom: 12 },
  itemWrap: { flex: 1 },
  favItemInner: { marginBottom: 0 },
  nicknameLabel: { fontSize: 12, opacity: 0.6, marginTop: 2 },
  removeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  pressed: { opacity: 0.8 },
  removeText: { color: '#dc2626', fontSize: 14 },
});
