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
    // Kontrola existencie používateľa
    if (!req.userId && !req.user?.id) {
      return res.status(401).json({ message: 'Neautorizovaný prístup - chýba ID používateľa' });
    }
    
    const userId = req.userId || req.user?.id;
    
    const { title, description, items, isPublic, totalPrice } = req.body;
    
    // Basic validation
    if (!title) {
      return res.status(400).json({ message: 'Názov ponuky je povinný' });
    }
    
    // Ensure items is an array
    const offerItems = Array.isArray(items) ? items : [];
    
    // Calculate total price if not provided
    let calculatedTotalPrice = totalPrice;
    if (calculatedTotalPrice == null && offerItems.length > 0) {
      calculatedTotalPrice = offerItems.reduce((sum: number, item: IOfferItem) => {
        return sum + (Number(item.price) || 0);
      }, 0);
    }
    
    // Ensure user ID is a valid MongoDB ObjectId
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(userId);
    } catch (err) {
      return res.status(400).json({ message: 'Neplatné ID používateľa' });
    }
    
    console.log(`Creating offer for user ID: ${userId}`);
    
    // Vytvorenie novej ponuky with userId field
    const newOffer = new Offer({
      title,
      description,
      items: offerItems,
      userId: userObjectId, // Using userId field instead of user
      isPublic: isPublic || false,
      totalPrice: calculatedTotalPrice || 0
    });
    
    // Uloženie ponuky do databázy
    const savedOffer = await newOffer.save();
    
    console.log(`Successfully created offer with ID: ${savedOffer._id} for user: ${userId}`);
    
    res.status(201).json(savedOffer);
  } catch (error: any) {
    console.error('Chyba pri vytváraní ponuky:', error);
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
    // Kontrola existencie používateľa
    if (!req.userId && !req.user?.id) {
      return res.status(401).json({ message: 'Neautorizovaný prístup - chýba ID používateľa' });
    }
    
    const userId = req.userId || req.user?.id;
    
    const { title, description, items, isPublic, totalPrice } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Názov ponuky je povinný' });
    }
    
    // Nájdeme ponuku podľa ID
    let offer = await Offer.findById(req.params.id);
    
    if (!offer) {
      return res.status(404).json({ message: 'Ponuka nebola nájdená' });
    }
    
    // Kontrola, či ponuka patrí aktuálnemu používateľovi
    if (offer.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Nemáte oprávnenie na úpravu tejto ponuky' });
    }
    
    // Ensure items is an array
    const offerItems = Array.isArray(items) ? items : [];
    
    // Calculate total price if not provided
    let calculatedTotalPrice = totalPrice;
    if (calculatedTotalPrice == null && offerItems.length > 0) {
      calculatedTotalPrice = offerItems.reduce((sum: number, item: IOfferItem) => {
        return sum + (Number(item.price) || 0);
      }, 0);
    }
    
    // Aktualizácia ponuky
    offer = await Offer.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        items: offerItems,
        isPublic: isPublic || false,
        totalPrice: calculatedTotalPrice || 0
      },
      { new: true }
    );
    
    res.json(offer);
  } catch (error: any) {
    console.error('Chyba pri aktualizácii ponuky:', error);
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