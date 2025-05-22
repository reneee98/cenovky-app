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
  logo?: string;
  clientDetails?: any; // Pridané pole pre fakturačné údaje klienta
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
  },
  logo: {
    type: String,
    default: ''
  },
  clientDetails: {
    type: Schema.Types.Mixed, // Umožní uložiť akýkoľvek JSON objekt
    default: null,
    required: false // Nechceme aby bolo povinné, ale ak je poskytnuté, chceme ho zachovať
  }
}, {
  timestamps: true,
  // Pridáme možnosť na zachovanie všetkých kľúčov aj ak nie sú definované v schéme
  minimize: false
});

// Zabezpečíme, že clientDetails sa správne uložia do MongoDB
offerSchema.pre('save', function(next) {
  // Kontrola existencie clientDetails a ich spracovanie
  if (this.clientDetails === undefined) {
    this.clientDetails = null;
  }
  console.log('Pre-save hook: clientDetails type:', typeof this.clientDetails);
  console.log('Pre-save hook: clientDetails value:', JSON.stringify(this.clientDetails));
  next();
});

// Upravíme toJSON a toObject metódy aby vždy zahrnuli clientDetails
offerSchema.set('toJSON', {
  transform: function(doc, ret) {
    if (!ret.clientDetails) {
      ret.clientDetails = null;
    }
    return ret;
  }
});

offerSchema.set('toObject', {
  transform: function(doc, ret) {
    if (!ret.clientDetails) {
      ret.clientDetails = null;
    }
    return ret;
  }
});

// Vytvorenie modelu
export const Offer = mongoose.model<IOffer>('Offer', offerSchema); 