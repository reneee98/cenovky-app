/**
 * Simple script to create a .env file for development
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate a random JWT secret
const generateSecret = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Create .env file content
const content = `# MongoDB Configuration
# Uncomment and set this to use MongoDB Atlas instead of in-memory DB
# MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>

# Server Configuration
PORT=5001
JWT_SECRET=${generateSecret()}
CLIENT_URL=http://localhost:5175

# Development Settings
NODE_ENV=development
`;

// Write to .env file
const envPath = path.join(__dirname, '.env');

try {
  fs.writeFileSync(envPath, content);
  console.log('✅ .env file created successfully at:', envPath);
  console.log('ℹ️ To use MongoDB Atlas, edit the file and uncomment the MONGODB_URI line.');
} catch (error) {
  console.error('Error creating .env file:', error);
} 