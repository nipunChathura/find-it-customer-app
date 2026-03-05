import { Layout } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { ItemCategory, OutletType } from '@/types/api';
import { useEffect, useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import { ThemedText } from './themed-text';

export interface FilterState {
  category?: ItemCategory;
  outletType?: OutletType;
}

type FilterSheetProps = {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (f: FilterState) => void;
  categories: ItemCategory[];
  outletTypes: OutletType[];
};

export function FilterSheet({
  visible,
  onClose,
  filters,
  onApply,
  categories,
  outletTypes,
}: FilterSheetProps) {
  const bg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'cardBorder');
  const tint = useThemeColor({}, 'tint');

  const [local, setLocal] = useState<FilterState>(filters);

  useEffect(() => {
    if (visible) setLocal(filters);
  }, [visible, filters]);

  const handleApply = () => {
    onApply(local);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: bg }]} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.handle, { backgroundColor: borderColor }]} />
          <ThemedText type="subtitle" style={styles.title}>
            Filters
          </ThemedText>

          <ThemedText type="defaultSemiBold" style={styles.label}>
            Category
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            <Pressable
              style={[styles.chip, { borderColor }, !local.category && { backgroundColor: tint }]}
              onPress={() => setLocal((p) => ({ ...p, category: undefined }))}
            >
              <ThemedText style={!local.category ? styles.chipTextActive : undefined}>All</ThemedText>
            </Pressable>
            {categories.map((c) => (
              <Pressable
                key={c}
                style={[
                  styles.chip,
                  { borderColor },
                  local.category === c && { backgroundColor: tint },
                ]}
                onPress={() => setLocal((p) => ({ ...p, category: c }))}
              >
                <ThemedText style={local.category === c ? styles.chipTextActive : undefined}>
                  {c}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          <ThemedText type="defaultSemiBold" style={styles.label}>
            Outlet type
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            <Pressable
              style={[styles.chip, { borderColor }, !local.outletType && { backgroundColor: tint }]}
              onPress={() => setLocal((p) => ({ ...p, outletType: undefined }))}
            >
              <ThemedText style={!local.outletType ? styles.chipTextActive : undefined}>All</ThemedText>
            </Pressable>
            {outletTypes.map((t) => (
              <Pressable
                key={t}
                style={[
                  styles.chip,
                  { borderColor },
                  local.outletType === t && { backgroundColor: tint },
                ]}
                onPress={() => setLocal((p) => ({ ...p, outletType: t }))}
              >
                <ThemedText style={local.outletType === t ? styles.chipTextActive : undefined}>
                  {t}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            style={({ pressed }) => [styles.applyBtn, pressed && styles.applyBtnPressed]}
            onPress={handleApply}
          >
            <ThemedText style={styles.applyBtnText}>Apply Filters</ThemedText>
          </Pressable>
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
    borderTopLeftRadius: Layout.radius.xl,
    borderTopRightRadius: Layout.radius.xl,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 10,
  },
  chipRow: {
    marginBottom: 20,
    flexGrow: 0,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    marginRight: 8,
  },
  chipTextActive: {
    color: '#fff',
  },
  applyBtn: {
    backgroundColor: Layout.primary,
    borderRadius: Layout.radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  applyBtnPressed: {
    opacity: 0.9,
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
