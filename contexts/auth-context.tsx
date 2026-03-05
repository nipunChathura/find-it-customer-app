/**
 * AuthContext – JWT-based authentication for Find It Customer App.
 * Login calls Find It API POST /customer-app/login. Token and user stored in SecureStore.
 */

import { customerLogin } from '@/services/customer-api';
import type { User } from '@/types/api';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const TOKEN_KEY = 'findit_jwt';
const USER_KEY = 'findit_user';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, mobile: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Update stored user (e.g. after changing profile image). Persists to SecureStore. */
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  });

  /** Restore session from secure storage on mount */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [token, userJson] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (!cancelled && token && userJson) {
          const user = JSON.parse(userJson) as User;
          setState({ user, token, isLoading: false });
        } else if (!cancelled) {
          setState((s) => ({ ...s, isLoading: false }));
        }
      } catch {
        if (!cancelled) setState((s) => ({ ...s, isLoading: false }));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await customerLogin(email, password);
    const token = data.token ?? '';
    if (!token) throw new Error('Login failed: no token received');
    const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim()
      || data.username
      || email.split('@')[0];
    const user: User = {
      id: String(data.userId ?? data.customerId ?? ''),
      email: data.email ?? email,
      name: fullName,
      mobile: data.phoneNumber ?? '',
      profileImageUrl: data.profileImageUrl,
      userId: data.userId,
      username: data.username,
      userStatus: data.userStatus,
      role: data.role,
      customerId: data.customerId,
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      nic: data.nic,
      dob: data.dob,
      gender: data.gender,
      countryName: data.countryName,
      membershipType: data.membershipType,
      customerStatus: data.customerStatus,
    };
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    setState({ user, token, isLoading: false });
  }, []);

  const register = useCallback(
    async (email: string, password: string, name: string, mobile: string) => {
      // TODO: Replace with real API call
      const res = await fetch('https://your-api.com/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, mobile }),
      }).catch(() => null);
      if (!res?.ok) {
        // Mock register: persist user and token
        const mockUser: User = { id: '1', email, name, mobile };
        const mockToken = 'mock_jwt_' + Date.now();
        await SecureStore.setItemAsync(TOKEN_KEY, mockToken);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(mockUser));
        setState({ user: mockUser, token: mockToken, isLoading: false });
        return;
      }
      const data = (await res.json()) as { token: string; user: User };
      await SecureStore.setItemAsync(TOKEN_KEY, data.token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
      setState({ user: data.user, token: data.token, isLoading: false });
    },
    []
  );

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setState({ user: null, token: null, isLoading: false });
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    let nextUser: User | null = null;
    setState((s) => {
      if (!s.user) return s;
      nextUser = { ...s.user, ...updates };
      return { ...s, user: nextUser };
    });
    if (nextUser) await SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser));
  }, []);

  const value: AuthContextValue = { ...state, login, register, logout, updateUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
