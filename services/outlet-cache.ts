/**
 * Cache the current outlet (with items) when navigating from home so the outlet page
 * receives full data (price, categoryName, itemImage, etc.) without URL param limits.
 */

import type { Outlet } from '@/types/api';

const cache = new Map<string, Outlet>();

export function setOutletCache(outlet: Outlet): void {
  cache.set(outlet.id, outlet);
}

export function getOutletFromCache(id: string): Outlet | undefined {
  return cache.get(id);
}
