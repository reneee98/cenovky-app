import express, { Request, Response } from 'express';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { authMiddleware as auth } from '../middleware/auth';

// Extension for Express Request type
interface AuthRequest extends Request {
  user?: any;
}

const router = express.Router();

// Validation helper
const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

// Register a new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    
    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ message: 'Email a heslo sú povinné polia' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Neplatný email formát' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ message: 'Heslo musí mať aspoň 6 znakov' });
    }
    
    // Check if user already exists
    const userExists = await User.findOne({ email });
    
    if (userExists) {
      return res.status(400).json({ message: 'Používateľ s týmto e-mailom už existuje' });
    }
    
    // Create new user
    const user = new User({
      name,
      email,
      password
    });
    
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      config.jwtSecret,
      { expiresIn: '30d' }
    );
    
    // Return user info without password
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Chyba servera' });
  }
});

// Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ message: 'Email a heslo sú povinné polia' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Neplatný email formát' });
    }
    
    // Find user with password (normally excluded)
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ message: 'Nesprávny e-mail alebo heslo' });
    }
    
    // Compare passwords
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Nesprávny e-mail alebo heslo' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      config.jwtSecret,
      { expiresIn: '30d' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Chyba servera' });
  }
});

// Get user profile
router.get('/me', auth, async (req: AuthRequest, res: Response) => {
  try {
    // User is already attached to req by auth middleware
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'Používateľ nebol nájdený' });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Chyba servera' });
  }
});

export default router; 