import express, { Request, Response } from 'express';
import { Offer, IOfferItem } from '../models/Offer';
import { authMiddleware } from '../middleware/auth';
import mongoose from 'mongoose';

const router = express.Router();

// Len prihlásený používateľ môže pristupovať
router.use(authMiddleware);

/**
 * @route   GET /api/offers
 * @desc    Získať všetky ponuky používateľa
 * @access  Private
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized - missing user ID' });
    }
    
    console.log(`Fetching offers for user ID: ${userId}`);
    const offers = await Offer.find({ userId });
    console.log(`Found ${offers.length} offers for user ID ${userId}`);
    res.status(200).json(offers);
  } catch (error: any) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/offers/:id
 * @desc    Získať konkrétnu ponuku
 * @access  Private
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized - missing user ID' });
    }
    
    const offerId = req.params.id;
    const offer = await Offer.findOne({ _id: offerId, userId });
    
    if (!offer) {
      return res.status(404).json({ message: 'Ponuka nebola nájdená' });
    }
    
    console.log(`Retrieved offer ${offerId} with logo:`, offer.logo ? 'YES' : 'NO');
    res.status(200).json(offer);
  } catch (error: any) {
    console.error('Error fetching offer:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/offers
 * @desc    Vytvoriť novú ponuku
 * @access  Private
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized - missing user ID' });
    }
    
    console.log(`Creating offer for user ID: ${userId}`);
    console.log('Received offer data:', {
      title: req.body.title,
      itemsCount: req.body.items?.length || 0,
      logo: req.body.logo ? `Logo included (${req.body.logo.length} chars)` : 'No logo'
    });

    const offer = new Offer({
      ...req.body,
      userId
    });

    const savedOffer = await offer.save();
    console.log(`Successfully created offer with ID: ${savedOffer._id} for user: ${userId}`);
    console.log('Saved offer includes logo:', savedOffer.logo ? 'YES' : 'NO');
    
    res.status(201).json(savedOffer);
  } catch (error: any) {
    console.error('Error creating offer:', error);
    res.status(400).json({ message: error.message });
  }
});

/**
 * @route   PUT /api/offers/:id
 * @desc    Aktualizovať existujúcu ponuku
 * @access  Private
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized - missing user ID' });
    }
    
    const offerId = req.params.id;
    console.log(`Updating offer ${offerId} for user ${userId}`);
    console.log('Update includes logo:', req.body.logo ? 'YES' : 'NO');
    
    // Ensure we're not overriding the logo field if it exists
    const existingOffer = await Offer.findOne({ _id: offerId, userId });
    if (existingOffer && !req.body.logo && existingOffer.logo) {
      console.log('Logo field not in request but exists in DB. Preserving existing logo.');
      req.body.logo = existingOffer.logo;
    }
    
    const offer = await Offer.findOneAndUpdate(
      { _id: offerId, userId },
      { ...req.body },
      { new: true }
    );
    
    if (!offer) {
      console.log(`Offer ${offerId} not found or not owned by user ${userId}`);
      return res.status(404).json({ message: 'Ponuka nebola nájdená' });
    }
    
    console.log(`Successfully updated offer ${offerId}`);
    console.log('Updated offer has logo:', offer.logo ? 'YES' : 'NO');
    res.status(200).json(offer);
  } catch (error: any) {
    console.error('Error updating offer:', error);
    res.status(400).json({ message: error.message });
  }
});

/**
 * @route   DELETE /api/offers/:id
 * @desc    Vymazať ponuku
 * @access  Private
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized - missing user ID' });
    }
    
    const offerId = req.params.id;
    
    const offer = await Offer.findOneAndDelete({ _id: offerId, userId });
    
    if (!offer) {
      return res.status(404).json({ message: 'Ponuka nebola nájdená' });
    }
    
    res.status(200).json({ message: 'Ponuka bola úspešne vymazaná' });
  } catch (error: any) {
    console.error('Error deleting offer:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/offers/public/all
 * @desc    Získať všetky verejné ponuky
 * @access  Private
 */
router.get('/public/all', async (req: Request, res: Response) => {
  try {
    // Získame všetky verejné ponuky
    const offers = await Offer.find({ isPublic: true }).sort({ createdAt: -1 });
    res.json(offers);
  } catch (error: any) {
    console.error('Chyba pri získavaní verejných ponúk:', error);
    res.status(500).json({ message: 'Chyba servera', error: error.message });
  }
});

// Na koniec sboru pred export default router;
router.get('/test', async (req: any, res) => {
  try {
    console.log('Test endpoint called');
    console.log('MongoDB state:', mongoose.connection.readyState);
    
    const testOffer = new Offer({
      userId: new mongoose.Types.ObjectId('650000000000000000000000'),
      title: 'Test ' + Date.now(),
      items: [{ name: 'Test poloka', price: 10 }],
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