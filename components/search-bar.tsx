import { Layout } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { StyleSheet, TextInput, View } from 'react-native';

import { IconSymbol } from './ui/icon-symbol';

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
};

export function SearchBar({ value, onChangeText, placeholder = 'Search items...', onSubmit }: SearchBarProps) {
  const bg = useThemeColor({}, 'inputBg');
  const iconColor = useThemeColor({}, 'icon');
  const textColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({}, 'icon');

  return (
    <View style={[styles.wrapper, { backgroundColor: bg }]}>
      <IconSymbol name="magnifyingglass" size={20} color={iconColor} style={styles.icon} />
      <TextInput
        style={[styles.input, { color: textColor }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Layout.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
});
