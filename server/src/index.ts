import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { config } from './config';
import authRoutes from './routes/auth';
import offersRoutes from './routes/offers';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import path from 'path';

// Initialize express app
const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'https://www.renemoravec.sk'],
  credentials: true
}));

// Function to connect to MongoDB
async function connectDB() {
  try {
    // Check if using MongoDB Atlas (from env) or in-memory MongoDB
    if (process.env.MONGODB_URI) {
      console.log('Connecting to MongoDB Atlas...');
      await mongoose.connect(config.mongodbUri);
      console.log('Connected to MongoDB Atlas successfully!');
      console.log('Your data will be persisted even when the server stops.');
    } else {
      console.log('⚠️ No MongoDB URI provided, using in-memory MongoDB...');
      console.log('⚠️ WARNING: Data will be lost when the server stops!');
      console.log('⚠️ To persist data, set up MongoDB Atlas and configure .env file.');
      console.log('⚠️ Run "node setup-env.js" in the server directory to configure MongoDB.');
      
      // Create a MongoDB Memory Server for local development
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      
      console.log(`Using MongoDB Memory Server at: ${mongoUri}`);
      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB (in-memory)');
    }
  } catch (err) {
    console.error('MongoDB connection error:', err);
    console.error('Please check your MongoDB connection string and make sure your IP is whitelisted.');
    process.exit(1);
  }
}

// Check if .env file exists and show a warning if it doesn't
const checkEnvFile = () => {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.log('\n⚠️ No .env file found!');
    console.log('⚠️ To persist data, you need to configure MongoDB Atlas.');
    console.log('⚠️ Run "node setup-env.js" in the server directory to set up your configuration.\n');
  }
};

// Connect to database and start server
const startServer = async () => {
  checkEnvFile();
  await connectDB();

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/offers', offersRoutes);

  // Basic route
  app.get('/', (req, res) => {
    res.send('API is running');
  });

  // Debug route to test connectivity
  app.get('/api/test', (req, res) => {
    res.json({ 
      message: 'API test endpoint is working!',
      database: process.env.MONGODB_URI ? 'MongoDB Atlas (persistent)' : 'In-memory (temporary)'
    });
  });

  // Start server
  const PORT = parseInt(config.port.toString());
  console.log('Config:', config);
  console.log(`Attempting to start server on port ${PORT}...`);
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`Try accessing: http://localhost:${PORT}/api/test`);
  });
};

// Handle unexpected errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('Starting server initialization...');
startServer().catch(err => {
  console.error('Failed to start server:', err);
}); 