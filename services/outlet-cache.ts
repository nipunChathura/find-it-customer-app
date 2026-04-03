

import type { Outlet } from '@/types/api';

const cache = new Map<string, Outlet>();

export function setOutletCache(outlet: Outlet): void {
  cache.set(outlet.id, outlet);
}

export function getOutletFromCache(id: string): Outlet | undefined {
  return cache.get(id);
}
