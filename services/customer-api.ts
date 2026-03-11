/**
 * Find It Customer API – login, onboarding, countries.
 */

import { FIND_IT_API_BASE } from '@/constants/api';
import type { CustomerOnboardingRequest, FavoriteEntry, Item, Notification, Outlet, OutletDiscount, SearchHistoryEntry } from '@/types/api';

const REQUEST_TIMEOUT_MS = 30_000;

/** fetch with 30s timeout; aborts request on timeout */
async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

if (__DEV__) {
  console.log('[API] Backend base URL:', FIND_IT_API_BASE);
}

/** POST /images/upload – multipart form: file, type="profile". Returns { fileName } or similar. Optional Bearer token. */
export async function uploadProfileImage(
  imageUri: string,
  options?: { token?: string | null }
): Promise<string> {
  const url = `${FIND_IT_API_BASE}/images/upload`;
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    name: 'profile.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);
  formData.append('type', 'profile');

  const headers: Record<string, string> = {};
  if (options?.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  console.log('[API] Request: POST', url, '(multipart, type=profile)');
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text?.slice(0, 200) };
  }
  console.log('[API] Response:', res.status, res.statusText, json);

  if (!res.ok) {
    let message = `Image upload failed (${res.status})`;
    if (json && typeof json === 'object' && 'message' in json && typeof (json as { message: unknown }).message === 'string') {
      message = (json as { message: string }).message;
    } else if (text) message = text.slice(0, 200);
    throw new Error(message);
  }

  const obj = json && typeof json === 'object' ? (json as Record<string, unknown>) : {};
  const fileName =
    (obj.fileName as string) ??
    (obj.filename as string) ??
    (obj.file_name as string) ??
    (obj.data && typeof obj.data === 'object' && 'fileName' in obj.data ? (obj.data as { fileName: string }).fileName : null) ??
    '';
  if (!fileName) {
    throw new Error('Upload response did not contain a file name');
  }
  return String(fileName);
}

/** Profile update payload – fields that can be updated */
export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  nic?: string;
  dob?: string;
  gender?: string;
  countryName?: string;
}

/** PUT /customer-app/profile – update customer profile. Requires Bearer token. */
export async function updateCustomerProfile(
  data: UpdateProfileRequest,
  token: string
): Promise<void> {
  const url = `${FIND_IT_API_BASE}/customer-app/profile`;
  const body = JSON.stringify(data);
  console.log('[API] Request: PUT', url, body);
  const res = await fetchWithTimeout(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body,
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text?.slice(0, 200) };
  }
  console.log('[API] Response:', res.status, res.statusText, json);
  if (!res.ok) {
    let message = `Profile update failed (${res.status})`;
    if (json && typeof json === 'object') {
      const o = json as Record<string, unknown>;
      if (typeof o.responseMessage === 'string') message = o.responseMessage;
      else if (typeof o.message === 'string') message = o.message;
    } else if (text) message = text.slice(0, 200);
    throw new Error(message);
  }
}

/** PUT /customer-app/profile/image – set profile image to uploaded fileName. Body: { fileName }. Requires Bearer token. */
export async function updateProfileImageOnServer(
  fileName: string,
  token: string
): Promise<void> {
  const url = `${FIND_IT_API_BASE}/customer-app/profile/image`;
  const body = JSON.stringify({ fileName });
  console.log('[API] Request: PUT', url, body);
  const res = await fetchWithTimeout(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body,
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text?.slice(0, 200) };
  }
  console.log('[API] Response:', res.status, res.statusText, json);
  if (!res.ok) {
    let message = `Profile image update failed (${res.status})`;
    if (json && typeof json === 'object' && 'message' in json && typeof (json as { message: unknown }).message === 'string') {
      message = (json as { message: string }).message;
    } else if (text) message = text.slice(0, 200);
    throw new Error(message);
  }
}

/** GET /categories – returns list of categories for filter. Query: name, categoryType, status. Requires Bearer token. */
export interface FindItCategory {
  categoryId: number;
  categoryName: string;
  categoryDescription?: string;
  categoryImage?: string;
  categoryType?: string;
  categoryStatus?: string;
}

