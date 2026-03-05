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

function toFavoriteEntryList(data: unknown): FavoriteEntry[] {
  let list: unknown[] = [];
  if (Array.isArray(data)) list = data;
  else if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.content)) list = o.content;
    else if (Array.isArray(o.data)) list = o.data;
    else if (Array.isArray(o.favorites)) list = o.favorites;
  }
  return list.map((item: unknown) => {
    const x = item as Record<string, unknown>;
    // API shape: { id, nickname, outlet: { outletId, outletName, addressLine1, latitude, longitude, rating, status } }
    const outletRaw = x.outlet && typeof x.outlet === 'object' ? x.outlet : x;
    const outlet = toOutletList([outletRaw])[0];
    const customer_favorite_id = Number(x.customer_favorite_id ?? x.customerFavoriteId ?? x.id ?? 0);
    const nickname = x.nickname != null && String(x.nickname).trim() !== '' ? String(x.nickname) : undefined;
    return { outlet, customer_favorite_id, nickname };
  }).filter((e) => e.outlet.id && e.customer_favorite_id > 0);
}

/** GET /customer-app/favorites – returns list of favorite outlets with customer_favorite_id and nickname. Requires Bearer token. */
export async function getFavorites(token: string): Promise<FavoriteEntry[]> {
  const url = `${FIND_IT_API_BASE}/customer-app/favorites`;
  console.log('[API] Request: GET', url);
  const res = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : [];
  } catch {
    data = { raw: text?.slice(0, 200) };
  }
  console.log('[API] Response:', res.status, res.statusText, Array.isArray(data) ? data.length : data);
  if (!res.ok) {
    let message = `Favorites failed (${res.status})`;
    if (data && typeof data === 'object' && 'message' in data && typeof (data as { message: unknown }).message === 'string') {
      message = (data as { message: string }).message;
    }
    throw new Error(message);
  }
  return toFavoriteEntryList(data);
}

/** POST /customer-app/favorites – add outlet to favorites. Body: { outletId: number, nickname }. Requires Bearer token. */
export async function addFavoriteOutlet(
  token: string,
  outletId: string | number,
  nickname: string
): Promise<void> {
  const url = `${FIND_IT_API_BASE}/customer-app/favorites`;
  const body = JSON.stringify({
    outletId: typeof outletId === 'string' ? parseInt(outletId, 10) || 0 : outletId,
    nickname: nickname.trim() || undefined,
  });
  console.log('[API] Request: POST', url, body);
  const res = await fetchWithTimeout(url, {
    method: 'POST',
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
    let message = `Add favorite failed (${res.status})`;
    if (json && typeof json === 'object' && 'message' in json && typeof (json as { message: unknown }).message === 'string') {
      message = (json as { message: string }).message;
    }
    throw new Error(message);
  }
}

/** DELETE /customer-app/favorites/:customer_favorite_id – remove from favorites. Requires Bearer token. */
export async function removeFavoriteOutlet(token: string, customer_favorite_id: number): Promise<void> {
  const url = `${FIND_IT_API_BASE}/customer-app/favorites/${encodeURIComponent(String(customer_favorite_id))}`;
  console.log('[API] Request: DELETE', url);
  const res = await fetchWithTimeout(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
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
    let message = `Remove favorite failed (${res.status})`;
    if (json && typeof json === 'object' && 'message' in json && typeof (json as { message: unknown }).message === 'string') {
      message = (json as { message: string }).message;
    }
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

/** Request body for POST /customer-app/outlets/nearest */
export interface NearestOutletsRequest {
  latitude: number;
  longitude: number;
  itemName: string;
  distanceKm: number;
  categoryId: number | null;
  outletType: string | null;
}

/** Map /customer-app/outlets/nearest response (outlets array or { outlets } or { data: { outlets } }) to Outlet[] */
function toOutletList(data: unknown): Outlet[] {
  let list: unknown[] = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.outlets)) list = o.outlets;
    else if (Array.isArray(o.content)) list = o.content;
    else if (Array.isArray(o.data)) list = o.data;
    else if (o.data && typeof o.data === 'object') {
      const d = o.data as Record<string, unknown>;
      if (Array.isArray(d.outlets)) list = d.outlets;
    }
  }
  return list.map((item: unknown) => {
    const x = item as Record<string, unknown>;
    const currentStatus = String(x.currentStatus ?? x.isOpen ?? x.status ?? 'OPEN').toUpperCase();
    const outlet: Outlet = {
      id: String(x.outletId ?? x.id ?? ''),
      name: String(x.outletName ?? x.name ?? ''),
      outletType: String(x.outletType ?? x.outletTypeName ?? '') as Outlet['outletType'],
      address: String(x.addressLine1 ?? x.address ?? ''),
      latitude: Number(x.latitude ?? 0),
      longitude: Number(x.longitude ?? 0),
      isOpen: currentStatus === 'OPEN' || currentStatus === 'ACTIVE',
      distanceKm: x.distanceKm != null ? Number(x.distanceKm) : undefined,
      rating: x.rating != null ? Number(x.rating) : undefined,
    };
    const rawItems = x.items;
    if (Array.isArray(rawItems) && rawItems.length > 0) {
      outlet.items = rawItems.map((it: unknown) => {
        const i = it as Record<string, unknown>;
        const itemName = String(i.itemName ?? i.item_name ?? i.name ?? '');
        const categoryName = String(i.categoryName ?? i.category_name ?? i.category ?? '');
        const availabilityVal = i.availability;
        const availability: Item['availability'] =
          availabilityVal === false || availabilityVal === 'No' || availabilityVal === 'NO' ? 'No' : 'Yes';
        const itemDescription = i.itemDescription ?? i.item_description;
        const itemImageVal = i.itemImage ?? i.item_image ?? i.imageUrl ?? i.image_url;
        const offerPriceVal = i.offerPrice ?? i.offer_price;
        const priceVal = i.price;
        const num = (v: unknown): number | undefined =>
          typeof v === 'number' && !Number.isNaN(v) ? v : v != null && v !== '' ? Number(v) : undefined;
        return {
          id: String(i.itemId ?? i.item_id ?? i.id ?? ''),
          name: itemName,
          category: categoryName,
          availability,
          itemName,
          categoryName,
          discountAvailable: Boolean(i.discountAvailable ?? i.discount_available ?? i.discount ?? false),
          itemDescription: itemDescription != null && itemDescription !== '' ? String(itemDescription) : undefined,
          itemImage: itemImageVal != null && String(itemImageVal).trim() !== '' ? String(itemImageVal) : undefined,
          offerPrice: num(offerPriceVal),
          price: num(priceVal),
        };
      });
    }
    return outlet;
  });
}

