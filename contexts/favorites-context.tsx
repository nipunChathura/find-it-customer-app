/**
 * FavoritesContext – Persisted list of favorite outlets per user.
 * Add/remove favorites; list is stored in AsyncStorage and restored on load.
 */

import type { Outlet } from '@/types/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { useAuth } from './auth-context';

const STORAGE_KEY = 'findit_favorites';

interface FavoritesContextValue {
  favorites: Outlet[];
  isFavorite: (outletId: string) => boolean;
  addFavorite: (outlet: Outlet) => Promise<void>;
  removeFavorite: (outletId: string) => Promise<void>;
  toggleFavorite: (outlet: Outlet) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Outlet[]>([]);

  const key = user ? `${STORAGE_KEY}_${user.id}` : null;

  useEffect(() => {
    if (!key) {
      setFavorites([]);
      return;
    }
    AsyncStorage.getItem(key)
      .then((json) => {
        if (json) setFavorites(JSON.parse(json));
      })
      .catch(() => setFavorites([]));
  }, [key]);

  useEffect(() => {
    if (!key || favorites.length === 0) return;
    AsyncStorage.setItem(key, JSON.stringify(favorites)).catch(() => {});
  }, [key, favorites]);

  const isFavorite = useCallback(
    (outletId: string) => favorites.some((o) => o.id === outletId),
    [favorites]
  );

  const addFavorite = useCallback(
    async (outlet: Outlet) =>
      setFavorites((prev) => (prev.some((o) => o.id === outlet.id) ? prev : [...prev, outlet])),
    []
  );

  const removeFavorite = useCallback(
    async (outletId: string) =>
      setFavorites((prev) => prev.filter((o) => o.id !== outletId)),
    []
  );

  const toggleFavorite = useCallback(
    async (outlet: Outlet) =>
      setFavorites((prev) =>
        prev.some((o) => o.id === outlet.id)
          ? prev.filter((o) => o.id !== outlet.id)
          : [...prev, outlet]
      ),
    []
  );

  const value: FavoritesContextValue = {
    favorites,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
  };
  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
