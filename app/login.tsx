import { useAuth } from '@/contexts/auth-context';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Layout } from '@/constants/theme';


export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email';
    if (!password) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (e) {
      setErrors({ email: 'Login failed. Check email and password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <ThemedText type="title" style={styles.welcome}>
              Welcome back
            </ThemedText>
            <ThemedText style={styles.hint}>
              Sign in to your account to continue.
            </ThemedText>
          </View>

          <View style={styles.form}>
            <ThemedTextInput
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
            />

            <View style={styles.passwordFieldWrap}>
              <ThemedTextInput
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
                }}
                secureTextEntry={!showPassword}
                autoComplete="password"
                error={errors.password}
                containerStyle={styles.passwordInputContainer}
              />
              <Pressable
                style={styles.eyeButton}
                onPress={() => setShowPassword((v) => !v)}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <IconSymbol
                  name={showPassword ? 'eye.slash' : 'eye'}
                  size={24}
                  color="#64748B"
                />
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={handleLogin}
              disabled={loading}
            >
              <ThemedText style={styles.buttonText}>{loading ? 'Signing in…' : 'Login'}</ThemedText>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>Don&apos;t have an account? </ThemedText>
            <Link href="/register" asChild>
              <Pressable>
                <ThemedText style={styles.link}>Create account</ThemedText>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 48,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    marginBottom: 32,
  },
  welcome: {
    color: Layout.primary,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  hint: {
    color: '#64748B',
    fontSize: 16,
  },
  form: {
    marginBottom: 24,
  },
  passwordFieldWrap: { position: 'relative', marginBottom: 16 },
  passwordInputContainer: { marginBottom: 0 },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 34,
    padding: 8,
    zIndex: 1,
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: Layout.radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    ...Layout.shadow.sm,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 4,
  },
  footerText: {
    color: '#64748B',
  },
  link: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 16,
  },
});
