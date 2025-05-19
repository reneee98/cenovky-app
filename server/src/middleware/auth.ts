import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, IUser } from '../models/User';
import mongoose from 'mongoose';

// Rozšírenie Express Request typu
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name?: string;
      };
      userId?: string; // Adding userId as an additional property for backward compatibility
    }
  }
}

interface DecodedToken {
  id: string;
}

/**
 * Middleware pre overenie JWT tokenu a autentifikáciu používateľa
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Získanie tokenu z hlavičky
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Neautorizovaný prístup - chýba token' });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Neautorizovaný prístup - neplatný token' });
    }
    
    try {
      // Overenie tokenu
      const decoded = jwt.verify(token, config.jwtSecret) as DecodedToken;
      
      if (!decoded || !decoded.id) {
        return res.status(401).json({ message: 'Neplatný token - chýba ID používateľa' });
      }

      // Validate that ID is a valid MongoDB ObjectId
      let objectId: mongoose.Types.ObjectId;
      try {
        objectId = new mongoose.Types.ObjectId(decoded.id);
      } catch (err) {
        console.error('Invalid ObjectId format in token:', decoded.id);
        return res.status(401).json({ message: 'Neplatný token - nevalidné ID' });
      }
      
      // Nájdenie používateľa podľa ID
      const user = await User.findById(objectId).select('-password');
      
      if (!user) {
        console.error('User not found for ID:', decoded.id);
        return res.status(401).json({ message: 'Používateľ nebol nájdený' });
      }
      
      // Pridanie používateľa do request objektu
      req.user = {
        id: decoded.id,
        email: user.email as string,
        name: user.name as string | undefined
      };
      
      // Also set req.userId for backward compatibility
      req.userId = decoded.id;

      console.log(`Auth Middleware: User authenticated - ID: ${decoded.id}, Email: ${user.email}`);
      
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ message: 'Neplatný token' });
    }
  } catch (error) {
    console.error('Chyba v auth middleware:', error);
    return res.status(500).json({ message: 'Chyba servera' });
  }
}; 