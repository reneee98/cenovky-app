import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('design@renemoravec.sk');
  const [password, setPassword] = useState('raptor123');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [debug, setDebug] = useState(false);
  const navigate = useNavigate();
  
  const [apiStatus, setApiStatus] = useState<{isChecking: boolean, isAvailable: boolean, url?: string}>({
    isChecking: false,
    isAvailable: false
  });
  const { login, isLoading, error } = useAuth();

  // Check API availability
  useEffect(() => {
    const checkApiStatus = async () => {
      setApiStatus(prev => ({...prev, isChecking: true}));
      
      const apiUrls = [
        'http://localhost:5001/api',              // Local development API
        'https://www.renemoravec.sk/cenovky/api'  // Production API
      ];
      
      for (const url of apiUrls) {
        try {
          console.log(`Skúšam API na: ${url}/test`);
          const response = await fetch(`${url}/test`, { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            setApiStatus({
              isChecking: false,
              isAvailable: true,
              url
            });
            console.log(`API je dostupné na ${url}`);
            localStorage.setItem('apiUrl', url);
            return;
          }
        } catch (err) {
          console.log(`API test zlyhal pre ${url}: ${err}`);
        }
      }
      
      setApiStatus({
        isChecking: false,
        isAvailable: false
      });
    };
    
    checkApiStatus();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log("Pokus o prihlásenie s:", { email, password });
    setLoginAttempts(prev => prev + 1);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error("Chyba pri prihlásení:", err);
    }
  };

  const toggleDebug = () => {
    setDebug(!debug);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Prihlásenie</h1>
        
        {apiStatus.isChecking && (
          <div className="auth-info">Kontrolujem dostupnosť servera...</div>
        )}
        
        {!apiStatus.isChecking && !apiStatus.isAvailable && (
          <div className="auth-error">
            <strong>Server nie je dostupný!</strong>
            <p>Skontrolujte, či server beží pomocou príkazu:</p>
            <pre>cd server && npm run dev</pre>
          </div>
        )}
        
        {!apiStatus.isChecking && apiStatus.isAvailable && (
          <div className="auth-success">
            Server je dostupný na: {apiStatus.url}
          </div>
        )}
        
        {error && <div className="auth-error">{error}</div>}
        
        {loginAttempts > 0 && !error && isLoading === false && (
          <div className="auth-debug">
            <p>Prihlásenie pokus #{loginAttempts} nebol úspešný, ale bez chybovej hlášky.</p>
            <p>Skúste nasledovné:</p>
            <ol>
              <li>Overte, či je server spustený</li>
              <li>Skontrolujte v konzole prehliadača (F12) či nevidíte chyby</li>
              <li>Reštartujte prehliadač</li>
            </ol>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Heslo</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={isLoading || !apiStatus.isAvailable}
          >
            {isLoading ? 'Prihlasovanie...' : 'Prihlásiť sa'}
          </button>
        </form>
        
        <div className="auth-footer">
          Nemáte účet? <Link to="/register">Zaregistrujte sa</Link>
          <br/>
          <button onClick={toggleDebug} className="debug-button">
            {debug ? "Skryť debug" : "Zobraziť debug"}
          </button>
          
          {debug && (
            <div className="debug-panel">
              <h4>Debug informácie:</h4>
              <div><strong>API Status:</strong> {apiStatus.isChecking ? 'Kontrolujem' : apiStatus.isAvailable ? 'Dostupné' : 'Nedostupné'}</div>
              <div><strong>API URL:</strong> {apiStatus.url || 'žiadna'}</div>
              <div><strong>Login attempts:</strong> {loginAttempts}</div>
              <div><strong>Loading:</strong> {isLoading ? 'áno' : 'nie'}</div>
              <div><strong>Error:</strong> {error || 'žiadna'}</div>
              <div><strong>Email:</strong> {email}</div>
              <div><strong>Password:</strong> {'•'.repeat(password.length)}</div>
              <button 
                onClick={async () => {
                  try {
                    const apiUrl = apiStatus.url || localStorage.getItem('apiUrl') || 'http://localhost:5000/api';
                    const res = await fetch(`${apiUrl}/test`);
                    alert(`API test: ${res.ok ? 'OK' : 'Zlyhalo'}`);
                  } catch (e) {
                    alert(`API test exception: ${e}`);
                  }
                }}
                className="debug-test-btn"
              >
                Test API
              </button>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        .auth-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background-color: #f5f7fb;
          font-family: 'Noto Sans', sans-serif;
        }
        
        .auth-card {
          width: 100%;
          max-width: 450px;
          padding: 40px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.08);
        }
        
        h1 {
          color: #2346a0;
          margin-bottom: 24px;
          font-weight: 700;
          text-align: center;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          color: #444;
        }
        
        input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #dde6f3;
          border-radius: 8px;
          font-size: 16px;
          transition: border 0.2s;
        }
        
        input:focus {
          outline: none;
          border-color: #2346a0;
        }
        
        .auth-button {
          width: 100%;
          padding: 14px;
          background: #2346a0;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .auth-button:disabled {
          background: #95a5c6;
          cursor: not-allowed;
        }
        
        .auth-error {
          padding: 12px 16px;
          background: #fff2f2;
          border-left: 4px solid #ff4d4d;
          color: #d63031;
          margin-bottom: 20px;
          border-radius: 4px;
        }
        
        .auth-info {
          padding: 12px 16px;
          background: #f5f7fb;
          border-left: 4px solid #3498db;
          color: #2980b9;
          margin-bottom: 20px;
          border-radius: 4px;
        }
        
        .auth-success {
          padding: 12px 16px;
          background: #f0fff4;
          border-left: 4px solid #2ecc71;
          color: #27ae60;
          margin-bottom: 20px;
          border-radius: 4px;
        }
        
        .auth-footer {
          margin-top: 24px;
          text-align: center;
          color: #555;
        }
        
        a {
          color: #2346a0;
          text-decoration: none;
          font-weight: 500;
        }
        
        a:hover {
          text-decoration: underline;
        }
        
        pre {
          background: #f5f7fb;
          padding: 8px;
          border-radius: 4px;
          overflow: auto;
          font-family: monospace;
          margin: 8px 0;
        }
        
        .debug-button {
          margin-top: 12px;
          background: none;
          border: none;
          padding: 0;
          color: #888;
          font-size: 12px;
          cursor: pointer;
          text-decoration: underline;
        }
        
        .debug-panel {
          margin-top: 20px;
          padding: 12px;
          background: #f7f9fc;
          border-radius: 6px;
          text-align: left;
          font-size: 12px;
        }
        
        .debug-panel h4 {
          margin-top: 0;
          margin-bottom: 8px;
          font-size: 14px;
          color: #555;
        }
        
        .debug-panel div {
          margin-bottom: 6px;
        }
        
        .auth-debug {
          padding: 12px 16px;
          background: #fffbea;
          border-left: 4px solid #f1c40f;
          color: #9a7d0a;
          margin-bottom: 20px;
          border-radius: 4px;
          text-align: left;
        }
        
        .auth-debug ol {
          margin: 8px 0 0 20px;
          padding: 0;
        }
        
        .auth-debug li {
          margin-bottom: 4px;
        }
        
        .debug-test-btn {
          background: #eee;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 12px;
          cursor: pointer;
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
} 