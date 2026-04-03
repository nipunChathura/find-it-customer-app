

import { Layout, Theme } from '@/constants/theme';
import { useHistory } from '@/contexts/history-context';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
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
  const {
    searchHistory,
    searchHistoryLoading,
    clearSearchHistoryLoading,
    refreshSearchHistory,
    deleteSearchHistoryEntry,
    visitedOutlets,
    clearSearchHistory,
  } = useHistory();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteSearchEntry = useCallback(
    (entry: { id: string; query: string }) => {
      const label = entry.query ? `"${entry.query}"` : 'this search';
      Alert.alert(
        'Remove from history',
        `Remove ${label} from search history?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setDeletingId(entry.id);
              try {
                await deleteSearchHistoryEntry(entry.id);
              } finally {
                setDeletingId(null);
              }
            },
          },
        ]
      );
    },
    [deleteSearchHistoryEntry]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshSearchHistory();
    setRefreshing(false);
  }, [refreshSearchHistory]);

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.primary} />
        }
      >
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <ThemedText type="subtitle">Search history</ThemedText>
            {searchHistory.length > 0 && (
              <Pressable
                onPress={() => {
                  Alert.alert(
                    'Clear search history',
                    `Remove all ${searchHistory.length} search ${searchHistory.length === 1 ? 'entry' : 'entries'}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Clear all', style: 'destructive', onPress: () => clearSearchHistory() },
                    ]
                  );
                }}
                disabled={clearSearchHistoryLoading}
              >
                {clearSearchHistoryLoading ? (
                  <View style={styles.clearBtnWrap}>
                    <ActivityIndicator size="small" color={Theme.primary} />
                    <ThemedText style={styles.clearBtn}>Clearing…</ThemedText>
                  </View>
                ) : (
                  <ThemedText type="link" style={styles.clearBtn}>Clear</ThemedText>
                )}
              </Pressable>
            )}
          </View>
          {clearSearchHistoryLoading && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={Theme.primary} />
              <ThemedText style={styles.loadingText}>Clearing search history…</ThemedText>
            </View>
          )}
          {searchHistoryLoading && searchHistory.length === 0 ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={Theme.primary} />
              <ThemedText style={styles.loadingText}>Loading search history…</ThemedText>
            </View>
          ) : !clearSearchHistoryLoading && searchHistory.length === 0 ? (
            <ThemedText style={styles.emptyText}>No searches yet.</ThemedText>
          ) : !clearSearchHistoryLoading ? (
            searchHistory.slice(0, 10).map((entry) => {
              const label = entry.query ? `"${entry.query}"` : 'Near me';
              const distanceStr = entry.distanceKm != null ? `${entry.distanceKm} km` : '';
              const metaParts = [distanceStr, formatDate(entry.timestamp)].filter(Boolean);
              return (
                <View key={entry.id} style={styles.historyRow}>
                  <Pressable
                    style={({ pressed }) => [styles.historyCard, pressed && styles.pressed]}
                    onPress={() => {
                      if (entry.outlets.length > 0) {
                        const o = entry.outlets[0];
                        router.push({
                          pathname: '/outlet/[id]',
                          params: {
                            id: o.id,
                            name: o.name,
                            address: o.address,
                            outletType: o.outletType,
                            latitude: String(o.latitude),
                            longitude: String(o.longitude),
                            isOpen: o.isOpen ? '1' : '0',
                            ...(o.distanceKm != null && { distanceKm: String(o.distanceKm) }),
                            ...(o.rating != null && { rating: String(o.rating) }),
                          },
                        });
                      } else if (entry.latitude != null && entry.longitude != null) {
                        router.push({
                          pathname: '/(tabs)',
                          params: {
                            searchLat: String(entry.latitude),
                            searchLng: String(entry.longitude),
                            searchDistanceKm: String(entry.distanceKm ?? 5),
                            searchText: entry.query,
                          },
                        });
                      }
                    }}
                  >
                    <ThemedText type="defaultSemiBold">{label}</ThemedText>
                    <ThemedText style={styles.meta}>
                      {metaParts.join(' · ')}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.deleteHistoryBtn, pressed && styles.pressed]}
                    onPress={() => handleDeleteSearchEntry(entry)}
                    disabled={deletingId === entry.id}
                  >
                    {deletingId === entry.id ? (
                      <ActivityIndicator size="small" color="#dc2626" />
                    ) : (
                      <ThemedText style={styles.deleteHistoryText}>Delete</ThemedText>
                    )}
                  </Pressable>
                </View>
              );
            })
          ) : null}
        </View>

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
  clearBtnWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  loadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  loadingText: { fontSize: 14, opacity: 0.8 },
  emptyText: { opacity: 0.7, marginTop: 4 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  historyCard: {
    flex: 1,
    padding: 14,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  deleteHistoryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  deleteHistoryText: { color: '#dc2626', fontSize: 14 },
  pressed: { opacity: 0.9 },
  meta: { marginTop: 4, fontSize: 13, opacity: 0.8 },
  visitedRow: { marginBottom: 10 },
  visitedItem: { marginBottom: 4 },
  visitedDate: { fontSize: 12, opacity: 0.6 },
});
