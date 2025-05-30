export interface ClientDetails {
  name: string;
  company?: string;
  ico: string;
  dic?: string;
  icDph?: string;
  address: string;
  city: string;
  zip: string;
  country: string;
}

export interface ItemRow {
  id: string;
  type: 'item';
  title: string;
  desc?: string;
  qty: number;
  price: number;
  unit?: string;
}

export interface SectionRow {
  id: string;
  type: 'section';
  title: string;
  desc?: string;
  qty?: number;
  price?: number;
}

export interface SubtotalRow {
  id: string;
  type: 'subtotal';
  title: string;
  desc?: string;
  qty?: number;
  price?: number;
}

export type OfferRow = ItemRow | SectionRow | SubtotalRow;

export interface CompanySettings {
  name: string;
  ico: string;
  dic?: string;
  icDph?: string;
  address?: string;
  zip?: string;
  city?: string;
  country?: string;
  email: string;
  phone: string;
  web: string;
  logo: string;
  defaultRate: number;
  currency: string;
  pdfNote: string;
}

export interface OfferItem {
  id: string;
  _id?: string;
  localId: string;
  name: string;
  date: string;
  client: string;
  clientDetails: ClientDetails | null;
  note: string;
  total: number;
  items: OfferRow[];
  vatEnabled: boolean;
  vatRate: number;
  tableNote: string;
  showDetails: boolean;
  discount: number;
  isPublic: boolean;
  additionalInfo?: string;
  logo?: string;
  isShared?: boolean;
}

// Auth related types
export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ... rest of the existing types ... 