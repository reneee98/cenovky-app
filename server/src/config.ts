import dotenv from 'dotenv';

// Load .env file into process.env
dotenv.config();

// Návrat k in-memory MongoDB pre účely vývoja
// Používateľ musí zadať vlastný MongoDB Atlas connection string cez .env súbor
const DEFAULT_MONGO_URI = 'mongodb://localhost:27017/cenovky';

// export configs with default values if env variables are not set
export const config = {
  port: process.env.PORT || 5001,
  mongodbUri: process.env.MONGODB_URI || DEFAULT_MONGO_URI,
  jwtSecret: process.env.JWT_SECRET || 'very_secret_key_change_this_in_production',
  // Akceptovanie pripojení z rôznych portov (5173, 5174, 5175, 5176, 5177)
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5175'
}; 