import { outletTypeToLabel } from '@/constants/outlet-types';
import { Layout } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { ItemCategory, OutletType } from '@/types/api';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedTextInput } from './themed-text-input';
import { IconSymbol } from './ui/icon-symbol';

export interface FilterState {
  category?: ItemCategory;
  outletType?: OutletType;
  /** Max distance in km (default 1) – search within this radius */
  maxDistanceKm: number;
}

const DISTANCE_OPTIONS_KM = [1, 2, 5, 10] as const;
const MIN_DISTANCE_KM = 0.5;
const MAX_DISTANCE_KM = 100;

type FilterSheetProps = {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (f: FilterState) => void;
  categories: ItemCategory[];
  outletTypes: OutletType[];
  /** When user searches category by name, call API with this param. Pass name (can be empty for all). */
  onCategoryNameSearch?: (name: string) => void;
  categoriesLoading?: boolean;
};

const CATEGORY_SEARCH_DEBOUNCE_MS = 400;

export function FilterSheet({
  visible,
  onClose,
  filters,
  onApply,
  categories,
  outletTypes,
  onCategoryNameSearch,
  categoriesLoading = false,
}: FilterSheetProps) {
  const { height: windowHeight } = useWindowDimensions();
  const bg = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'cardBorder');
  const tint = useThemeColor({}, 'tint');
  const cardBg = useThemeColor({}, 'card');
  const sheetMaxHeight = Math.min(windowHeight * 0.88, 600);

  const [local, setLocal] = useState<FilterState>(() => ({
    ...filters,
    maxDistanceKm: filters.maxDistanceKm ?? 1,
  }));
  const [categoryNameSearch, setCategoryNameSearch] = useState('');
  /** Custom distance input (when value is not in 1,2,5,10 km chips) */
  const [customDistanceStr, setCustomDistanceStr] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setLocal((p) => ({ ...filters, maxDistanceKm: filters.maxDistanceKm ?? 1 }));
      const km = filters.maxDistanceKm ?? 1;
      setCustomDistanceStr(DISTANCE_OPTIONS_KM.includes(km as (typeof DISTANCE_OPTIONS_KM)[number]) ? '' : String(km));
    }
  }, [visible, filters]);

  useEffect(() => {
    if (visible) setCategoryNameSearch('');
  }, [visible]);

  useEffect(() => {
    if (onCategoryNameSearch == null) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      onCategoryNameSearch(categoryNameSearch.trim());
    }, CATEGORY_SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [categoryNameSearch, onCategoryNameSearch]);

  const handleApply = () => {
    onApply(local);
    onClose();
  };

  const defaultFilters: FilterState = {
    category: undefined,
    outletType: undefined,
    maxDistanceKm: 1,
  };

  const handleClearAll = () => {
    setLocal(defaultFilters);
    setCategoryNameSearch('');
    setCustomDistanceStr('');
    onCategoryNameSearch?.('');
    onApply(defaultFilters);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: bg, height: sheetMaxHeight }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: borderColor }]} />
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            <ThemedText type="subtitle" style={styles.title}>
              Filters
            </ThemedText>

            <ThemedText type="defaultSemiBold" style={styles.label}>
              Category
            </ThemedText>
          {onCategoryNameSearch != null && (
            <View style={styles.categorySearchWrap}>
              <ThemedTextInput
                placeholder="Search categories by name..."
                value={categoryNameSearch}
                onChangeText={setCategoryNameSearch}
                containerStyle={[styles.categorySearchInput, categoryNameSearch.length > 0 && styles.categorySearchWithClear]}
              />
              {categoryNameSearch.length > 0 && (
                <Pressable
                  style={({ pressed }) => [styles.categorySearchClearBtn, pressed && styles.categorySearchClearBtnPressed]}
                  onPress={() => setCategoryNameSearch('')}
                  accessibilityLabel="Clear category search"
                >
                  <IconSymbol name="xmark.circle.fill" size={22} color="#64748B" />
                </Pressable>
              )}
            </View>
          )}
          {categoriesLoading && (
            <View style={styles.categoryLoadingRow}>
              <ActivityIndicator size="small" color={tint} />
              <ThemedText style={styles.categoryLoadingText}>Loading categories…</ThemedText>
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            <Pressable
              style={[
                styles.chipCard,
                { borderColor, backgroundColor: !local.category ? tint : cardBg },
              ]}
              onPress={() => setLocal((p) => ({ ...p, category: undefined }))}
            >
              <ThemedText style={!local.category ? styles.chipTextActive : undefined}>
                All
              </ThemedText>
            </Pressable>
            {categories.map((c, index) => {
              const isSelected = local.category === c;
              return (
                <Pressable
                  key={`category-${index}-${c}`}
                  style={[
                    styles.chipCard,
                    { borderColor, backgroundColor: isSelected ? tint : cardBg },
                  ]}
                  onPress={() => setLocal((p) => ({ ...p, category: c }))}
                >
                  <ThemedText style={isSelected ? styles.chipTextActive : undefined}>
                    {c}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          <ThemedText type="defaultSemiBold" style={styles.label}>
            Outlet type
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            <Pressable
              style={[
                styles.chipCard,
                { borderColor, backgroundColor: !local.outletType ? tint : cardBg },
              ]}
              onPress={() => setLocal((p) => ({ ...p, outletType: undefined }))}
            >
              <ThemedText style={!local.outletType ? styles.chipTextActive : undefined}>
                All
              </ThemedText>
            </Pressable>
            {outletTypes.map((t) => {
              const isSelected = local.outletType === t;
              return (
                <Pressable
                  key={t}
                  style={[
                    styles.chipCard,
                    { borderColor, backgroundColor: isSelected ? tint : cardBg },
                  ]}
                  onPress={() => setLocal((p) => ({ ...p, outletType: t }))}
                >
                  <ThemedText style={isSelected ? styles.chipTextActive : undefined}>
                    {outletTypeToLabel(t)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          <ThemedText type="defaultSemiBold" style={styles.label}>
            Distance (within)
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {DISTANCE_OPTIONS_KM.map((km) => {
              const isSelected = local.maxDistanceKm === km;
              return (
                <Pressable
                  key={km}
                  style={[
                    styles.chipCard,
                    { borderColor, backgroundColor: isSelected ? tint : cardBg },
                  ]}
                  onPress={() => {
                    setLocal((p) => ({ ...p, maxDistanceKm: km }));
                    setCustomDistanceStr('');
                  }}
                >
                  <ThemedText style={isSelected ? styles.chipTextActive : undefined}>
                    {km} km
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
          <ThemedText style={styles.customDistanceLabel}>Or enter distance (km)</ThemedText>
          <ThemedTextInput
            placeholder={`e.g. 3, 7, 15 (${MIN_DISTANCE_KM}–${MAX_DISTANCE_KM} km)`}
            value={customDistanceStr}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9.]/g, '');
              const num = parseFloat(cleaned);
              if (!Number.isNaN(num)) {
                const clamped = Math.min(MAX_DISTANCE_KM, Math.max(MIN_DISTANCE_KM, num));
                setLocal((p) => ({ ...p, maxDistanceKm: clamped }));
                const display =
                  num > MAX_DISTANCE_KM ? String(MAX_DISTANCE_KM) : num < MIN_DISTANCE_KM ? String(MIN_DISTANCE_KM) : cleaned;
                setCustomDistanceStr(display);
              } else {
                setCustomDistanceStr(cleaned);
              }
            }}
            keyboardType="decimal-pad"
            containerStyle={styles.customDistanceInput}
          />
          <ThemedText style={styles.customDistanceHint}>Max {MAX_DISTANCE_KM} km</ThemedText>

          <Pressable
            style={({ pressed }) => [styles.applyBtn, pressed && styles.applyBtnPressed]}
            onPress={handleApply}
          >
            <ThemedText style={styles.applyBtnText}>Apply Filters</ThemedText>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.clearAllBtn, pressed && styles.clearAllBtnPressed]}
            onPress={handleClearAll}
          >
            <ThemedText style={styles.clearAllBtnText}>Clear all filters</ThemedText>
          </Pressable>
          </ScrollView>
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
    paddingTop: 8,
    paddingBottom: 24,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    paddingBottom: 24,
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
  categorySearchWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  categorySearchInput: {
    marginBottom: 0,
  },
  categorySearchWithClear: {
    paddingRight: 40,
  },
  categorySearchClearBtn: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    padding: 8,
  },
  categorySearchClearBtnPressed: {
    opacity: 0.7,
  },
  categoryLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  categoryLoadingText: {
    fontSize: 14,
    opacity: 0.8,
  },
  chipRow: {
    marginBottom: 14,
    flexGrow: 0,
  },
  customDistanceLabel: {
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 8,
  },
  customDistanceInput: {
    marginBottom: 4,
  },
  customDistanceHint: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 14,
  },
  chipCard: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    marginRight: 10,
    minHeight: 44,
    justifyContent: 'center',
    ...Layout.shadow.sm,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  clearAllBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: Layout.primary,
    borderRadius: Layout.radius.md,
  },
  clearAllBtnPressed: { opacity: 0.8 },
  clearAllBtnText: {
    color: Layout.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  applyBtn: {
    backgroundColor: Layout.primary,
    borderRadius: Layout.radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
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
