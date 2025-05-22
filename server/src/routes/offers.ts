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
    
    // Log clientDetails info for each offer
    offers.forEach((offer, idx) => {
      const offerObj = offer.toObject();
      console.log(`Offer ${idx + 1} (${offer._id}) details:`, {
        id: offer._id,
        title: offer.title,
        hasLogo: !!offer.logo,
        hasClientDetails: !!offer.clientDetails,
        dbFields: Object.keys(offerObj)
      });
      
      if (offer.clientDetails) {
        console.log(`Offer ${idx + 1} clientDetails:`, JSON.stringify(offer.clientDetails));
      } else {
        console.log(`Offer ${idx + 1} clientDetails is NULL or UNDEFINED!`);
      }
    });
    
    // TEST: Skontroluj obsah MongoDB dokumentu priamo z MongoDB
    if (offers.length > 0) {
      console.log("=== MONGODB DATA CHECK ===");
      const rawOffer = await Offer.collection.findOne({ _id: offers[0]._id } as any);
      console.log("MongoDB raw document fields:", Object.keys(rawOffer || {}));
      console.log("MongoDB has clientDetails field:", rawOffer && 'clientDetails' in rawOffer);
      if (rawOffer && 'clientDetails' in rawOffer) {
        console.log("MongoDB clientDetails value:", JSON.stringify(rawOffer.clientDetails));
      }
    }
    
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
      logo: req.body.logo ? `Logo included (${req.body.logo.length} chars)` : 'No logo',
      clientDetails: req.body.clientDetails ? 'INCLUDED' : 'NOT INCLUDED'
    });
    
    // Overíme clientDetails podrobnejšie
    if (req.body.clientDetails) {
      console.log('ClientDetails received for creation:', JSON.stringify(req.body.clientDetails));
      // Skontrolujeme, či maju všetky očakávané polia
      const fields = Object.keys(req.body.clientDetails);
      console.log('ClientDetails fields:', fields.join(', '));
    } else {
      console.warn('No clientDetails provided in request body for offer creation');
    }

    // Vytvorím objekt ponuky so všetkými potrebnými poliami
    const offerData = {
      ...req.body,
      userId,
      // Zabezpečíme, že clientDetails sú explicitne zahrnuté v dátach
      clientDetails: req.body.clientDetails || null
    };
    
    // Explicitne logujeme štruktúru pred uložením
    console.log('Data structure being saved to MongoDB:');
    console.log('- Has clientDetails:', !!offerData.clientDetails);
    
    if (offerData.clientDetails) {
      console.log('- ClientDetails:', JSON.stringify(offerData.clientDetails));
    }
    
    const offer = new Offer(offerData);
    const savedOffer = await offer.save();
    
    console.log(`Successfully created offer with ID: ${savedOffer._id} for user: ${userId}`);
    console.log('Saved offer includes clientDetails:', savedOffer.clientDetails ? 'YES' : 'NO');
    
    // Verify MongoDB directly saved clientDetails field by re-fetching the document
    const savedDocument = await Offer.findById(savedOffer._id);
    if (savedDocument) {
      console.log('Saved document clientDetails field:', 
                  savedDocument.clientDetails ? 'PRESENT' : 'MISSING');
      
      // Overíme, že hodnoty zodpovedajú odosielaným údajom
      if (savedDocument.clientDetails && offerData.clientDetails) {
        console.log('ClientDetails comparison:');
        console.log('- Original:', JSON.stringify(offerData.clientDetails));
        console.log('- Saved:', JSON.stringify(savedDocument.clientDetails));
        
        // Kontrola rovnakých kľúčov
        const originalKeys = Object.keys(offerData.clientDetails).sort();
        const savedKeys = Object.keys(savedDocument.clientDetails).sort();
        
        console.log('Data integrity check:',
                    JSON.stringify(originalKeys) === JSON.stringify(savedKeys) ? 'KEYS MATCH' : 'KEYS DIFFER');
      }
    }
    
    // Vrátime celý dokument s clientDetails
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
    console.log('Update includes clientDetails:', req.body.clientDetails ? 'YES' : 'NO');
    
    // Podrobnejšie logujeme clientDetails
    if (req.body.clientDetails) {
      console.log('ClientDetails for update:', JSON.stringify(req.body.clientDetails));
    } else {
      console.warn('No clientDetails in update request body');
    }
    
    // Najprv skontrolujeme existujúci záznam
    const existingOffer = await Offer.findOne({ _id: offerId, userId });
    if (!existingOffer) {
      return res.status(404).json({ message: 'Ponuka nebola nájdená' });
    }
    
    console.log('Found existing offer in DB with ID:', existingOffer._id);
    console.log('Existing clientDetails:', existingOffer.clientDetails ? 'PRESENT' : 'MISSING');
    
    // Vytvorím objekt pre aktualizáciu
    const updateData = {
      ...req.body,
    };

    // DÔLEŽITÉ: Zabezpečíme, že clientDetails sa nevynulujú ak nie sú v požiadavke
    if (!req.body.clientDetails && existingOffer.clientDetails) {
      console.log('Request does not include clientDetails but they exist in DB - preserving existing value');
      updateData.clientDetails = existingOffer.clientDetails;
    } else if (req.body.clientDetails) {
      console.log('Using clientDetails from request for update');
      updateData.clientDetails = req.body.clientDetails;
    }
    
    // Aktualizujeme ponuku s úplnou náhradou (new: true vráti aktualizovaný dokument)
    const updatedOffer = await Offer.findOneAndUpdate(
      { _id: offerId, userId },
      updateData,
      { new: true }
    );
    
    if (!updatedOffer) {
      console.log(`Offer ${offerId} not found or not owned by user ${userId}`);
      return res.status(404).json({ message: 'Ponuka nebola nájdená' });
    }
    
    console.log(`Successfully updated offer ${offerId}`);
    console.log('Updated offer has clientDetails:', updatedOffer.clientDetails ? 'YES' : 'NO');
    
    // Ďalšie overenie, že clientDetails boli uložené
    if (updatedOffer.clientDetails) {
      console.log('Updated clientDetails content:', JSON.stringify(updatedOffer.clientDetails));
    }
    
    res.status(200).json(updatedOffer);
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

