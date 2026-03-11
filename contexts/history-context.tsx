/**
 * HistoryContext – Search history from API (GET /customer-app/search-history), visited outlets in local storage.
 */

import {
    deleteSearchHistoryEntry as deleteSearchHistoryEntryApi,
    getSearchHistory,
    saveSearchHistory,
} from '@/services/customer-api';
import type { Outlet, SearchHistoryEntry, VisitedOutletEntry } from '@/types/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { useAuth } from './auth-context';

const VISITED_KEY = 'findit_visited';

export interface SearchHistoryParams {
  latitude: number;
  longitude: number;
  distanceKm: number;
  categoryId?: string | null;
  outletType?: string | null;
}

interface HistoryContextValue {
  searchHistory: SearchHistoryEntry[];
  searchHistoryLoading: boolean;
  clearSearchHistoryLoading: boolean;
  refreshSearchHistory: () => Promise<void>;
  deleteSearchHistoryEntry: (id: string) => Promise<void>;
  visitedOutlets: VisitedOutletEntry[];
  addSearchHistory: (query: string, outlets: Outlet[], params?: SearchHistoryParams) => Promise<void>;
  addVisitedOutlet: (outlet: Outlet) => Promise<void>;
  clearSearchHistory: () => Promise<void>;
  getSearchEntry: (id: string) => SearchHistoryEntry | undefined;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [searchHistoryLoading, setSearchHistoryLoading] = useState(false);
  const [clearSearchHistoryLoading, setClearSearchHistoryLoading] = useState(false);
  const [visitedOutlets, setVisitedOutlets] = useState<VisitedOutletEntry[]>([]);

  const visitedKey = user ? `${VISITED_KEY}_${user.id}` : null;

  const refreshSearchHistory = useCallback(async () => {
    if (!token) {
      setSearchHistory([]);
      return;
    }
    setSearchHistoryLoading(true);
    try {
      const list = await getSearchHistory(token);
      setSearchHistory(list);
    } catch {
      setSearchHistory([]);
    } finally {
      setSearchHistoryLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshSearchHistory();
  }, [refreshSearchHistory]);

  useEffect(() => {
    if (!visitedKey) {
      setVisitedOutlets([]);
      return;
    }
    AsyncStorage.getItem(visitedKey)
      .then((json) => (json ? setVisitedOutlets(JSON.parse(json)) : undefined))
      .catch(() => {});
  }, [visitedKey]);

  useEffect(() => {
    if (!visitedKey || visitedOutlets.length === 0) return;
    AsyncStorage.setItem(visitedKey, JSON.stringify(visitedOutlets)).catch(() => {});
  }, [visitedKey, visitedOutlets]);

  const addSearchHistory = useCallback(
    async (query: string, _outlets: Outlet[], params?: SearchHistoryParams) => {
      const searchText = query?.trim();
      if (!searchText || !token || !params) return;
      try {
        await saveSearchHistory(token, {
          searchText,
          latitude: params.latitude,
          longitude: params.longitude,
          distanceKm: params.distanceKm,
          categoryId: params.categoryId ?? null,
          outletType: params.outletType ?? null,
        });
        await refreshSearchHistory();
      } catch {
        // ignore save failure
      }
    },
    [token, refreshSearchHistory]
  );

  const addVisitedOutlet = useCallback(async (outlet: Outlet) => {
    setVisitedOutlets((prev) => [
      { outlet, visitedAt: Date.now() },
      ...prev.filter((e) => e.outlet.id !== outlet.id),
    ].slice(0, 49));
  }, []);

  const clearSearchHistory = useCallback(async () => {
    if (!token) return;
    const list = [...searchHistory];
    if (list.length === 0) {
      setSearchHistory([]);
      return;
    }
    setClearSearchHistoryLoading(true);
    try {
      for (const entry of list) {
        try {
          await deleteSearchHistoryEntryApi(token, String(entry.id));
        } catch {
          // continue with rest
        }
      }
      setSearchHistory([]);
    } finally {
      setClearSearchHistoryLoading(false);
    }
  }, [token, searchHistory]);

  const deleteSearchHistoryEntry = useCallback(
    async (id: string) => {
      if (!token) return;
      const idStr = String(id);
      try {
        await deleteSearchHistoryEntryApi(token, idStr);
        setSearchHistory((prev) => prev.filter((e) => String(e.id) !== idStr));
      } catch {
        await refreshSearchHistory();
      }
    },
    [token, refreshSearchHistory]
  );

  const getSearchEntry = useCallback(
    (id: string) => searchHistory.find((e) => e.id === id),
    [searchHistory]
  );

  const value: HistoryContextValue = {
    searchHistory,
    searchHistoryLoading,
    clearSearchHistoryLoading,
    refreshSearchHistory,
    deleteSearchHistoryEntry,
    visitedOutlets,
    addSearchHistory,
    addVisitedOutlet,
    clearSearchHistory,
    getSearchEntry,
  };
  return (
    <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
  );
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory must be used within HistoryProvider');
  return ctx;
}
