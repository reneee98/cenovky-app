import express, { Request } from 'express';
import { Offer, IOfferItem } from '../models/Offer';
import { authMiddleware } from '../middleware/auth';
import mongoose from 'mongoose';

// Rozšírenie Express Request typu
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  userId?: string; // For compatibility with updated middleware
}

const router = express.Router();

// Middleware pre autentifikáciu - všetky routes budú vyžadovať prihlásenie
router.use(authMiddleware);

/**
 * @route   GET /api/offers
 * @desc    Získať všetky ponuky používateľa
 * @access  Private
 */
router.get('/', async (req: AuthRequest, res) => {
  try {
    // Kontrola existencie používateľa
    if (!req.userId && !req.user?.id) {
      return res.status(401).json({ message: 'Neautorizovaný prístup - chýba ID používateľa' });
    }
    
    // Use userId from either source (prefer direct userId from middleware)
    const userId = req.userId || req.user?.id;
    
    console.log(`Fetching offers for user ID: ${userId}`);
    
    // Získame ponuky aktuálneho používateľa - using userId field
    const offers = await Offer.find({ userId }).sort({ createdAt: -1 });
    
    console.log(`Found ${offers.length} offers for user ID ${userId}`);
    
    res.json(offers);
  } catch (error: any) {
    console.error('Chyba pri získavaní ponúk:', error);
    res.status(500).json({ message: 'Chyba servera', error: error.message });
  }
});

/**
 * @route   GET /api/offers/:id
 * @desc    Získať konkrétnu ponuku
 * @access  Private
 */
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    // Kontrola existencie používateľa
    if (!req.userId && !req.user?.id) {
      return res.status(401).json({ message: 'Neautorizovaný prístup - chýba ID používateľa' });
    }
    
    const userId = req.userId || req.user?.id;
    
    const offer = await Offer.findById(req.params.id);
    
    if (!offer) {
      return res.status(404).json({ message: 'Ponuka nebola nájdená' });
    }
    
    // Kontrola, či ponuka patrí aktuálnemu používateľovi alebo je verejná
    if (offer.userId.toString() !== userId && !offer.isPublic) {
      return res.status(403).json({ message: 'Nemáte oprávnenie na zobrazenie tejto ponuky' });
    }
    
    res.json(offer);
  } catch (error: any) {
    console.error('Chyba pri získavaní ponuky:', error);
    res.status(500).json({ message: 'Chyba servera', error: error.message });
  }
});

/**
 * @route   POST /api/offers
 * @desc    Vytvoriť novú ponuku
 * @access  Private
 */
router.post('/', async (req: AuthRequest, res) => {
  try {
    if (!req.userId && !req.user?.id) {
      return res.status(401).json({ message: 'Neautorizovaný prístup - chýba ID používateľa' });
    }
    const userId = req.userId || req.user?.id;
    const { title, description, items, isPublic, totalPrice, discount, vatEnabled, vatRate, tableNote, showDetails, total } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Názov ponuky je povinný' });
    }
    const offerItems = Array.isArray(items) ? items.map(item => ({
      name: item.name || item.title,
      price: item.price || 0,
      qty: item.qty ?? 1,
      description: item.description || item.desc || '',
      category: item.category || item.type || '',
      image: item.image || '',
      order: item.order ?? 0
    })) : [];
    let calculatedTotalPrice = totalPrice;
    if (calculatedTotalPrice == null && offerItems.length > 0) {
      calculatedTotalPrice = offerItems.reduce((sum, item) => sum + (Number(item.price) * (item.qty ?? 1)), 0);
    }
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(userId);
    } catch (err) {
      return res.status(400).json({ message: 'Neplatné ID používateľa' });
    }
    const newOffer = new Offer({
      title,
      description,
      items: offerItems,
      userId: userObjectId,
      isPublic: isPublic || false,
      totalPrice: calculatedTotalPrice || 0,
      discount: discount || 0,
      vatEnabled: vatEnabled ?? false,
      vatRate: vatRate ?? 20,
      tableNote: tableNote || '',
      showDetails: showDetails ?? true,
      total: total || 0
    });
    const savedOffer = await newOffer.save();
    res.status(201).json(savedOffer);
  } catch (error: any) {
    res.status(500).json({ message: 'Chyba servera', error: error.message });
  }
});

