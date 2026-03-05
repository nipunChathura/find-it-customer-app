/**
 * Notifications screen – opened from header notification icon.
 */

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <ThemedText type="subtitle" style={styles.title}>
          Notifications
        </ThemedText>
        <ThemedText style={styles.empty}>
          No new notifications.
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.background,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: { marginBottom: 16 },
  empty: { opacity: 0.8 },
});
