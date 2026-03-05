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

// ——— Mock implementation (dummy outlets with lat/lng, rating, distance) ———

const MOCK_CATEGORIES: ItemCategory[] = ['Electronics', 'Groceries', 'Pharmacy', 'Fashion', 'Home'];
const MOCK_OUTLET_TYPES: OutletType[] = ['Retail', 'Supermarket', 'Convenience', 'Mall', 'Kiosk'];

const MOCK_ITEMS: Item[] = [
  { id: '1', name: 'Wireless Earbuds', category: 'Electronics', availability: 'Yes' },
  { id: '2', name: 'Organic Milk 1L', category: 'Groceries', availability: 'Yes' },
  { id: '3', name: 'Vitamin C Tablets', category: 'Pharmacy', availability: 'No' },
  { id: '4', name: 'USB-C Cable', category: 'Electronics', availability: 'Yes' },
  { id: '5', name: 'Whole Grain Bread', category: 'Groceries', availability: 'Yes' },
  { id: '6', name: 'Hand Sanitizer', category: 'Pharmacy', availability: 'Yes' },
  { id: '7', name: 'Cotton T-Shirt', category: 'Fashion', availability: 'No' },
  { id: '8', name: 'LED Desk Lamp', category: 'Electronics', availability: 'Yes' },
];

/** Dummy outlets with lat/lng for map; used for nearest search and item-outlet mapping */
const MOCK_OUTLETS_POOL: Outlet[] = [
  { id: 'o1', name: 'Tech Haven', outletType: 'Retail', address: '123 Main St, Colombo', latitude: 6.9271, longitude: 79.8612, isOpen: true, distanceKm: 1.2, rating: 4.5 },
  { id: 'o2', name: 'Gadget Mall', outletType: 'Mall', address: '456 Oak Ave, Colombo', latitude: 6.9300, longitude: 79.8700, isOpen: true, distanceKm: 2.5, rating: 4.2 },
  { id: 'o3', name: 'Fresh Mart', outletType: 'Supermarket', address: '789 Market Rd', latitude: 6.9280, longitude: 79.8650, isOpen: true, distanceKm: 0.8, rating: 4.8 },
  { id: 'o4', name: 'Health Plus', outletType: 'Pharmacy', address: '321 Health St', latitude: 6.9250, longitude: 79.8580, isOpen: true, distanceKm: 1.5, rating: 4.6 },
  { id: 'o5', name: 'City Central', outletType: 'Mall', address: '100 Central Blvd', latitude: 6.9320, longitude: 79.8480, isOpen: true, distanceKm: 3.0, rating: 4.0 },
  { id: 'o6', name: 'Quick Stop', outletType: 'Convenience', address: '55 Park Lane', latitude: 6.9200, longitude: 79.8550, isOpen: true, distanceKm: 1.8, rating: 3.9 },
];

