/**
 * HistoryContext – Search history and visited outlets (route history).
 * Persisted per user; allows viewing previous search results and routes to visited outlets.
 */

import type { Outlet, SearchHistoryEntry, VisitedOutletEntry } from '@/types/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { useAuth } from './auth-context';

const SEARCH_HISTORY_KEY = 'findit_search_history';
const VISITED_KEY = 'findit_visited';

interface HistoryContextValue {
  searchHistory: SearchHistoryEntry[];
  visitedOutlets: VisitedOutletEntry[];
  addSearchHistory: (query: string, outlets: Outlet[]) => Promise<void>;
  addVisitedOutlet: (outlet: Outlet) => Promise<void>;
  clearSearchHistory: () => Promise<void>;
  getSearchEntry: (id: string) => SearchHistoryEntry | undefined;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [visitedOutlets, setVisitedOutlets] = useState<VisitedOutletEntry[]>([]);

  const searchKey = user ? `${SEARCH_HISTORY_KEY}_${user.id}` : null;
  const visitedKey = user ? `${VISITED_KEY}_${user.id}` : null;

  useEffect(() => {
    if (!searchKey) {
      setSearchHistory([]);
      return;
    }
    AsyncStorage.getItem(searchKey)
      .then((json) => (json ? setSearchHistory(JSON.parse(json)) : undefined))
      .catch(() => {});
  }, [searchKey]);

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
    if (!searchKey || searchHistory.length === 0) return;
    AsyncStorage.setItem(searchKey, JSON.stringify(searchHistory)).catch(() => {});
  }, [searchKey, searchHistory]);

  useEffect(() => {
    if (!visitedKey || visitedOutlets.length === 0) return;
    AsyncStorage.setItem(visitedKey, JSON.stringify(visitedOutlets)).catch(() => {});
  }, [visitedKey, visitedOutlets]);

  const addSearchHistory = useCallback(async (query: string, outlets: Outlet[]) => {
    const entry: SearchHistoryEntry = {
      id: genId(),
      query,
      outlets,
      timestamp: Date.now(),
    };
    setSearchHistory((prev) => [entry, ...prev.slice(0, 49)]);
  }, []);

  const addVisitedOutlet = useCallback(async (outlet: Outlet) => {
    setVisitedOutlets((prev) => [
      { outlet, visitedAt: Date.now() },
      ...prev.filter((e) => e.outlet.id !== outlet.id),
    ].slice(0, 49));
  }, []);

  const clearSearchHistory = useCallback(async () => setSearchHistory([]), []);

  const getSearchEntry = useCallback(
    (id: string) => searchHistory.find((e) => e.id === id),
    [searchHistory]
  );

  const value: HistoryContextValue = {
    searchHistory,
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