export async function getFindItCategories(
  options?: { token?: string | null; name?: string; categoryType?: string; status?: string }
): Promise<FindItCategory[]> {
  const params = new URLSearchParams();
  if (options?.name != null) params.set('name', options.name);
  if (options?.categoryType != null) params.set('categoryType', options.categoryType);
  if (options?.status != null) params.set('status', options.status);
  const url = `${FIND_IT_API_BASE}/categories?${params.toString()}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options?.token) headers['Authorization'] = `Bearer ${options.token}`;

  console.log('[API] Request: GET', url);
  const res = await fetchWithTimeout(url, { method: 'GET', headers });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : [];
  } catch {
    data = { raw: text?.slice(0, 200) };
  }
  console.log('[API] Response:', res.status, res.statusText, Array.isArray(data) ? data.length : data);

  if (!res.ok) {
    let message = `Categories failed (${res.status})`;
    if (data && typeof data === 'object' && 'message' in data && typeof (data as { message: unknown }).message === 'string') {
      message = (data as { message: string }).message;
    }
    throw new Error(message);
  }

  if (Array.isArray(data)) return data as FindItCategory[];
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.content)) return o.content as FindItCategory[];
    if (Array.isArray(o.data)) return o.data as FindItCategory[];
  }
  return [];
}

/** Login API response – flat structure (no nested user) */
export interface LoginResponse {
  status?: string;
  responseCode?: string;
  responseMessage?: string;
  token?: string;
  userId?: number;
  email?: string;
  username?: string;
  userStatus?: string;
  role?: string;
  customerId?: number;
  profileImageUrl?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  nic?: string;
  dob?: string;
  gender?: string;
  countryName?: string;
  membershipType?: string;
  customerStatus?: string;
}

/** POST /customer-app/login – email + password, returns flat response */
export async function customerLogin(
  email: string,
  password: string
): Promise<LoginResponse> {
  const url = `${FIND_IT_API_BASE}/customer-app/login`;
  const body = { email, password };
  console.log('[API] Request: POST', url, body);
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text?.slice(0, 200) };
  }
  console.log('[API] Response:', res.status, res.statusText, json);
  if (!res.ok) {
    let message = `Login failed (${res.status})`;
    const obj = json && typeof json === 'object' ? json as Record<string, unknown> : {};
    if (typeof obj.responseMessage === 'string') message = obj.responseMessage;
    else if (typeof obj.message === 'string') message = obj.message;
    else if (text) message = text.slice(0, 200);
    throw new Error(message);
  }
  return (typeof json === 'object' && json !== null ? json : {}) as LoginResponse;
}

/** Request body for change password */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** PUT or POST /customer-app/password – change password. Requires Bearer token. */
export async function changePassword(
  data: ChangePasswordRequest,
  token: string
): Promise<void> {
  const url = `${FIND_IT_API_BASE}/customer-app/password`;
  const body = JSON.stringify({
    currentPassword: data.currentPassword,
    newPassword: data.newPassword,
  });
  console.log('[API] Request: PUT', url, '(password change)');
  const res = await fetchWithTimeout(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body,
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text?.slice(0, 200) };
  }
  console.log('[API] Response:', res.status, res.statusText);
  if (!res.ok) {
    let message = `Password change failed (${res.status})`;
    const obj = json && typeof json === 'object' ? (json as Record<string, unknown>) : {};
    if (typeof obj.responseMessage === 'string') message = obj.responseMessage;
    else if (typeof obj.message === 'string') message = obj.message;
    else if (text) message = text.slice(0, 200);
    throw new Error(message);
  }
}

/** API country item: { code, countryId, name, responseCode?, status? } */
interface CountryItem {
  code?: string;
  countryId?: number;
  name: string;
  responseCode?: string;
  status?: string;
}

function toCountryList(data: unknown): CountryItem[] {
  if (Array.isArray(data)) return data as CountryItem[];
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.content)) return o.content as CountryItem[];
    if (Array.isArray(o.data)) return o.data as CountryItem[];
    if (typeof (o as unknown as CountryItem).name === 'string') return [data as unknown as CountryItem];
  }
  return [];
}

/** GET /countries?name= – returns array of { code, countryId, name, ... }; we return list of names for search/select */
export async function getCountries(searchName: string = ''): Promise<string[]> {
  const nameParam = typeof searchName === 'string' ? searchName.trim() : '';
  const url = `${FIND_IT_API_BASE}/countries?name=${encodeURIComponent(nameParam)}`;
  console.log('[API] Request: GET', url);
  const res = await fetchWithTimeout(url);
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : [];
  } catch {
    data = { raw: text?.slice(0, 200) };
  }
  console.log('[API] Response:', res.status, res.statusText, data);
  if (!res.ok) throw new Error('Failed to load countries');
  const list = toCountryList(data);
  return list
    .map((c) => (typeof c === 'string' ? c : (c as CountryItem)?.name ?? ''))
    .filter((name) => name.length > 0);
}

export async function customerOnboarding(
  data: CustomerOnboardingRequest
): Promise<unknown> {
  const url = `${FIND_IT_API_BASE}/customers/onboarding`;
  const body = { ...data, password: data.password ? '***' : undefined };
  console.log('[API] Request: POST', url, body);
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text?.slice(0, 200) };
  }
  console.log('[API] Response:', res.status, res.statusText, json);
  if (!res.ok) {
    let message = `Registration failed (${res.status})`;
    if (json && typeof json === 'object' && 'message' in json && typeof (json as { message: unknown }).message === 'string') {
      message = (json as { message: string }).message;
    } else if (text) message = text.slice(0, 200);
    throw new Error(message);
  }
  return typeof json === 'object' && json !== null ? json : {};
}

/** GET /notifications/unread/{userId} – list unread notifications for logged-in user. Requires Bearer token. Pass userId from login response (e.g. 12). */
function toNotificationList(data: unknown): Notification[] {
  if (Array.isArray(data)) return data as Notification[];
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.content)) return o.content as Notification[];
    if (Array.isArray(o.data)) return o.data as Notification[];
  }
  return [];
}

export async function getNotifications(token: string | null, userId: string | null): Promise<Notification[]> {
  if (!token || !userId) return [];
  const url = `${FIND_IT_API_BASE}/notifications/unread/${encodeURIComponent(userId)}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  console.log('[API] Request: GET', url);
  try {
    const res = await fetchWithTimeout(url, { method: 'GET', headers });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : [];
    } catch {
      data = { raw: text?.slice(0, 200) };
    }
    console.log('[API] Response:', res.status, res.statusText, Array.isArray(data) ? data.length : data);
    if (!res.ok) return [];
    return toNotificationList(data);
  } catch {
    return [];
  }
}

