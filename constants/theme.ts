

import { Platform } from 'react-native';

const primary = '#2563EB';
const secondary = '#1E40AF';
const backgroundLight = '#F8FAFC';
const textPrimary = '#0F172A';
const accent = '#38BDF8';

export const Colors = {
  light: {
    text: textPrimary,
    background: backgroundLight,
    tint: primary,
    icon: '#64748B',
    tabIconDefault: '#64748B',
    tabIconSelected: primary,
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',
    available: '#0d9488',
    availableBg: '#ccfbf1',
    inputBg: '#F1F5F9',
    primary,
    secondary,
    accent,
  },
  dark: {
    text: '#F8FAFC',
    background: '#0F172A',
    tint: accent,
    icon: '#94A3B8',
    tabIconDefault: '#94A3B8',
    tabIconSelected: accent,
    card: '#1E293B',
    cardBorder: '#334155',
    available: '#2dd4bf',
    availableBg: '#134e4a',
    inputBg: '#1E293B',
    primary: '#3B82F6',
    secondary: '#2563EB',
    accent,
  },
};


export const Theme = {
  primary: '#2563EB',
  secondary: '#1E40AF',
  background: '#F8FAFC',
  textPrimary: '#0F172A',
  accent: '#38BDF8',
  white: '#FFFFFF',
  cardBg: '#FFFFFF',
  inputBg: '#FFFFFF',
  shadowLight: '#000000',
};

export const Layout = {
  radius: { sm: 8, md: 12, lg: 16, xl: 20 },
  shadow: {
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 2 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 4 },
    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  },
  accent,
  primary,
  secondary,
  availableAccent: '#0d9488',
};


export const NavigationTheme = {
  light: {
    primary: '#2563EB',
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    border: '#E2E8F0',
    notification: '#38BDF8',
  },
  dark: {
    primary: '#38BDF8',
    background: '#0F172A',
    card: '#1E293B',
    text: '#F8FAFC',
    border: '#334155',
    notification: '#2563EB',
  },
};

export const Fonts = Platform.select({
  ios: {
    
    sans: 'system-ui',
    
    serif: 'ui-serif',
    
    rounded: 'ui-rounded',
    
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
