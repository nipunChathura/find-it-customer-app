export type ItemCategory = string;
export type OutletType = string;


export interface User {
  id: string;
  email: string;
  name: string;
  mobile: string;
  
  profileImageUrl?: string;
  
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


export interface Outlet {
  id: string;
  name: string;
  outletType: OutletType;
  address: string;
  latitude: number;
  longitude: number;
  isOpen: boolean;
  distanceKm?: number;
  
  rating?: number;
  
  items?: Item[];
}

export interface SearchFilters {
  category?: ItemCategory;
  outletType?: OutletType;
}

export interface SearchParams extends SearchFilters {
  query?: string;
}


export interface SearchHistoryEntry {
  id: string;
  query: string;
  outlets: Outlet[];
  timestamp: number;
}


export interface VisitedOutletEntry {
  outlet: Outlet;
  visitedAt: number;
}


export interface RouteInfo {
  distanceKm: number;
  durationMinutes: number;
}


export interface OutletDiscount {
  id: string;
  title: string;
  description?: string;
  
  image?: string;
  discountPercentage?: number;
  validFrom?: string;
  validTo?: string;
}


export interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}


export interface FavoriteEntry {
  customer_favorite_id: number;
  outlet: Outlet;
  nickname?: string;
}


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
