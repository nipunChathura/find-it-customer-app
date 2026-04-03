


export const OUTLET_TYPE_VALUES = [
  'PHYSICAL_STORE',
  'ONLINE_STORE',
  'FRANCHISE',
  'KIOSK',
  'MOBILE_OUTLET',
  'WAREHOUSE',
  'PICKUP_POINT',
  'VENDING_MACHINE',
  'POP_UP_STORE',
  'MARKET_STALL',
  'HOME_BUSINESS',
  'PARTNER_OUTLET',
] as const;

export type OutletTypeValue = (typeof OUTLET_TYPE_VALUES)[number];


export function outletTypeToLabel(value: string): string {
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
