interface BaseRow {
  id: string;
  type: 'item' | 'section' | 'subtotal';
  title: string;
  desc?: string;
}

interface ItemRow extends BaseRow {
  type: 'item';
  qty: number;
  price: number;
  unit?: string;
}

interface SectionRow extends BaseRow {
  type: 'section';
  qty?: never;
  price?: never;
}

interface SubtotalRow extends BaseRow {
  type: 'subtotal';
  qty?: never;
  price?: never;
}

export type OfferRow = ItemRow | SectionRow | SubtotalRow;

interface ClientDetails {
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
  discount: number;
  showDetails: boolean;
  clientDetails: ClientDetails | null;
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