

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
  
  isApproximate?: boolean;
}


function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateDurationSeconds(meters: number, mode: TravelMode): number {
  const kmh = mode === 'walk' ? 5 : mode === 'bike' ? 15 : 45;
  return Math.max(60, Math.round((meters / 1000 / kmh) * 3600));
}


export function getStraightLineFallback(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  mode: TravelMode
): RouteResult {
  const distanceMeters = haversineMeters(originLat, originLng, destLat, destLng);
  return {
    coordinates: [
      { latitude: originLat, longitude: originLng },
      { latitude: destLat, longitude: destLng },
    ],
    distanceMeters,
    durationSeconds: estimateDurationSeconds(distanceMeters, mode),
    isApproximate: true,
  };
}

function nearSame(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
  metersHint = 80
): boolean {
  const d = haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude);
  return d < metersHint;
}


export function buildMapPolyline(
  origin: { lat: number; lng: number },
  routeCoords: { latitude: number; longitude: number }[],
  destLat: number,
  destLng: number
): { latitude: number; longitude: number }[] {
  if (routeCoords.length === 0) {
    return [
      { latitude: origin.lat, longitude: origin.lng },
      { latitude: destLat, longitude: destLng },
    ];
  }
  const out: { latitude: number; longitude: number }[] = [];
  const first = routeCoords[0];
  const originPt = { latitude: origin.lat, longitude: origin.lng };
  if (!nearSame(originPt, first, 100)) {
    out.push(originPt);
  }
  out.push(...routeCoords);
  const last = out[out.length - 1];
  const destPt = { latitude: destLat, longitude: destLng };
  if (!nearSame(last, destPt, 100)) {
    out.push(destPt);
  }
  return out;
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
  const url = `${OSRM_BASE}/${profile}/${coords}?overview=full&geometries=geojson&steps=false`;
  try {
    const res = await fetch(url);
    const data = (await res.json()) as {
      code?: string;
      routes?: Array<{
        geometry?: { type?: string; coordinates?: [number, number][] };
        distance?: number;
        duration?: number;
      }>;
    };
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;
    const route = data.routes[0];
    const coordsRaw = route.geometry?.coordinates ?? [];
    if (coordsRaw.length === 0) return null;
    const coordinates = coordsRaw.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
    return {
      coordinates,
      distanceMeters: route.distance ?? 0,
      durationSeconds: route.duration ?? 0,
      isApproximate: false,
    };
  } catch {
    return null;
  }
}