/**
 * @route   GET /api/offers/test-mongodb
 * @desc    Test MongoDB pripojenia a manipulácie s clientDetails
 * @access  Private
 */
router.get('/test-mongodb', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized - missing user ID' });
    }
    
    console.log('=== MONGODB TEST - START ===');
    console.log(`Testing MongoDB for user ID: ${userId}`);
    
    // 1. Vytvoríme testovaciu ponuku s explicitnými clientDetails
    const testClientDetails = {
      companyName: "TEST MongoDB Company",
      street: "Test Street 123",
      city: "Test City",
      zip: "12345",
      country: "Test Country",
      ico: "12345678",
      dic: "2023456789",
      icDph: "SK2023456789",
      testField: "This is a test field",
      timestamp: new Date().toISOString()
    };
    
    console.log('Creating test offer with clientDetails:', JSON.stringify(testClientDetails));
    
    const testOffer = new Offer({
      title: `MongoDB Test ${new Date().toISOString()}`,
      description: "This is a test offer for MongoDB clientDetails testing",
      userId,
      items: [{
        name: "Test Item",
        price: 100,
        qty: 1
      }],
      totalPrice: 100,
      clientDetails: testClientDetails
    });
    
    // 2. Uložíme testovaciu ponuku
    const savedOffer = await testOffer.save();
    console.log('Test offer saved with ID:', savedOffer._id);
    console.log('Saved offer has clientDetails:', savedOffer.clientDetails ? 'YES' : 'NO');
    
    if (savedOffer.clientDetails) {
      console.log('Saved clientDetails fields:', Object.keys(savedOffer.clientDetails));
    }
    
    // 3. Načítame ponuku priamo z MongoDB a skontrolujeme či má clientDetails
    const fetchedOffer = await Offer.findById(savedOffer._id);
    
    if (!fetchedOffer) {
      throw new Error('Failed to retrieve the test offer from MongoDB');
    }
    
    console.log('Fetched offer from MongoDB - ID:', fetchedOffer._id);
    console.log('Fetched offer has clientDetails:', fetchedOffer.clientDetails ? 'YES' : 'NO');
    
    if (fetchedOffer.clientDetails) {
      console.log('Fetched clientDetails fields:', Object.keys(fetchedOffer.clientDetails));
      console.log('Fetched clientDetails content:', JSON.stringify(fetchedOffer.clientDetails));
      
      // Kontrola integrity dát
      const originalKeys = Object.keys(testClientDetails).sort();
      const fetchedKeys = Object.keys(fetchedOffer.clientDetails).sort();
      
      console.log('Data integrity check:');
      console.log('- Original keys:', originalKeys.join(', '));
      console.log('- Fetched keys:', fetchedKeys.join(', '));
      console.log('- Keys match:', JSON.stringify(originalKeys) === JSON.stringify(fetchedKeys));
    }
    
    // 4. Pokúsime sa aktualizovať clientDetails v ponuke
    const updatedClientDetails = {
      ...testClientDetails,
      updatedField: "This field was added in an update",
      timestamp: new Date().toISOString()
    };
    
    console.log('Updating test offer with new clientDetails');
    
    const updatedOffer = await Offer.findByIdAndUpdate(
      savedOffer._id,
      { 
        $set: { 
          clientDetails: updatedClientDetails
        } 
      },
      { new: true }
    );
    
    if (!updatedOffer) {
      throw new Error('Failed to update the test offer');
    }
    
    console.log('Updated offer has clientDetails:', updatedOffer.clientDetails ? 'YES' : 'NO');
    
    if (updatedOffer.clientDetails) {
      console.log('Updated clientDetails fields:', Object.keys(updatedOffer.clientDetails));
      console.log('Updated clientDetails content:', JSON.stringify(updatedOffer.clientDetails));
    }
    
    // 5. Finálne načítanie ponuky z MongoDB pre kontrolu
    const finalOffer = await Offer.findById(savedOffer._id);
    
    if (!finalOffer) {
      throw new Error('Failed to retrieve the final test offer');
    }
    
    console.log('Final offer check - has clientDetails:', finalOffer.clientDetails ? 'YES' : 'NO');
    
    if (finalOffer.clientDetails) {
      console.log('Final clientDetails fields:', Object.keys(finalOffer.clientDetails));
    }
    
    // 6. Overíme, či je pole clientDetails prítomné v surovom dokumente
    const rawDocument = await Offer.collection.findOne({ _id: savedOffer._id } as any);
    
    console.log('Raw document from MongoDB:');
    console.log('- Has clientDetails field:', rawDocument && 'clientDetails' in rawDocument);
    
    if (rawDocument && 'clientDetails' in rawDocument) {
      console.log('- Raw clientDetails type:', typeof rawDocument.clientDetails);
      console.log('- Raw clientDetails:', JSON.stringify(rawDocument.clientDetails));
    }
    
    console.log('=== MONGODB TEST - END ===');
    
    // Vrátime výsledok testu
    res.status(200).json({
      success: true,
      message: "MongoDB test completed successfully",
      testResults: {
        savedOffer: {
          id: savedOffer._id,
          hasClientDetails: !!savedOffer.clientDetails,
          clientDetailsKeys: savedOffer.clientDetails ? Object.keys(savedOffer.clientDetails) : []
        },
        updatedOffer: {
          hasClientDetails: !!updatedOffer.clientDetails,
          clientDetailsKeys: updatedOffer.clientDetails ? Object.keys(updatedOffer.clientDetails) : []
        },
        rawDocumentCheck: {
          hasClientDetailsField: rawDocument && 'clientDetails' in rawDocument,
          clientDetailsType: rawDocument && 'clientDetails' in rawDocument ? typeof rawDocument.clientDetails : null
        }
      }
    });
  } catch (error: any) {
    console.error('Error during MongoDB test:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.toString()
    });
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