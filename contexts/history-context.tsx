/**
 * HistoryContext – Search history from API (GET /customer-app/search-history), visited outlets in local storage.
 */

import {
    deleteSearchHistoryEntry as deleteSearchHistoryEntryApi,
    getSearchHistory,
} from '@/services/customer-api';
import type { Outlet, SearchHistoryEntry, VisitedOutletEntry } from '@/types/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { useAuth } from './auth-context';

const VISITED_KEY = 'findit_visited';

interface HistoryContextValue {
  searchHistory: SearchHistoryEntry[];
  searchHistoryLoading: boolean;
  refreshSearchHistory: () => Promise<void>;
  deleteSearchHistoryEntry: (id: string) => Promise<void>;
  visitedOutlets: VisitedOutletEntry[];
  addSearchHistory: (query: string, outlets: Outlet[]) => Promise<void>;
  addVisitedOutlet: (outlet: Outlet) => Promise<void>;
  clearSearchHistory: () => Promise<void>;
  getSearchEntry: (id: string) => SearchHistoryEntry | undefined;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [searchHistoryLoading, setSearchHistoryLoading] = useState(false);
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

  const addSearchHistory = useCallback(async (_query: string, _outlets: Outlet[]) => {
    // No local/dummy data: search history list is loaded only from API (GET /customer-app/search-history).
    // Saving is done by caller via saveSearchHistory API; then refreshSearchHistory() will load updated list.
  }, []);

  const addVisitedOutlet = useCallback(async (outlet: Outlet) => {
    setVisitedOutlets((prev) => [
      { outlet, visitedAt: Date.now() },
      ...prev.filter((e) => e.outlet.id !== outlet.id),
    ].slice(0, 49));
  }, []);

  const clearSearchHistory = useCallback(async () => setSearchHistory([]), []);

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
