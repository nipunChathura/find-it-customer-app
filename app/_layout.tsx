import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Redirect, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { NavigationTheme } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { FavoritesProvider } from '@/contexts/favorites-context';
import { HistoryProvider } from '@/contexts/history-context';

/** Modern Blue light theme only (dark theme removed). Includes fonts so native-stack header does not crash. */
const AppNavTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: NavigationTheme.light.primary,
    background: NavigationTheme.light.background,
    card: NavigationTheme.light.card,
    text: NavigationTheme.light.text,
    border: NavigationTheme.light.border,
    notification: NavigationTheme.light.notification,
  },
};

/** Stack always rendered so /login can show. Redirect to login only when not logged in and trying to open protected (tabs/outlet/feedback). */
function RootStack() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();

  const isOnAuthScreen = segments[0] === 'login' || segments[0] === 'register';
  const shouldRedirectToLogin = !isLoading && !user && !isOnAuthScreen;

  return (
    <>
      {shouldRedirectToLogin && <Redirect href="/login" />}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ headerShown: true, title: 'Login' }} />
        <Stack.Screen name="register" options={{ headerShown: true, title: 'Create account' }} />
        <Stack.Screen name="outlet/[id]" options={{ headerShown: true, title: 'Outlet' }} />
        <Stack.Screen name="feedback/[id]" options={{ headerShown: true, title: 'Feedback' }} />
        <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Notifications' }} />
        <Stack.Screen name="route" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider value={AppNavTheme}>
      <AuthProvider>
        <FavoritesProvider>
          <HistoryProvider>
            <RootStack />
          </HistoryProvider>
        </FavoritesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
