import {
    StyleSheet,
    TextInput,
    View,
    type TextInputProps,
    type ViewStyle,
} from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

import { ThemedText } from './themed-text';

export type ThemedTextInputProps = TextInputProps & {
  label?: string;
  containerStyle?: ViewStyle;
  error?: string;
};

export function ThemedTextInput({
  label,
  containerStyle,
  error,
  style,
  placeholderTextColor,
  ...props
}: ThemedTextInputProps) {
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor(
    { light: '#f0f2f5', dark: '#252528' },
    'background'
  );
  const borderColor = useThemeColor(
    { light: '#e0e2e5', dark: '#3a3a3e' },
    'icon'
  );
  const placeholderColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'icon');

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <ThemedText type="defaultSemiBold" style={styles.label}>
          {label}
        </ThemedText>
      ) : null}
      <TextInput
        style={[
          styles.input,
          {
            color: textColor,
            backgroundColor,
            borderColor,
          },
          style,
        ]}
        placeholderTextColor={placeholderColor}
        {...props}
      />
      {error ? (
        <ThemedText style={styles.error}>{error}</ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  error: {
    fontSize: 13,
    color: '#c53030',
    marginTop: 4,
  },
});
