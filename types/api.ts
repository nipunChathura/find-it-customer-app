export type ItemCategory = string;
export type OutletType = string;

/** Logged-in customer (from JWT / API – login response is flat) */
export interface User {
  id: string;
  email: string;
  name: string;
  mobile: string;
  /** Profile image URL (fileName from backend, e.g. profile/abc.jpg) */
  profileImageUrl?: string;
  /** From login response */
  userId?: number;
  username?: string;
  userStatus?: string;
  role?: string;
  customerId?: number;
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

/** Item from search or outlet items (nearest API) */
export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  availability: 'Yes' | 'No';
  itemName?: string;
  categoryName?: string;
  itemImage?: string;
  offerPrice?: number;
  price?: number;
  discountAvailable?: boolean;
  itemDescription?: string;
}

/** Outlet with location, rating, and distance for list/map */
export interface Outlet {
  id: string;
  name: string;
  outletType: OutletType;
  address: string;
  latitude: number;
  longitude: number;
  isOpen: boolean;
  distanceKm?: number;
  /** 1-5 for list display */
  rating?: number;
  /** Items from /customer-app/outlets/nearest (for outlet page) */
  items?: Item[];
}

export interface SearchFilters {
  category?: ItemCategory;
  outletType?: OutletType;
}

export interface SearchParams extends SearchFilters {
  query?: string;
}

/** One entry in search history (query + results at time of search) */
export interface SearchHistoryEntry {
  id: string;
  query: string;
  outlets: Outlet[];
  timestamp: number;
}

/** Outlet the user has visited (for route history) */
export interface VisitedOutletEntry {
  outlet: Outlet;
  visitedAt: number;
}

/** Route summary for navigation (distance + ETA) */
export interface RouteInfo {
  distanceKm: number;
  durationMinutes: number;
}

/** Discount from GET /outlets/:outletId/discounts – current available discounts for an outlet */
export interface OutletDiscount {
  id: string;
  title: string;
  description?: string;
  /** Image path/fileName for images/show API (e.g. discount/xxx.jpg or xxx.jpg) */
  image?: string;
  discountPercentage?: number;
  validFrom?: string;
  validTo?: string;
}

/** Notification for customer (list + mark as read) */
export interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string; // ISO date
}

/** One favorite entry from GET /customer-app/favorites (nested outlet + id for DELETE) */
export interface FavoriteEntry {
  customer_favorite_id: number;
  outlet: Outlet;
  nickname?: string;
}

/** Customer onboarding (registration) request – POST /customers/onboarding */
export interface CustomerOnboardingRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nic: string;
  dob: string;
  gender: 'MALE' | 'FEMALE';
  countryName: string;
  profileImage: string | null;
  membershipType: string;
  username: string;
  password: string;
}