/** Map API item array (from outlets/nearest or outlets/:id/items) to Item[] */
function mapItemsFromResponse(data: unknown): Item[] {
  let list: unknown[] = [];
  if (Array.isArray(data)) list = data;
  else if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.items)) list = o.items;
    else if (Array.isArray(o.content)) list = o.content;
  }
  return list.map((it: unknown) => {
    const i = it as Record<string, unknown>;
    const itemName = String(i.itemName ?? i.item_name ?? i.name ?? '');
    const categoryName = String(i.categoryName ?? i.category_name ?? i.category ?? '');
    const availabilityVal = i.availability;
    const availability: Item['availability'] =
      availabilityVal === false || availabilityVal === 'No' || availabilityVal === 'NO' ? 'No' : 'Yes';
    const itemImageVal = i.itemImage ?? i.item_image ?? i.imageUrl ?? i.image_url;
    const offerPriceVal = i.offerPrice ?? i.offer_price;
    const priceVal = i.price;
    const num = (v: unknown): number | undefined =>
      typeof v === 'number' && !Number.isNaN(v) ? v : v != null && v !== '' ? Number(v) : undefined;
    return {
      id: String(i.itemId ?? i.item_id ?? i.id ?? ''),
      name: itemName,
      category: categoryName,
      availability,
      itemName,
      categoryName,
      discountAvailable: Boolean(i.discountAvailable ?? i.discount_available ?? i.discount ?? false),
      itemDescription: i.itemDescription != null && i.itemDescription !== '' ? String(i.itemDescription) : undefined,
      itemImage: itemImageVal != null && String(itemImageVal).trim() !== '' ? String(itemImageVal) : undefined,
      offerPrice: num(offerPriceVal),
      price: num(priceVal),
    };
  });
}

/** Params for GET /customer-app/items/search */
export interface ItemsSearchParams {
  search?: string;
  categoryId?: number | null;
  outletId?: string | null;
  availability?: boolean | null;
}

/** GET /customer-app/items/search?search=...&categoryId=...&outletId=...&availability=... – item search. Requires Bearer token. */
export async function searchItems(
  token: string | null,
  params: ItemsSearchParams
): Promise<Item[]> {
  if (!token) return [];
  const q = new URLSearchParams();
  if (params.search != null && params.search.trim() !== '') q.set('search', params.search.trim());
  if (params.categoryId != null) q.set('categoryId', String(params.categoryId));
  if (params.outletId != null && String(params.outletId).trim() !== '') q.set('outletId', String(params.outletId));
  if (params.availability !== undefined && params.availability !== null) q.set('availability', String(params.availability));
  const qs = q.toString();
  const url = `${FIND_IT_API_BASE}/customer-app/items/search${qs ? `?${qs}` : ''}`;
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
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
    if (!res.ok) return [];
    return mapItemsFromResponse(data);
  } catch {
    return [];
  }
}