/** POST /notifications/read/{id} – mark notification as read. Requires Bearer token. */
export async function markNotificationRead(
  notificationId: string,
  token: string | null
): Promise<boolean> {
  if (!token) return false;
  const url = `${FIND_IT_API_BASE}/notifications/read/${encodeURIComponent(notificationId)}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  console.log('[API] Request: POST', url);
  try {
    const res = await fetchWithTimeout(url, { method: 'POST', headers });
    console.log('[API] Response:', res.status, res.statusText);
    return res.ok;
  } catch {
    return false;
  }
}

/** Map raw API favorite item to FavoriteEntry (outlet may be nested) */
function toFavoriteEntry(raw: Record<string, unknown>): FavoriteEntry {
  const customer_favorite_id = Number(raw.customer_favorite_id ?? raw.id ?? 0);
  const outletRaw = raw.outlet ?? raw;
  const outlet = mapOutlet(typeof outletRaw === 'object' && outletRaw !== null ? (outletRaw as Record<string, unknown>) : {});
  const nickname = raw.nickname != null ? String(raw.nickname) : undefined;
  return { customer_favorite_id, outlet, nickname };
}

function toFavoriteList(data: unknown): FavoriteEntry[] {
  if (Array.isArray(data)) return data.map((x) => toFavoriteEntry((x as Record<string, unknown>) ?? {}));
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    const arr = o.content ?? o.data ?? o.favorites;
    if (Array.isArray(arr)) return arr.map((x) => toFavoriteEntry((x as Record<string, unknown>) ?? {}));
  }
  return [];
}

/** GET /customer-app/favorites – list favorites. Requires Bearer token. */
export async function getFavorites(token: string | null): Promise<FavoriteEntry[]> {
  if (!token) return [];
  const url = `${FIND_IT_API_BASE}/customer-app/favorites`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  console.log('[API] Request: GET', url);
  try {
    const res = await fetchWithTimeout(url, { method: 'GET', headers });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : [];
    } catch {
      data = [];
    }
    console.log('[API] Response:', res.status, res.statusText);
    if (!res.ok) return [];
    return toFavoriteList(data);
  } catch {
    return [];
  }
}

/** POST /customer-app/favorites – add outlet to favorites. Body: { outletId, nickname }. Requires Bearer token. */
export async function addFavoriteOutlet(
  token: string | null,
  outletId: string,
  nickname: string
): Promise<void> {
  if (!token) return;
  const url = `${FIND_IT_API_BASE}/customer-app/favorites`;
  const outletIdNum = Number(outletId);
  if (Number.isNaN(outletIdNum)) throw new Error('Invalid outlet id');
  const body = JSON.stringify({ outletId: outletIdNum, nickname: nickname || undefined });
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  console.log('[API] Request: POST', url, { outletId: outletIdNum, nickname });
  const res = await fetchWithTimeout(url, { method: 'POST', headers, body });
  const text = await res.text();
  console.log('[API] Response:', res.status, res.statusText);
  if (!res.ok) {
    let msg = `Add favorite failed (${res.status})`;
    try {
      const j = text ? JSON.parse(text) : {};
      if (typeof (j as Record<string, unknown>).responseMessage === 'string') msg = (j as Record<string, unknown>).responseMessage as string;
    } catch {
      if (text) msg = text.slice(0, 200);
    }
    throw new Error(msg);
  }
}

/** DELETE /customer-app/favorites/{customer_favorite_id} – remove from favorites. Requires Bearer token. */
export async function removeFavoriteOutlet(
  token: string | null,
  customer_favorite_id: number
): Promise<void> {
  if (!token) return;
  const url = `${FIND_IT_API_BASE}/customer-app/favorites/${encodeURIComponent(String(customer_favorite_id))}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  console.log('[API] Request: DELETE', url);
  const res = await fetchWithTimeout(url, { method: 'DELETE', headers });
  console.log('[API] Response:', res.status, res.statusText);
  if (!res.ok) throw new Error(`Remove favorite failed (${res.status})`);
}

