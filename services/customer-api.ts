/**
 * Find It Customer API – login, onboarding, countries.
 */

import { FIND_IT_API_BASE } from '@/constants/api';
import type { CustomerOnboardingRequest } from '@/types/api';

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
  const res = await fetch(url, {
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

/** POST /customer-app/login – email + password, returns token (and optionally user) */
export async function customerLogin(
  email: string,
  password: string
): Promise<{ token?: string; accessToken?: string; user?: { id?: string; email?: string; name?: string; mobile?: string } }> {
  const url = `${FIND_IT_API_BASE}/customer-app/login`;
  const body = { email, password };
  console.log('[API] Request: POST', url, body);
  const res = await fetch(url, {
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
    if (json && typeof json === 'object' && 'message' in json && typeof (json as { message: unknown }).message === 'string') {
      message = (json as { message: string }).message;
    } else if (text) message = text.slice(0, 200);
    throw new Error(message);
  }
  return (typeof json === 'object' && json !== null ? json : {}) as { token?: string; accessToken?: string; user?: { id?: string; email?: string; name?: string; mobile?: string } };
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
  const res = await fetch(url);
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
  const res = await fetch(url, {
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