/** POST /customer-app/outlets/nearest – get nearest outlets. Requires Bearer token. Uses current location (lat/lng), optional itemName, distanceKm, categoryId, outletType. */
export async function getNearestOutlets(
  token: string | null,
  body: NearestOutletsRequest
): Promise<Outlet[]> {
  if (!token) return [];
  const url = `${FIND_IT_API_BASE}/customer-app/outlets/nearest`;
  const reqBody = JSON.stringify({
    latitude: body.latitude,
    longitude: body.longitude,
    itemName: body.itemName ?? '',
    distanceKm: body.distanceKm ?? 10,
    categoryId: body.categoryId,
    outletType: body.outletType,
  });
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  console.log('[API] Request: POST', url, body);
  try {
    const res = await fetchWithTimeout(url, { method: 'POST', headers, body: reqBody });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : [];
    } catch {
      data = { raw: text?.slice(0, 200) };
    }
    console.log('[API] Response:', res.status, res.statusText, Array.isArray(data) ? data.length : data);
    if (!res.ok) return [];
    return toOutletList(data);
  } catch {
    return [];
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
    const title = String(x.title ?? x.discountTitle ?? x.name ?? '');
    const description = x.description != null ? String(x.description) : undefined;
    const imageVal = x.image ?? x.imageUrl ?? x.fileName ?? x.discountImage;
    const image = imageVal != null && String(imageVal).trim() !== '' ? String(imageVal) : undefined;
    const discountPercentage = x.discountPercentage != null ? Number(x.discountPercentage) : undefined;
    const validFrom = x.validFrom != null ? String(x.validFrom) : undefined;
    const validTo = x.validTo != null ? String(x.validTo) : undefined;
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

/** GET /customer-app/search-history – returns list of search history entries. Requires Bearer token. */
export async function getSearchHistory(token: string): Promise<SearchHistoryEntry[]> {
  const url = `${FIND_IT_API_BASE}/customer-app/search-history`;
  console.log('[API] Request: GET', url);
  const res = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : [];
  } catch {
    data = { raw: text?.slice(0, 200) };
  }
  console.log('[API] Response:', res.status, res.statusText, Array.isArray(data) ? data.length : data);
  if (!res.ok) {
    let message = `Search history failed (${res.status})`;
    if (data && typeof data === 'object' && 'message' in data && typeof (data as { message: unknown }).message === 'string') {
      message = (data as { message: string }).message;
    }
    throw new Error(message);
  }
  return normalizeSearchHistory(data);
}

function normalizeSearchHistory(data: unknown): SearchHistoryEntry[] {
  let list: unknown[] = [];
  if (Array.isArray(data)) list = data;
  else if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.content)) list = o.content;
    else if (Array.isArray(o.data)) list = o.data;
  }
  return list.map((item: unknown, index: number) => {
    const x = item as Record<string, unknown>;
    const id = String(x.id ?? x.searchHistoryId ?? index);
    const query = String(x.searchText ?? x.query ?? '').trim();
    const ts = x.timestamp ?? x.createdAt ?? x.searchedAt;
    const timestamp = typeof ts === 'number' ? ts : ts ? new Date(String(ts)).getTime() : Date.now();
    const rawOutlets = x.outlets ?? x.outletList ?? x.results;
    const outlets = Array.isArray(rawOutlets) ? toOutletList(rawOutlets) : [];
    const distanceKm = x.distanceKm != null ? Number(x.distanceKm) : undefined;
    const latitude = x.latitude != null ? Number(x.latitude) : undefined;
    const longitude = x.longitude != null ? Number(x.longitude) : undefined;
    return { id, query, outlets, timestamp, distanceKm, latitude, longitude };
  });
}

/** DELETE /customer-app/search-history/:id – remove one search history entry. Requires Bearer token. */
export async function deleteSearchHistoryEntry(token: string, id: string): Promise<void> {
  const url = `${FIND_IT_API_BASE}/customer-app/search-history/${encodeURIComponent(id)}`;
  console.log('[API] Request: DELETE', url);
  const res = await fetchWithTimeout(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
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
    let message = `Delete search history failed (${res.status})`;
    if (json && typeof json === 'object' && 'message' in json && typeof (json as { message: unknown }).message === 'string') {
      message = (json as { message: string }).message;
    }
    throw new Error(message);
  }
}

/** Request body for POST /customer-app/search-history */
export interface SaveSearchHistoryRequest {
  searchText: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  categoryId: number | null;
  outletType: string | null;
}

/** POST /customer-app/search-history – save search to history. Requires Bearer token. Call after customer searches. */
export async function saveSearchHistory(
  token: string | null,
  body: SaveSearchHistoryRequest
): Promise<void> {
  if (!token) return;
  const url = `${FIND_IT_API_BASE}/customer-app/search-history`;
  const reqBody = JSON.stringify({
    searchText: body.searchText,
    latitude: body.latitude,
    longitude: body.longitude,
    distanceKm: body.distanceKm ?? 10,
    categoryId: body.categoryId,
    outletType: body.outletType,
  });
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  console.log('[API] Request: POST', url, '(search-history)');
  try {
    const res = await fetchWithTimeout(url, { method: 'POST', headers, body: reqBody });
    console.log('[API] Response:', res.status, res.statusText);
  } catch {
    // ignore save failure so search flow is not blocked
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
    const list = toNotificationList(data);
    return list;
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
