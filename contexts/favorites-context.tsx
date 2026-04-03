

import { addFavoriteOutlet, getFavorites, removeFavoriteOutlet } from '@/services/customer-api';
import type { FavoriteEntry, Outlet } from '@/types/api';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { useAuth } from './auth-context';

interface FavoritesContextValue {
  favorites: FavoriteEntry[];
  loading: boolean;
  refreshFavorites: () => Promise<void>;
  isFavorite: (outletId: string) => boolean;
  getFavoriteEntry: (outletId: string) => FavoriteEntry | undefined;
  addFavorite: (outlet: Outlet, nickname: string) => Promise<void>;
  removeFavorite: (customer_favorite_id: number) => Promise<void>;
  removeFavoriteByOutletId: (outletId: string) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshFavorites = useCallback(async () => {
    if (!token) {
      setFavorites([]);
      return;
    }
    setLoading(true);
    try {
      const list = await getFavorites(token);
      setFavorites(list);
    } catch {
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshFavorites();
  }, [refreshFavorites]);

  const isFavorite = useCallback(
    (outletId: string) => favorites.some((e) => e.outlet.id === outletId),
    [favorites]
  );

  const getFavoriteEntry = useCallback(
    (outletId: string) => favorites.find((e) => e.outlet.id === outletId),
    [favorites]
  );

  const addFavorite = useCallback(
    async (outlet: Outlet, nickname: string) => {
      if (!token) return;
      try {
        await addFavoriteOutlet(token, outlet.id, nickname.trim() || outlet.name);
        await refreshFavorites();
      } catch {
        refreshFavorites();
      }
    },
    [token, refreshFavorites]
  );

  const removeFavorite = useCallback(
    async (customer_favorite_id: number) => {
      if (!token) return;
      try {
        await removeFavoriteOutlet(token, customer_favorite_id);
        setFavorites((prev) => prev.filter((e) => e.customer_favorite_id !== customer_favorite_id));
      } catch {
        refreshFavorites();
      }
    },
    [token, refreshFavorites]
  );

  const removeFavoriteByOutletId = useCallback(
    async (outletId: string) => {
      const entry = favorites.find((e) => e.outlet.id === outletId);
      if (entry) await removeFavorite(entry.customer_favorite_id);
    },
    [favorites, removeFavorite]
  );

  const value: FavoritesContextValue = {
    favorites,
    loading,
    refreshFavorites,
    isFavorite,
    getFavoriteEntry,
    addFavorite,
    removeFavorite,
    removeFavoriteByOutletId,
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