/** Request body for POST /customer-app/search-history */
export interface SaveSearchHistoryRequest {
  searchText: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  categoryId?: number | string | null;
  outletType?: string | null;
}

/** POST /customer-app/search-history – save a search (text + location + filters). Requires Bearer token. */
export async function saveSearchHistory(
  token: string | null,
  body: SaveSearchHistoryRequest
): Promise<void> {
  if (!token) return;
  const url = `${FIND_IT_API_BASE}/customer-app/search-history`;
  const payload = {
    searchText: body.searchText.trim(),
    latitude: body.latitude,
    longitude: body.longitude,
    distanceKm: body.distanceKm,
    categoryId: body.categoryId ?? null,
    outletType: body.outletType ?? null,
  };
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  console.log('[API] Request: POST', url, payload);
  const res = await fetchWithTimeout(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  const text = await res.text();
  console.log('[API] Response:', res.status, res.statusText);
  if (!res.ok) {
    let msg = `Save search history failed (${res.status})`;
    try {
      const j = text ? JSON.parse(text) : {};
      if (typeof (j as Record<string, unknown>).responseMessage === 'string') msg = (j as Record<string, unknown>).responseMessage as string;
    } catch {
      if (text) msg = text.slice(0, 200);
    }
    throw new Error(msg);
  }
}

function toSearchHistoryList(data: unknown): SearchHistoryEntry[] {
  if (!data || typeof data !== 'object') return [];
  const o = data as Record<string, unknown>;
  const arr = o.content ?? o.data ?? o.searchHistory ?? (Array.isArray(data) ? data : null);
  if (!Array.isArray(arr)) return [];
  return arr.map((item: unknown, index: number) => {
    const x = (item as Record<string, unknown>) ?? {};
    const id = String(x.id ?? x.searchHistoryId ?? index);
    const query = String(x.searchText ?? x.query ?? '');
    const timestamp = typeof x.timestamp === 'number' ? x.timestamp : (x.createdAt ? new Date(String(x.createdAt)).getTime() : Date.now());
    const outletsRaw = x.outlets;
    const outlets = Array.isArray(outletsRaw) ? (outletsRaw as Record<string, unknown>[]).map((r) => mapOutlet(r)) : [];
    return { id, query, outlets, timestamp };
  });
}

/** GET /customer-app/search-history – list search history. Requires Bearer token. */
export async function getSearchHistory(token: string | null): Promise<SearchHistoryEntry[]> {
  if (!token) return [];
  const url = `${FIND_IT_API_BASE}/customer-app/search-history`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  console.log('[API] Request: GET', url);
  try {
    const res = await fetchWithTimeout(url, { method: 'GET', headers });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : [];
    } catch {
      data = [];
    }
    console.log('[API] Response:', res.status, res.statusText);
    if (!res.ok) return [];
    return toSearchHistoryList(data);
  } catch {
    return [];
  }
}

