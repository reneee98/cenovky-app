import type { OfferItem } from '../types';

// Získanie API URL z localStorage alebo použitie defaultnej hodnoty
const getApiUrl = () => {
  const storedUrl = localStorage.getItem('apiUrl');
  
  // Prioritne použitie uloženej URL, potom lokálnej development URL
  const url = storedUrl || 'http://localhost:5001/api';
  
  console.log('Using API URL:', url);
  // Kontrola či máme validnú URL
  if (!url.startsWith('http')) {
    console.error('Invalid API URL format, resetting to default');
    localStorage.setItem('apiUrl', 'http://localhost:5001/api');
    return 'http://localhost:5001/api';
  }
  
  return url;
};

// Funkcia pre získanie JWT tokenu
const getAuthToken = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('No auth token found in localStorage');
  } else {
    console.log('Auth token found: Using token for API requests');
    // Validate token format - should be a non-empty string
    if (typeof token !== 'string' || token.trim().length === 0) {
      console.error('Invalid token format, removing token');
      localStorage.removeItem('token');
      return null;
    }
  }
  return token;
};

// API služba pre prácu s používateľským profilom
export const userService = {
  // Aktualizácia loga používateľa
  async updateLogo(logoData: string) {
    try {
      const apiUrl = getApiUrl();
      const token = getAuthToken();
      
      if (!token) {
        throw new Error('Nie ste prihlásený.');
      }
      
      console.log('Sending logo to server, size:', logoData ? `${logoData.length} chars` : 'no logo');
      
      const response = await fetch(`${apiUrl}/auth/update-logo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ logo: logoData })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Logo update error:', errorText);
        throw new Error(errorText || `Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Logo updated successfully, got response:', data);
      return data;
    } catch (error) {
      console.error('Error updating logo:', error);
      throw error;
    }
  },
  
  // Získanie profilu používateľa
  async getProfile() {
    try {
      const apiUrl = getApiUrl();
      const token = getAuthToken();
      
      if (!token) {
        throw new Error('Nie ste prihlásený.');
      }
      
      const response = await fetch(`${apiUrl}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Nepodarilo sa načítať profil používateľa');
      }
      
      const data = await response.json();
      console.log('Profile data loaded:', data);
      return data;
    } catch (error) {
      console.error('Profile error:', error);
      throw error;
    }
  }
};

// Služba pre prácu s ponukami
export const offersService = {
  // Získanie všetkých ponúk používateľa
  async getOffers() {
    const apiUrl = getApiUrl();
    const token = getAuthToken();
    
    if (!token) {
      console.error('Attempted to get offers without auth token');
      throw new Error('Nie ste prihlásený. Prihláste sa pre načítanie ponúk.');
    }
    
    try {
      console.log('Načítavam ponuky z:', apiUrl);
      const response = await fetch(`${apiUrl}/offers`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('Response status for getOffers:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from getOffers:', errorText);
        throw new Error('Nepodarilo sa načítať ponuky: ' + 
          (response.status === 401 ? 'Chyba autorizácie' : response.status));
      }

      const data = await response.json();
      console.log('Successfully loaded offers:', data.length);
      
      // Log raw client details from the server data immediately 
      console.log("=== RAW SERVER DATA CHECK ===");
      if (data.length > 0) {
        console.log("Raw server data has client details field:", 'clientDetails' in data[0]);
        console.log("Raw data first offer fields:", Object.keys(data[0]).join(', '));
        
        if ('clientDetails' in data[0] && data[0].clientDetails) {
          console.log("Raw clientDetails from server:", JSON.stringify(data[0].clientDetails));
        } else {
          console.log("clientDetails is missing or null in server response - THIS IS THE ISSUE");
          
          // Debugging: Log server response for the first item
          console.log("First item from server (full):", JSON.stringify(data[0]));
        }
      }
      
      // Transform server data to client format with proper number conversion
      const transformedData = data.map((offer: any) => {
        // Ensure we have a valid total
        let offerTotal = 0;
        if (typeof offer.total === 'number') {
          offerTotal = offer.total;
        } else if (typeof offer.total === 'string' && offer.total.trim() !== '') {
          offerTotal = parseFloat(offer.total);
        } else if (typeof offer.totalPrice === 'number') {
          offerTotal = offer.totalPrice;
        } else if (typeof offer.totalPrice === 'string' && offer.totalPrice.trim() !== '') {
          offerTotal = parseFloat(offer.totalPrice);
        }
        
        // Process items with careful price handling
        const processedItems = Array.isArray(offer.items) ? offer.items.map((item: any) => {
          // Handle price conversion
          let numPrice = 0;
          if (typeof item.price === 'number') {
            numPrice = item.price;
          } else if (typeof item.price === 'string' && item.price.trim() !== '') {
            numPrice = parseFloat(item.price);
          }
          
          // Handle quantity conversion
          let numQty = 1;
          if (typeof item.qty === 'number') {
            numQty = item.qty;
          } else if (typeof item.qty === 'string' && item.qty.trim() !== '') {
            numQty = parseFloat(item.qty);
          }
          
          return {
            id: item._id || Math.random().toString(36).substr(2, 9),
            type: item.category || 'item',
            title: item.name || '',
            desc: item.description || '',
            qty: numQty,
            price: numPrice
          };
        }) : [];
        
        // Calculate the total from items if needed
        if (offerTotal === 0 && processedItems.length > 0) {
          offerTotal = processedItems
            .filter((item: any) => item.type === 'item')
            .reduce((sum: number, item: any) => sum + (item.qty * item.price), 0);
        }
        
        // KRITICKÁ ČASŤ: Zabezpečíme, že clientDetails sa správne prenášajú z API
        // Potrebujeme sa ubezpečiť, že clientDetails sa nestratia ani nezjednodušia
        const clientDetailsObj = offer.clientDetails || null;
        console.log(`Processing offer ${offer.title || offer.name}, clientDetails:`, 
                   clientDetailsObj ? JSON.stringify(clientDetailsObj) : 'NULL');
        
        return {
          id: offer._id || offer.id,
          _id: offer._id || offer.id,
          name: offer.title || offer.name,
          date: offer.createdAt || new Date().toISOString(),
          client: '',
          note: offer.description || '',
          total: offerTotal,
          items: processedItems,
          vatEnabled: offer.vatEnabled ?? false,
          vatRate: typeof offer.vatRate === 'number' ? offer.vatRate : typeof offer.vatRate === 'string' ? parseFloat(offer.vatRate) : 20,
          tableNote: offer.tableNote || '',
          discount: typeof offer.discount === 'number' ? offer.discount : typeof offer.discount === 'string' ? parseFloat(offer.discount) : 0,
          showDetails: offer.showDetails ?? true,
          isPublic: offer.isPublic || false,
          logo: offer.logo || '',
          // Dôležité: Zakaždým explicitne skontrolujme clientDetails a uistíme sa, že je správne prenesený
          clientDetails: clientDetailsObj,
          localId: offer.localId || offer._id || offer.id
        };
      });
      
      // Posledná kontrola, že clientDetails sa nachádzajú v transformovaných dátach
      if (transformedData.length > 0) {
        console.log('First transformed offer clientDetails check:', 
                  transformedData[0].clientDetails ? 'PRESENT' : 'MISSING');
        
        if (transformedData[0].clientDetails) {
          console.log('Transformed clientDetails content:', 
                     JSON.stringify(transformedData[0].clientDetails));
        }
      }
      
      return transformedData;
    } catch (error) {
      console.error('Chyba pri získavaní ponúk:', error);
      throw error;
    }
  },

  // Test pripojenia MongoDB a ukladania clientDetails
  async testMongoDBConnection() {
    const apiUrl = getApiUrl();
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Nie ste prihlásený. Potrebujete sa prihlásiť na vykonanie testu.');
    }
    
    try {
      console.log('Testing MongoDB connection at:', apiUrl);
      const response = await fetch(`${apiUrl}/offers/test-mongodb`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from MongoDB test:', errorText);
        throw new Error('Test MongoDB zlyhalo: ' + errorText);
      }
      
      const data = await response.json();
      console.log('MongoDB test results:', data);
      return data;
    } catch (error) {
      console.error('Chyba pri teste MongoDB:', error);
      throw error;
    }
  },

  // Získanie všetkých verejných ponúk od všetkých používateľov
  // Zakomentované, pretože server nemá implementovaný endpoint /offers/public
  /*
  async getPublicOffers() {
    const apiUrl = getApiUrl();
    const token = getAuthToken();
    
    if (!token) {
      console.error('Attempted to get public offers without auth token');
      throw new Error('Nie ste prihlásený. Prihláste sa pre načítanie verejných ponúk.');
    }
    
    try {
      console.log('Načítavam verejné ponuky z:', apiUrl);
      const response = await fetch(`${apiUrl}/offers/public`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('Response status for getPublicOffers:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from getPublicOffers:', errorText);
        throw new Error('Nepodarilo sa načítať verejné ponuky: ' + 
          (response.status === 401 ? 'Chyba autorizácie' : response.status));
      }

      const data = await response.json();
      console.log('Successfully loaded public offers:', data.length);
      return data;
    } catch (error) {
      console.error('Chyba pri získavaní verejných ponúk:', error);
      throw error;
    }
  },
  */

  // Vytvorenie novej ponuky
  async createOffer(offer: OfferItem) {
    try {
      console.log('Odosielam ponuku na server:', offer);
      console.log('Logo v ponuke:', typeof offer.logo, offer.logo ? offer.logo.substring(0, 50) + '...' : 'žiadne');
      console.log('ClientDetails v ponuke:', offer.clientDetails ? 'Present' : 'Not present');
      if (offer.clientDetails) {
        console.log('ClientDetails content to send:', JSON.stringify(offer.clientDetails));
      }
      
      const apiUrl = getApiUrl();
      const token = getAuthToken();
      
      if (!token) {
        throw new Error('Chýba autorizačný token. Prosím, prihláste sa.');
      }
      
      // Transformácia klientskej ponuky na formát pre server
      const serverOffer = {
        title: offer.name,
        description: offer.note,
        items: offer.items.map(item => ({
          name: item.title,
          price: Number(item.price) || 0,
          qty: Number(item.qty) || 1,
          description: item.desc || '',
          category: item.type || 'item'
        })),
        isPublic: offer.isPublic || false,
        discount: Number(offer.discount) || 0,
        vatEnabled: offer.vatEnabled ?? false,
        vatRate: Number(offer.vatRate) || 20,
        tableNote: offer.tableNote || '',
        showDetails: offer.showDetails ?? true,
        total: Number(offer.total) || 0,
        totalPrice: offer.items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 1), 0),
        logo: offer.logo || '',
        clientDetails: offer.clientDetails // Explicitne zahrnieme clientDetails
      };

      console.log('Sending offer to server, logo included:', serverOffer.logo ? 'YES' : 'NO', 
                 serverOffer.logo ? `(${serverOffer.logo.length} chars)` : '');
      console.log('Sending offer to server, clientDetails included:', serverOffer.clientDetails ? 'YES' : 'NO');

      // Check price values before sending
      if (serverOffer.items && serverOffer.items.length > 0) {
        console.log('Client item prices before sending:', serverOffer.items.map(item => ({
          name: item.name,
          price: item.price,
          priceType: typeof item.price
        })));
      }

      const response = await fetch(`${apiUrl}/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(serverOffer)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(errorText || `Server responded with status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Server success response:', responseData);
      return responseData;
    } catch (error) {
      console.error('Chyba pri vytváraní ponuky:', error);
      throw error;
    }
  },

  // Získanie konkrétnej ponuky
  async getOffer(id: string) {
    try {
      const response = await fetch(`${getApiUrl()}/offers/${id}`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Nepodarilo sa načítať ponuku');
      }

      return await response.json();
    } catch (error) {
      console.error(`Chyba pri získavaní ponuky ${id}:`, error);
      throw error;
    }
  },

  // Vymazanie ponuky
  async deleteOffer(id: string) {
    const apiUrl = getApiUrl();
    const token = getAuthToken();
    if (!token) throw new Error('Nie ste prihlásený.');
    const response = await fetch(`${apiUrl}/offers/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Nepodarilo sa vymazať ponuku');
    }
    return true;
  },

  // Aktualizácia existujúcej ponuky
  async updateOffer(id: string, offer: OfferItem) {
    try {
      const apiUrl = getApiUrl();
      const token = getAuthToken();
      if (!token) throw new Error('Nie ste prihlásený.');

      console.log('Updating offer on server, logo status:', typeof offer.logo, offer.logo ? 'Present' : 'Not present');
      console.log('Updating offer on server, clientDetails:', offer.clientDetails ? 'Present' : 'Not present');
      if (offer.clientDetails) {
        console.log('ClientDetails content to send:', JSON.stringify(offer.clientDetails));
      }
      
      // Transformácia klientskej ponuky na formát pre server
      const serverOffer = {
        title: offer.name,
        description: offer.note,
        items: offer.items.map(item => ({
          name: item.title,
          price: Number(item.price) || 0,
          qty: Number(item.qty) || 1,
          description: item.desc || '',
          category: item.type || 'item'
        })),
        isPublic: offer.isPublic || false,
        discount: Number(offer.discount) || 0,
        vatEnabled: offer.vatEnabled ?? false,
        vatRate: Number(offer.vatRate) || 20,
        tableNote: offer.tableNote || '',
        showDetails: offer.showDetails ?? true,
        total: Number(offer.total) || 0,
        totalPrice: offer.items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 1), 0),
        logo: offer.logo || '',
        clientDetails: offer.clientDetails // Explicitne zahrnieme clientDetails
      };

      console.log('Updating offer with logo included:', serverOffer.logo ? 'YES' : 'NO', 
                 serverOffer.logo ? `(${serverOffer.logo.length} chars)` : '');
      console.log('Updating offer with clientDetails included:', serverOffer.clientDetails ? 'YES' : 'NO');

      const response = await fetch(`${apiUrl}/offers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(serverOffer)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(errorText || `Server responded with status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Server success response:', responseData);
      return responseData;
    } catch (error) {
      console.error('Chyba pri aktualizácii ponuky:', error);
      throw error;
    }
  }
};