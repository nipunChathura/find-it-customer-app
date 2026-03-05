/**
 * Favorites screen: list of saved outlets. Tap to open outlet detail or remove from favorites.
 */

import { useFavorites } from '@/contexts/favorites-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OutletListItem } from '@/components/outlet-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { favorites, removeFavorite } = useFavorites();
  const router = useRouter();
  const iconColor = useThemeColor({}, 'icon');

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
        {favorites.map((outlet) => (
          <View key={outlet.id} style={styles.row}>
            <Pressable style={styles.itemWrap} onPress={() => router.push(`/outlet/${outlet.id}`)}>
              <OutletListItem outlet={outlet} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
              onPress={() => removeFavorite(outlet.id)}
            >
              <ThemedText style={styles.removeText}>Remove</ThemedText>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  scroll: { padding: 16, paddingBottom: 32 },
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
  removeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  pressed: { opacity: 0.8 },
  removeText: { color: '#dc2626', fontSize: 14 },
});
