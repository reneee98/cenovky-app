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
      return data;
    } catch (error) {
      console.error('Chyba pri získavaní ponúk:', error);
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
          price: item.price || 0,
          description: item.desc,
          category: item.type
        })),
        isPublic: offer.isPublic || false
      };

      console.log(`Sending POST to ${apiUrl}/offers`);
      console.log('Request payload:', JSON.stringify(serverOffer));

      const response = await fetch(`${apiUrl}/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(serverOffer)
      });

      console.log('Server response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText || 'Unknown server error' };
        }
        
        throw new Error(errorData.message || `Server responded with status: ${response.status}`);
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

  // Aktualizácia ponuky
  async updateOffer(id: string, offer: OfferItem) {
    try {
      console.log(`Aktualizujem ponuku ${id} na server:`, offer);
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
          price: item.price || 0,
          description: item.desc,
          category: item.type
        })),
        isPublic: offer.isPublic || false
      };

      console.log(`Sending PUT to ${apiUrl}/offers/${id}`);
      console.log('Request payload:', JSON.stringify(serverOffer));
      
      const response = await fetch(`${apiUrl}/offers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(serverOffer)
      });

      console.log('Server response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText || 'Unknown server error' };
        }
        
        throw new Error(errorData.message || `Server responded with status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Server success response:', responseData);
      return responseData;
    } catch (error) {
      console.error(`Chyba pri aktualizácii ponuky ${id}:`, error);
      throw error;
    }
  },

  // Vymazanie ponuky
  async deleteOffer(id: string) {
    try {
      const response = await fetch(`${getApiUrl()}/offers/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Nepodarilo sa vymazať ponuku');
      }

      return true;
    } catch (error) {
      console.error(`Chyba pri vymazávaní ponuky ${id}:`, error);
      throw error;
    }
  }
}; 