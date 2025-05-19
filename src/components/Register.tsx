import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  
  const { register, isLoading, error } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setFormError('Heslá sa nezhodujú');
      return;
    }
    
    // Validate password length
    if (password.length < 6) {
      setFormError('Heslo musí mať aspoň 6 znakov');
      return;
    }
    
    await register(email, password, name);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Registrácia</h1>
        
        {(error || formError) && (
          <div className="auth-error">{formError || error}</div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Meno a priezvisko</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
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
              minLength={6}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Potvrdiť heslo</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? 'Registrácia...' : 'Zaregistrovať sa'}
          </button>
        </form>
        
        <div className="auth-footer">
          Už máte účet? <Link to="/login">Prihlásiť sa</Link>
        </div>
      </div>
    </div>
  );
} 