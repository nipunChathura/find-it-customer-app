/**
 * Fetch route geometry from OSRM (public, no API key) for in-app map display.
 * Profiles: driving (car), walking (walk), cycling (bike).
 */

const OSRM_BASE = 'https://router.project-osrm.org/route/v1';

export type TravelMode = 'car' | 'bike' | 'walk';

const PROFILE: Record<TravelMode, string> = {
  car: 'driving',
  bike: 'cycling',
  walk: 'walking',
};

export interface RouteResult {
  coordinates: { latitude: number; longitude: number }[];
  distanceMeters: number;
  durationSeconds: number;
}

export async function fetchRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  mode: TravelMode
): Promise<RouteResult | null> {
  const profile = PROFILE[mode];
  const coords = `${originLng},${originLat};${destLng},${destLat}`;
  const url = `${OSRM_BASE}/${profile}/${coords}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    const data = (await res.json()) as {
      code?: string;
      routes?: Array<{
        geometry?: { coordinates?: [number, number][] };
        distance?: number;
        duration?: number;
      }>;
    };
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;
    const route = data.routes[0];
    const coordsRaw = route.geometry?.coordinates ?? [];
    const coordinates = coordsRaw.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
    return {
      coordinates,
      distanceMeters: route.distance ?? 0,
      durationSeconds: route.duration ?? 0,
    };
  } catch {
    return null;
  }
}