/**
 * @route   PUT /api/offers/:id
 * @desc    Aktualizovať existujúcu ponuku
 * @access  Private
 */
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    if (!req.userId && !req.user?.id) {
      return res.status(401).json({ message: 'Neautorizovaný prístup - chýba ID používateľa' });
    }
    const userId = req.userId || req.user?.id;
    const { title, description, items, isPublic, totalPrice, discount, vatEnabled, vatRate, tableNote, showDetails, total } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Názov ponuky je povinný' });
    }
    let offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: 'Ponuka nebola nájdená' });
    }
    if (offer.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Nemáte oprávnenie na úpravu tejto ponuky' });
    }
    const offerItems = Array.isArray(items) ? items.map(item => ({
      name: item.name || item.title,
      price: item.price || 0,
      qty: item.qty ?? 1,
      description: item.description || item.desc || '',
      category: item.category || item.type || '',
      image: item.image || '',
      order: item.order ?? 0
    })) : [];
    let calculatedTotalPrice = totalPrice;
    if (calculatedTotalPrice == null && offerItems.length > 0) {
      calculatedTotalPrice = offerItems.reduce((sum, item) => sum + (Number(item.price) * (item.qty ?? 1)), 0);
    }
    offer = await Offer.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        items: offerItems,
        isPublic: isPublic || false,
        totalPrice: calculatedTotalPrice || 0,
        discount: discount || 0,
        vatEnabled: vatEnabled ?? false,
        vatRate: vatRate ?? 20,
        tableNote: tableNote || '',
        showDetails: showDetails ?? true,
        total: total || 0
      },
      { new: true }
    );
    res.json(offer);
  } catch (error: any) {
    res.status(500).json({ message: 'Chyba servera', error: error.message });
  }
});

/**
 * @route   DELETE /api/offers/:id
 * @desc    Vymazať ponuku
 * @access  Private
 */
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    // Kontrola existencie používateľa
    if (!req.userId && !req.user?.id) {
      return res.status(401).json({ message: 'Neautorizovaný prístup - chýba ID používateľa' });
    }
    
    const userId = req.userId || req.user?.id;
    
    // Nájdeme ponuku podľa ID
    const offer = await Offer.findById(req.params.id);
    
    if (!offer) {
      return res.status(404).json({ message: 'Ponuka nebola nájdená' });
    }
    
    // Kontrola, či ponuka patrí aktuálnemu používateľovi
    if (offer.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Nemáte oprávnenie na vymazanie tejto ponuky' });
    }
    
    // Vymazanie ponuky
    await offer.deleteOne();
    
    res.json({ message: 'Ponuka bola úspešne vymazaná' });
  } catch (error: any) {
    console.error('Chyba pri vymazávaní ponuky:', error);
    res.status(500).json({ message: 'Chyba servera', error: error.message });
  }
});

/**
 * @route   GET /api/offers/public/all
 * @desc    Získať všetky verejné ponuky
 * @access  Private
 */
router.get('/public/all', async (req: AuthRequest, res) => {
  try {
    // Získame všetky verejné ponuky
    const offers = await Offer.find({ isPublic: true }).sort({ createdAt: -1 });
    res.json(offers);
  } catch (error: any) {
    console.error('Chyba pri získavaní verejných ponúk:', error);
    res.status(500).json({ message: 'Chyba servera', error: error.message });
  }
});
// Na koniec s�boru pred export default router;
router.get('/test', async (req: any, res) => {
  try {
    console.log('Test endpoint called');
    console.log('MongoDB state:', mongoose.connection.readyState);
    
    const testOffer = new Offer({
      userId: new mongoose.Types.ObjectId('650000000000000000000000'),
      title: 'Test ' + Date.now(),
      items: [{ name: 'Test polo�ka', price: 10 }],
      totalPrice: 10
    });
    
    const result = await testOffer.save();
    console.log('Test offer saved:', result._id);
    
    res.json({ success: true, id: result._id });
  } catch (error: any) {
    console.error('Test failed:', error);
    res.status(500).json({ error: error.message });
  }
});
export default router; 