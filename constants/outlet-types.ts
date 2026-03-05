/**
 * Outlet types for filter – API expects these enum values; UI shows capitalised labels.
 */

/** Values sent to API (e.g. PHYSICAL_STORE, ONLINE_STORE) */
export const OUTLET_TYPE_VALUES = [
  'PHYSICAL_STORE',   // Walk-in outlet
  'ONLINE_STORE',     // Delivery-only / website-based
  'FRANCHISE',        // Franchise outlet
  'KIOSK',            // Small booth / mall kiosk
  'MOBILE_OUTLET',    // Food truck / mobile service
  'WAREHOUSE',        // Storage / fulfillment center
  'PICKUP_POINT',     // Click & collect
  'VENDING_MACHINE',  // Automated vending
  'POP_UP_STORE',     // Temporary outlet
  'MARKET_STALL',     // Farmers market / weekend market
  'HOME_BUSINESS',    // Work from home
  'PARTNER_OUTLET',
] as const;

export type OutletTypeValue = (typeof OUTLET_TYPE_VALUES)[number];

/** Convert API value to display label: PHYSICAL_STORE → "Physical Store" */
export function outletTypeToLabel(value: string): string {
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
