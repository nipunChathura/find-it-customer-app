/**
 * History screen: search history (view previous search results) and route history (view routes to visited outlets).
 */

import { Layout } from '@/constants/theme';
import { useHistory } from '@/contexts/history-context';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OutletListItem } from '@/components/outlet-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

function formatDate(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hr ago`;
  return d.toLocaleDateString();
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { searchHistory, visitedOutlets, clearSearchHistory } = useHistory();
  const router = useRouter();

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Search history */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <ThemedText type="subtitle">Search history</ThemedText>
            {searchHistory.length > 0 && (
              <Pressable onPress={clearSearchHistory}>
                <ThemedText type="link" style={styles.clearBtn}>Clear</ThemedText>
              </Pressable>
            )}
          </View>
          {searchHistory.length === 0 ? (
            <ThemedText style={styles.emptyText}>No searches yet.</ThemedText>
          ) : (
            searchHistory.slice(0, 10).map((entry) => (
              <Pressable
                key={entry.id}
                style={({ pressed }) => [styles.historyCard, pressed && styles.pressed]}
                onPress={() => {
                  // Navigate to discover with results could be done via state; for simplicity open first outlet if any
                  if (entry.outlets.length > 0) {
                    router.push(`/outlet/${entry.outlets[0].id}`);
                  }
                }}
              >
                <ThemedText type="defaultSemiBold">"{entry.query}"</ThemedText>
                <ThemedText style={styles.meta}>
                  {entry.outlets.length} outlet(s) · {formatDate(entry.timestamp)}
                </ThemedText>
              </Pressable>
            ))
          )}
        </View>

        {/* Visited outlets (route history) */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Previously visited</ThemedText>
          {visitedOutlets.length === 0 ? (
            <ThemedText style={styles.emptyText}>No visited outlets yet.</ThemedText>
          ) : (
            visitedOutlets.slice(0, 15).map(({ outlet, visitedAt }) => (
              <View key={outlet.id} style={styles.visitedRow}>
                <Pressable
                  style={styles.visitedItem}
                  onPress={() => router.push(`/outlet/${outlet.id}`)}
                >
                  <OutletListItem outlet={outlet} />
                </Pressable>
                <ThemedText style={styles.visitedDate}>{formatDate(visitedAt)}</ThemedText>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  section: { marginBottom: 28 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { marginBottom: 12 },
  clearBtn: { fontSize: 14 },
  emptyText: { opacity: 0.7, marginTop: 4 },
  historyCard: {
    padding: 14,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    marginBottom: 10,
  },
  pressed: { opacity: 0.9 },
  meta: { marginTop: 4, fontSize: 13, opacity: 0.8 },
  visitedRow: { marginBottom: 10 },
  visitedItem: { marginBottom: 4 },
  visitedDate: { fontSize: 12, opacity: 0.6 },
});
