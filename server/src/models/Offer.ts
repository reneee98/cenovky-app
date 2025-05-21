import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

// Rozhranie pre položku ponuky
export interface IOfferItem {
  name: string;
  price: number;
  description?: string;
  image?: string;
  category?: string;
  order?: number;
  qty?: number; // množstvo
}

// Rozhranie pre ponuku
export interface IOffer extends Document {
  title: string;
  description?: string;
  items: IOfferItem[];
  totalPrice: number;
  userId: mongoose.Types.ObjectId | IUser;
  isPublic: boolean;
  discount?: number;
  vatEnabled?: boolean;
  vatRate?: number;
  tableNote?: string;
  showDetails?: boolean;
  total?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Schéma pre položku ponuky
const offerItemSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Názov položky je povinný'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Cena je povinná'],
    min: [0, 'Cena nemôže byť záporná']
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    type: String
  },
  category: {
    type: String,
    trim: true
  },
  order: {
    type: Number,
    default: 0
  },
  qty: {
    type: Number,
    default: 1
  }
});

// Schéma pre ponuku
const offerSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Názov ponuky je povinný'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  items: [offerItemSchema],
  totalPrice: {
    type: Number,
    default: 0,
    min: [0, 'Celková cena nemôže byť záporná']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Používateľ je povinný']
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  discount: {
    type: Number,
    default: 0
  },
  vatEnabled: {
    type: Boolean,
    default: false
  },
  vatRate: {
    type: Number,
    default: 20
  },
  tableNote: {
    type: String,
    default: ''
  },
  showDetails: {
    type: Boolean,
    default: true
  },
  total: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Vytvorenie modelu
export const Offer = mongoose.model<IOffer>('Offer', offerSchema); 