/** DELETE /customer-app/search-history/{id} – remove one entry. Requires Bearer token. */
export async function deleteSearchHistoryEntry(token: string | null, id: string): Promise<void> {
  if (!token) return;
  const url = `${FIND_IT_API_BASE}/customer-app/search-history/${encodeURIComponent(id)}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  console.log('[API] Request: DELETE', url);
  const res = await fetchWithTimeout(url, { method: 'DELETE', headers });
  console.log('[API] Response:', res.status, res.statusText);
  if (!res.ok) throw new Error(`Delete search history failed (${res.status})`);
}

/** Request body for POST /customer-app/feedback */
export interface SubmitFeedbackRequest {
  outletId: number;
  feedbackText: string;
  rating: number;
}

/** POST /customer-app/feedback – submit outlet feedback (rating + text). Requires Bearer token. */
export async function submitFeedback(
  token: string | null,
  body: SubmitFeedbackRequest
): Promise<void> {
  if (!token) return;
  const url = `${FIND_IT_API_BASE}/customer-app/feedback`;
  const payload = {
    outletId: body.outletId,
    feedbackText: body.feedbackText?.trim() ?? '',
    rating: body.rating,
  };
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  console.log('[API] Request: POST', url, payload);
  const res = await fetchWithTimeout(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  const text = await res.text();
  console.log('[API] Response:', res.status, res.statusText);
  if (!res.ok) {
    let msg = `Submit feedback failed (${res.status})`;
    try {
      const j = text ? JSON.parse(text) : {};
      if (typeof (j as Record<string, unknown>).responseMessage === 'string') msg = (j as Record<string, unknown>).responseMessage as string;
    } catch {
      if (text) msg = text.slice(0, 200);
    }
    throw new Error(msg);
  }
}

function normalizeOutletDiscounts(data: unknown): OutletDiscount[] {
  let list: unknown[] = [];
  if (Array.isArray(data)) list = data;
  else if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.content)) list = o.content;
    else if (Array.isArray(o.data)) list = o.data;
    else if (Array.isArray(o.discounts)) list = o.discounts;
  }
  return list.map((item: unknown, index: number) => {
    const x = item as Record<string, unknown>;
    const id = String(x.discountId ?? x.id ?? index);
    const title = String(x.discountName ?? x.title ?? x.discountTitle ?? x.name ?? '');
    const imageVal = x.discountImage ?? x.image ?? x.imageUrl ?? x.fileName;
    const image = imageVal != null && String(imageVal).trim() !== '' ? String(imageVal) : undefined;
    const discountType = x.discountType != null ? String(x.discountType) : '';
    const discountValue = x.discountValue != null ? Number(x.discountValue) : null;
    const discountPercentage =
      discountType === 'PERCENTAGE' && discountValue != null ? discountValue : (x.discountPercentage != null ? Number(x.discountPercentage) : undefined);
    const validFrom = x.startDate != null ? String(x.startDate) : (x.validFrom != null ? String(x.validFrom) : undefined);
    const validTo = x.endDate != null ? String(x.endDate) : (x.validTo != null ? String(x.validTo) : undefined);
    const itemsArr = Array.isArray(x.items) ? x.items as Array<{ itemName?: string; itemId?: unknown }> : [];
    const itemNames = itemsArr.map((i) => i.itemName ?? '').filter(Boolean);
    let description: string | undefined = x.description != null ? String(x.description) : undefined;
    if (description == null || description === '') {
      if (discountType === 'PERCENTAGE' && discountValue != null) {
        description = itemNames.length > 0 ? `${discountValue}% off · ${itemNames.join(', ')}` : `${discountValue}% off`;
      } else if (discountType === 'FIXED_AMOUNT' && discountValue != null) {
        description = itemNames.length > 0 ? `LKR ${discountValue} off · ${itemNames.join(', ')}` : `LKR ${discountValue} off`;
      } else if (itemNames.length > 0) {
        description = itemNames.join(', ');
      }
    }
    return { id, title, description, image, discountPercentage, validFrom, validTo };
  });
}

/** GET /outlets/:outletId/discounts – current available discounts for an outlet. Requires Bearer token. */
export async function getOutletDiscounts(
  token: string | null,
  outletId: string
): Promise<OutletDiscount[]> {
  if (!token || !outletId) return [];
  const url = `${FIND_IT_API_BASE}/outlets/${encodeURIComponent(outletId)}/discounts`;
  console.log('[API] Request: GET', url);
  try {
    const res = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : [];
    } catch {
      data = { raw: text?.slice(0, 200) };
    }
    console.log('[API] Response:', res.status, res.statusText, Array.isArray(data) ? data.length : data);
    if (!res.ok) return [];
    return normalizeOutletDiscounts(data);
  } catch {
    return [];
  }
}

/** Request body for POST /customer-app/outlets/nearest */
export interface NearestOutletsRequest {
  latitude: number;
  longitude: number;
  itemName?: string | null;
  distanceKm?: number | null;
  categoryId?: number | string | null;
  outletType?: string | null;
}

function mapItem(raw: Record<string, unknown>, index: number): Item {
  const id = String(raw.itemId ?? raw.id ?? index);
  const name = String(raw.itemName ?? raw.name ?? '');
  const cat = raw.categoryName ?? raw.category ?? '';
  const category = typeof cat === 'string' ? cat : String(cat);
  const avail = raw.availability;
  const availability = avail === true || avail === 'Yes' ? 'Yes' : 'No';
  const item: Item = { id, name, category, availability };
  if (raw.itemName != null) item.itemName = String(raw.itemName);
  if (raw.categoryName != null) item.categoryName = String(raw.categoryName);
  if (raw.itemImage != null && String(raw.itemImage).trim() !== '') item.itemImage = String(raw.itemImage);
  if (typeof raw.price === 'number') item.price = raw.price;
  if (typeof raw.offerPrice === 'number') item.offerPrice = raw.offerPrice;
  if (typeof raw.discountAvailable === 'boolean') item.discountAvailable = raw.discountAvailable;
  if (raw.itemDescription != null) item.itemDescription = String(raw.itemDescription);
  return item;
}

function mapOutlet(raw: Record<string, unknown>): Outlet {
  const id = String(raw.outletId ?? raw.id ?? '');
  const name = String(raw.outletName ?? raw.name ?? '');
  const address = String(raw.addressLine1 ?? raw.address ?? '');
  const latitude = Number(raw.latitude ?? 0);
  const longitude = Number(raw.longitude ?? 0);
  const currentStatus = raw.currentStatus ?? raw.status;
  const isOpen = currentStatus === 'OPEN' || currentStatus === 'Open';
  const distanceKm = raw.distanceKm != null ? Number(raw.distanceKm) : undefined;
  const rating = raw.rating != null ? Number(raw.rating) : undefined;
  const outletType = String(raw.outletType ?? '');
  const outlet: Outlet = { id, name, outletType, address, latitude, longitude, isOpen, distanceKm, rating };
  const itemsRaw = raw.items;
  if (Array.isArray(itemsRaw)) {
    outlet.items = itemsRaw.map((x: unknown, i: number) => mapItem((x as Record<string, unknown>) ?? {}, i));
  }
  return outlet;
}

function toOutletList(data: unknown): Outlet[] {
  if (!data || typeof data !== 'object') return [];
  const o = data as Record<string, unknown>;
  const arr = o.outlets ?? o.content ?? o.data;
  if (!Array.isArray(arr)) return [];
  return arr.map((x: unknown) => mapOutlet((x as Record<string, unknown>) ?? {}));
}

/** POST /customer-app/outlets/nearest – search nearest outlets with filters. Requires Bearer token. */
export async function getNearestOutlets(
  token: string | null,
  body: NearestOutletsRequest
): Promise<Outlet[]> {
  if (!token) return [];
  const url = `${FIND_IT_API_BASE}/customer-app/outlets/nearest`;
  const payload = {
    latitude: body.latitude,
    longitude: body.longitude,
    itemName: body.itemName ?? null,
    distanceKm: body.distanceKm ?? null,
    categoryId: body.categoryId ?? null,
    outletType: body.outletType ?? null,
  };
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  console.log('[API] Request: POST', url, payload);
  try {
    const res = await fetchWithTimeout(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }
    const outletsArr = data && typeof data === 'object' && 'outlets' in data ? (data as { outlets: unknown }).outlets : undefined;
    console.log('[API] Response:', res.status, res.statusText, Array.isArray(outletsArr) ? outletsArr.length : 0);
    if (!res.ok) return [];
    return toOutletList(data);
  } catch {
    return [];
  }
}
