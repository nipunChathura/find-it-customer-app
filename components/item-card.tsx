import { Layout } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { Item } from '@/types/api';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

type ItemCardProps = {
  item: Item;
  onPress: () => void;
};

export function ItemCard({ item, onPress }: ItemCardProps) {
  const cardBg = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'cardBorder');
  const availableColor = useThemeColor({}, 'available');
  const availableBg = useThemeColor({}, 'availableBg');

  const isAvailable = item.availability === 'Yes';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: cardBg, borderColor },
        Layout.shadow.md,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.row}>
        <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={2}>
          {item.name}
        </ThemedText>
        <View style={[styles.badge, { backgroundColor: isAvailable ? availableBg : undefined }]}>
          <ThemedText
            type="defaultSemiBold"
            style={[styles.badgeText, isAvailable && { color: availableColor }]}
          >
            {item.availability === 'Yes' ? 'Available' : 'Unavailable'}
          </ThemedText>
        </View>
      </View>
      <ThemedText style={styles.category}>{item.category}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    padding: Layout.radius.lg,
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.95,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 17,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Layout.radius.sm,
  },
  badgeText: {
    fontSize: 13,
  },
  category: {
    marginTop: 6,
    fontSize: 14,
    opacity: 0.8,
  },
});
