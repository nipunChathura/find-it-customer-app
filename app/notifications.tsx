

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Layout, Theme } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { getNotifications, markNotificationRead } from '@/services/customer-api';
import type { Notification } from '@/types/api';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString();
}

function NotificationItem({
  item,
  onMarkRead,
  markingId,
}: {
  item: Notification;
  onMarkRead: (id: string) => void;
  markingId: string | null;
}) {
  const isMarking = markingId === item.id;
  return (
    <View style={[styles.card, !item.read && styles.cardUnread]}>
      <View style={styles.cardContent}>
        <ThemedText type="defaultSemiBold" style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </ThemedText>
        <ThemedText style={styles.cardBody} numberOfLines={2}>
          {item.body}
        </ThemedText>
        <View style={styles.cardFooter}>
          <ThemedText style={styles.cardDate}>{formatDate(item.createdAt)}</ThemedText>
          {!item.read && (
            <Pressable
              style={({ pressed }) => [styles.readBtn, pressed && styles.readBtnPressed, isMarking && styles.readBtnDisabled]}
              onPress={() => onMarkRead(item.id)}
              disabled={isMarking}
              accessibilityLabel="Mark as read"
            >
              {isMarking ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText style={styles.readBtnText}>Mark as read</ThemedText>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const userId = user?.userId != null ? String(user.userId) : null;
      const list = await getNotifications(token, userId);
      setNotifications(list);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user?.userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkRead = useCallback(
    async (id: string) => {
      setMarkingId(id);
      try {
        await markNotificationRead(id, token);
        await load();
      } finally {
        setMarkingId(null);
      }
    },
    [token, load]
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>
          Notifications
        </ThemedText>
      </View>
      {loading && notifications.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Theme.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <ThemedText style={styles.empty}>No new notifications.</ThemedText>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              colors={[Theme.primary]}
            />
          }
          renderItem={({ item }) => (
            <NotificationItem item={item} onMarkRead={handleMarkRead} markingId={markingId} />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    // borderBottomColor: Theme.cardBorder,
  },
  title: { marginBottom: 0 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  empty: { opacity: 0.8 },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    // backgroundColor: Theme.card,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    // borderColor: Theme.cardBorder,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: Theme.primary,
  },
  cardContent: { padding: 16 },
  cardTitle: { fontSize: 16, marginBottom: 4 },
  cardBody: { fontSize: 14, opacity: 0.85, marginBottom: 8 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardDate: { fontSize: 12, opacity: 0.7 },
  readBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Theme.primary,
    borderRadius: Layout.radius.md,
  },
  readBtnPressed: { opacity: 0.85 },
  readBtnDisabled: { opacity: 0.7 },
  readBtnText: { color: Theme.white, fontSize: 13, fontWeight: '600' },
});
