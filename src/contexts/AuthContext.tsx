import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

// API base URLs to try
const API_URLS = [
  'http://localhost:5001/api',              // Local development API on port 5001 - prioritizovaná
  'https://www.renemoravec.sk/cenovky/api'  // Production API - záložná možnosť
];

let ACTIVE_API_URL = localStorage.getItem('apiUrl') || API_URLS[0];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  const clearError = () => setError(null);

  // Try to find a working API URL
  const findWorkingApiUrl = async (): Promise<string | null> => {
    for (const url of API_URLS) {
      try {
        console.log(`Testujem API pripojenie na: ${url}/test`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`${url}/test`, { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log(`✅ API nájdené na: ${url}`);
          localStorage.setItem('apiUrl', url);
          ACTIVE_API_URL = url;
          return url;
        }
      } catch (err) {
        console.log(`❌ API na ${url} nie je dostupné:`, err);
      }
    }
    return null;
  };

  // Load user from token on startup
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) return;

      try {
        setIsLoading(true);
        
        // Make sure we have a working API URL
        const apiUrl = await findWorkingApiUrl();
        
        if (!apiUrl) {
          console.error('Žiadne dostupné API URL');
          localStorage.removeItem('token');
          setToken(null);
          setCurrentUser(null);
          setError('Server nie je dostupný. Skontrolujte pripojenie alebo reštartujte server.');
          return;
        }
        
        console.log(`Načítavam užívateľské údaje z: ${ACTIVE_API_URL}/auth/me s tokenom`);
        
        const response = await fetch(`${ACTIVE_API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          console.error('Odpoveď nie je OK:', response.status, response.statusText);
          localStorage.removeItem('token');
          setToken(null);
          setCurrentUser(null);
          return;
        }

        const userData = await response.json();
        console.log('Užívateľské údaje získané:', userData);
        setCurrentUser(userData);
      } catch (err) {
        console.error('Chyba pri načítavaní údajov o užívateľovi:', err);
        localStorage.removeItem('token');
        setToken(null);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Make sure we have a working API URL
      const apiUrl = await findWorkingApiUrl();
      
      if (!apiUrl) {
        throw new Error('Server nie je dostupný. Skontrolujte pripojenie alebo reštartujte server.');
      }
      
      console.log(`Pokus o prihlásenie na: ${ACTIVE_API_URL}/auth/login`);
      console.log('Údaje pre prihlásenie:', { email });
      
      // Vytvoríme controller pre timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${ACTIVE_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('Odpoveď servera - Status:', response.status, response.statusText);

      // Prva zkúsime spracovať odpoveď ako text
      const rawResponseText = await response.text();
      console.log('Raw response text:', rawResponseText);
      
      // Potom skúsime text parsovať ako JSON
      let data;
      try {
        data = JSON.parse(rawResponseText);
      } catch (jsonErr) {
        console.error('Nepodarilo sa parsovať odpoveď servera ako JSON:', jsonErr);
        throw new Error('Neplatná odpoveď zo servera');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Prihlásenie zlyhalo. Skontrolujte svoje prihlasovacie údaje.');
      }

      console.log('Prihlásenie úspešné, token prijatý:', data.token ? 'áno' : 'nie');
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
    } catch (err) {
      console.error('Chyba pri prihlásení:', err);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Požiadavka na prihlásenie vypršala - server neodpovedá včas.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Nastala neznáma chyba pri prihlásení.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Make sure we have a working API URL
      const apiUrl = await findWorkingApiUrl();
      
      if (!apiUrl) {
        throw new Error('Server nie je dostupný. Skontrolujte pripojenie alebo reštartujte server.');
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${ACTIVE_API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, name }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registrácia zlyhala. Skúste to znova neskôr.');
      }

      localStorage.setItem('token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
    } catch (err) {
      console.error('Chyba pri registrácii:', err);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Požiadavka na registráciu vypršala - server neodpovedá včas.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Nastala neznáma chyba pri registrácii.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    login,
    register,
    logout,
    isLoading,
    error,
    clearError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} 