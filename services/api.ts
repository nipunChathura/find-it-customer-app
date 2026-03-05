/**
 * API service for Find It Customer App.
 * - Auth: login/register (JWT) handled in AuthContext.
 * - Search: search by item query → returns 5 nearest outlets with distance and rating.
 * - Route: get distance and travel time from user location to outlet.
 * Replace BASE_URL and real endpoints when backend is ready.
 */

import type { Item, ItemCategory, Outlet, OutletType, RouteInfo, SearchParams } from '@/types/api';

const BASE_URL = 'https://your-api.com/api'; // Replace with your API base URL
const REQUEST_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const method = options?.method ?? 'GET';
  const body = options?.body;
  console.log('[API] Request:', method, url, body ? (typeof body === 'string' ? body : '[body]') : '');
  const res = await fetchWithTimeout(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text?.slice(0, 300) };
  }
  console.log('[API] Response:', res.status, res.statusText, data);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return data as T;
}

/** Search items by name with optional category and outlet type filters */
export async function searchItems(params: SearchParams): Promise<Item[]> {
  const q = new URLSearchParams();
  if (params.query) q.set('q', params.query);
  if (params.category) q.set('category', params.category);
  if (params.outletType) q.set('outletType', params.outletType);
  return fetchApi<Item[]>(`/items?${q.toString()}`);
}

/** Get categories for filter dropdown */
export async function getCategories(): Promise<ItemCategory[]> {
  return fetchApi<ItemCategory[]>('/items/categories');
}

/** Get outlet types for filter */
export async function getOutletTypes(): Promise<OutletType[]> {
  return fetchApi<OutletType[]>('/outlets/types');
}

/** Get currently open outlets that have the given item */
export async function getOpenOutletsForItem(itemId: string): Promise<Outlet[]> {
  return fetchApi<Outlet[]>(`/items/${itemId}/outlets?open=true`);
}

/** Options for nearest-outlet search (category + max distance in km) */
export interface SearchNearestOptions {
  category?: ItemCategory;
  outletType?: OutletType;
  maxDistanceKm?: number;
}

/** Search and return nearest outlets (with distance, rating) within maxDistanceKm; optional category/outletType filter */
export async function searchNearestOutlets(
  query: string,
  userLat?: number,
  userLng?: number,
  options?: SearchNearestOptions
): Promise<Outlet[]> {
  const q = new URLSearchParams();
  q.set('q', query);
  if (userLat != null) q.set('lat', String(userLat));
  if (userLng != null) q.set('lng', String(userLng));
  if (options?.category) q.set('category', options.category);
  if (options?.outletType) q.set('outletType', options.outletType);
  if (options?.maxDistanceKm != null) q.set('maxDistanceKm', String(options.maxDistanceKm));
  return fetchApi<Outlet[]>(`/search/nearest?${q.toString()}`);
}

/** Get route info (distance + estimated duration) from user to outlet */
export async function getRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<RouteInfo> {
  return fetchApi<RouteInfo>(
    `/route?from=${fromLat},${fromLng}&to=${toLat},${toLng}`
  );
}

export const api = {
  searchItems: (params: SearchParams) => searchItems(params),
  getCategories: () => getCategories(),
  getOutletTypes: () => getOutletTypes(),
  getOpenOutletsForItem: (itemId: string) => getOpenOutletsForItem(itemId),
  searchNearestOutlets: (q: string, lat?: number, lng?: number, opts?: SearchNearestOptions) =>
    searchNearestOutlets(q, lat, lng, opts),
  getRoute: (a: number, b: number, c: number, d: number) => getRoute(a, b, c, d),
};
