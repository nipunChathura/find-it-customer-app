

import { ThemedText } from '@/components/themed-text';
import { Layout, Theme } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getNotifications, markNotificationRead } from '@/services/customer-api';
import type { Notification } from '@/types/api';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';

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
  cardBorder,
  markingId,
}: {
  item: Notification;
  onMarkRead: (id: string) => void;
  cardBorder: string;
  markingId: string | null;
}) {
  const isMarking = markingId === item.id;
  return (
    <View style={[styles.card, { borderColor: cardBorder }, !item.read && styles.cardUnread]}>
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

type NotificationPopupProps = {
  visible: boolean;
  onClose: () => void;
  
  onNotificationsUpdated?: () => void;
};

export function NotificationPopup({ visible, onClose, onNotificationsUpdated }: NotificationPopupProps) {
  const { token, user } = useAuth();
  const cardBorder = useThemeColor({}, 'cardBorder');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
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
    },
    [token, user?.userId]
  );

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const handleMarkRead = useCallback(
    async (id: string) => {
      setMarkingId(id);
      try {
        await markNotificationRead(id, token);
        await load();
        onNotificationsUpdated?.();
      } finally {
        setMarkingId(null);
      }
    },
    [token, load, onNotificationsUpdated]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>
              Notifications
            </ThemedText>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
              accessibilityLabel="Close"
            >
              <ThemedText style={styles.closeBtnText}>Close</ThemedText>
            </Pressable>
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
                <NotificationItem item={item} onMarkRead={handleMarkRead} cardBorder={cardBorder} markingId={markingId} />
              )}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Theme.background,
    borderTopLeftRadius: Layout.radius.xl,
    borderTopRightRadius: Layout.radius.xl,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { marginBottom: 0 },
  closeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Theme.primary,
    borderRadius: Layout.radius.md,
  },
  closeBtnPressed: { opacity: 0.9 },
  closeBtnText: { color: Theme.white, fontSize: 15, fontWeight: '600' },
  centered: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: { opacity: 0.8 },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: Theme.cardBg,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
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