const MOCK_OUTLETS: Record<string, Outlet[]> = {
  '1': [MOCK_OUTLETS_POOL[0], MOCK_OUTLETS_POOL[1]],
  '2': [MOCK_OUTLETS_POOL[2]],
  '4': [MOCK_OUTLETS_POOL[0]],
  '6': [MOCK_OUTLETS_POOL[3]],
  '8': [MOCK_OUTLETS_POOL[0]],
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Haversine distance in km between two lat/lng points */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const USE_MOCK = true; // Set to false when your API is ready

export const api = {
  searchItems: (params: SearchParams) => (USE_MOCK ? mockApi.searchItems(params) : searchItems(params)),
  getCategories: () => (USE_MOCK ? mockApi.getCategories() : getCategories()),
  getOutletTypes: () => (USE_MOCK ? mockApi.getOutletTypes() : getOutletTypes()),
  getOpenOutletsForItem: (itemId: string) => (USE_MOCK ? mockApi.getOpenOutletsForItem(itemId) : getOpenOutletsForItem(itemId)),
  searchNearestOutlets: (q: string, lat?: number, lng?: number, opts?: SearchNearestOptions) =>
    USE_MOCK ? mockApi.searchNearestOutlets(q, lat, lng, opts) : searchNearestOutlets(q, lat, lng, opts),
  getRoute: (a: number, b: number, c: number, d: number) =>
    USE_MOCK ? mockApi.getRoute(a, b, c, d) : getRoute(a, b, c, d),
};

export const mockApi = {
  async searchItems(params: SearchParams): Promise<Item[]> {
    console.log('[API] Request (mock): searchItems', params);
    await delay(600);
    let list = [...MOCK_ITEMS];
    if (params.query?.trim()) {
      const q = params.query.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }
    if (params.category) list = list.filter((i) => i.category === params.category);
    console.log('[API] Response (mock): searchItems', list.length, 'items', list);
    return list;
  },
  async getCategories(): Promise<ItemCategory[]> {
    console.log('[API] Request (mock): getCategories');
    await delay(200);
    console.log('[API] Response (mock): getCategories', MOCK_CATEGORIES);
    return MOCK_CATEGORIES;
  },
  async getOutletTypes(): Promise<OutletType[]> {
    console.log('[API] Request (mock): getOutletTypes');
    await delay(200);
    console.log('[API] Response (mock): getOutletTypes', MOCK_OUTLET_TYPES);
    return MOCK_OUTLET_TYPES;
  },
  async getOpenOutletsForItem(itemId: string): Promise<Outlet[]> {
    console.log('[API] Request (mock): getOpenOutletsForItem', { itemId });
    await delay(500);
    const out = MOCK_OUTLETS[itemId] ?? [];
    console.log('[API] Response (mock): getOpenOutletsForItem', out.length, 'outlets', out);
    return out;
  },
  /** Returns nearest outlets for the search query within maxDistanceKm; optional category/outletType filter; default 1km */
  async searchNearestOutlets(
    query: string,
    userLat?: number,
    userLng?: number,
    options?: { category?: ItemCategory; outletType?: OutletType; maxDistanceKm?: number }
  ): Promise<Outlet[]> {
    const maxDistanceKm = options?.maxDistanceKm ?? 1;
    console.log('[API] Request (mock): searchNearestOutlets', { query, userLat, userLng, maxDistanceKm, category: options?.category, outletType: options?.outletType });
    await delay(600);
    const base = userLat != null && userLng != null
      ? [...MOCK_OUTLETS_POOL].map((o) => ({
          ...o,
          distanceKm: haversineKm(userLat, userLng, o.latitude, o.longitude),
        }))
      : MOCK_OUTLETS_POOL.map((o) => ({ ...o, distanceKm: o.distanceKm ?? 0 }));
    let filtered = base.filter((o) => (o.distanceKm ?? 0) <= maxDistanceKm);
    if (options?.outletType) filtered = filtered.filter((o) => o.outletType === options.outletType);
    if (options?.category) {
      const itemIdsInCategory = MOCK_ITEMS.filter((i) => i.category === options.category).map((i) => i.id);
      const outletIdsWithCategory = new Set(
        itemIdsInCategory.flatMap((itemId) => (MOCK_OUTLETS[itemId] ?? []).map((o) => o.id))
      );
      filtered = filtered.filter((o) => outletIdsWithCategory.has(o.id));
    }
    filtered.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    // If none within maxDistanceKm, still return nearest 5 so map/list show something
    const result = filtered.length > 0 ? filtered.slice(0, 10) : base.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)).slice(0, 5);
    console.log('[API] Response (mock): searchNearestOutlets', result.length, 'outlets', result);
    return result;
  },
  /** Returns estimated distance (km) and duration (minutes) for route */
  async getRoute(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ): Promise<RouteInfo> {
    console.log('[API] Request (mock): getRoute', { fromLat, fromLng, toLat, toLng });
    await delay(400);
    const distanceKm = haversineKm(fromLat, fromLng, toLat, toLng);
    const durationMinutes = Math.max(1, Math.round((distanceKm / 30) * 60)); // ~30 km/h avg
    const result = { distanceKm, durationMinutes };
    console.log('[API] Response (mock): getRoute', result);
    return result;
  },
};
