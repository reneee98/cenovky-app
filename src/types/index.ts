export interface BaseRow {
  id: string;
  type: 'item' | 'section' | 'subtotal';
  title: string;
  desc?: string;
}

export interface ItemRow extends BaseRow {
  type: 'item';
  qty: number;
  price: number;
  unit?: string;
}

export interface SectionRow extends BaseRow {
  type: 'section';
  qty?: never;
  price?: never;
}

export interface SubtotalRow extends BaseRow {
  type: 'subtotal';
  qty?: never;
  price?: never;
}

export type OfferRow = ItemRow | SectionRow | SubtotalRow;

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

export interface OfferItem {
  id: string;
  name: string;
  date: string;
  client: string;
  note: string;
  total: number;
  items: OfferRow[];
  vatEnabled: boolean;
  vatRate: number;
  tableNote: string;
  clientDetails: ClientDetails | null;
  discount?: number;
  showDetails?: boolean;
  isPublic?: boolean;
  logo?: string;
}

export interface CompanySettings {
  name: string;
  ico: string;
  email: string;
  phone: string;
  web: string;
  logo: string;
  defaultRate: number;
  currency: string;
  pdfNote: string;
} 