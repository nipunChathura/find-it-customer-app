/**
 * Profile tab – user info and settings. Opened from header profile icon or Profile tab.
 */

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <ThemedText type="subtitle" style={styles.title}>
          Profile
        </ThemedText>
        {user ? (
          <View style={styles.card}>
            <ThemedText type="defaultSemiBold">{user.name}</ThemedText>
            <ThemedText style={styles.email}>{user.email}</ThemedText>
            {user.mobile ? (
              <ThemedText style={styles.mobile}>{user.mobile}</ThemedText>
            ) : null}
          </View>
        ) : (
          <ThemedText style={styles.hint}>Sign in to see your profile.</ThemedText>
        )}
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
  card: {
    backgroundColor: Theme.cardBg,
    padding: 16,
    borderRadius: 12,
  },
  email: { marginTop: 4, opacity: 0.9 },
  mobile: { marginTop: 2, opacity: 0.8 },
  hint: { opacity: 0.8 },
});
