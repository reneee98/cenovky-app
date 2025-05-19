/**
 * MongoDB Setup Script
 * This script helps you set up your MongoDB connection
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Path to .env file
const envPath = path.join(__dirname, '.env');

console.log('=== MongoDB Connection Setup ===');
console.log('This script will help you set up your MongoDB connection.');
console.log('You need a MongoDB Atlas account to get a connection string.');
console.log('Visit https://www.mongodb.com/cloud/atlas to create a free account if you don\'t have one.');
console.log('');

// Function to generate a random JWT secret
const generateJwtSecret = () => {
  try {
    return require('crypto').randomBytes(64).toString('hex').slice(0, 32);
  } catch (error) {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }
};

rl.question('Enter your MongoDB connection string (mongodb+srv://...): ', (mongoUri) => {
  if (!mongoUri) {
    console.log('⚠️ No MongoDB connection string provided. Using in-memory database (data will be lost on server restart).');
    mongoUri = 'mongodb://localhost:27017/cenovky';
  }

  rl.question('Enter the port for your server (default: 5000): ', (port) => {
    port = port || '5000';
    
    const defaultJwtSecret = generateJwtSecret();
    rl.question('Enter your JWT secret (or press enter for a random one): ', (jwtSecret) => {
      jwtSecret = jwtSecret || defaultJwtSecret;
      
      rl.question('Enter your client URL (default: https://www.renemoravec.sk/cenovky): ', (clientUrl) => {
        clientUrl = clientUrl || 'https://www.renemoravec.sk/cenovky';
        
        // Create .env content
        const envContent = `# MongoDB Connection
MONGODB_URI=${mongoUri}

# Server Configuration
PORT=${port}
JWT_SECRET=${jwtSecret}
CLIENT_URL=${clientUrl}
`;

        // Write to .env file
        fs.writeFileSync(envPath, envContent);
        
        console.log('\n.env file created successfully!');
        console.log(`Location: ${envPath}`);
        
        if (mongoUri.includes('mongodb+srv://') || mongoUri.includes('mongodb://')) {
          console.log('\n✅ Your MongoDB connection is now configured.');
          if (mongoUri.includes('mongodb+srv://')) {
            console.log('✅ Using MongoDB Atlas - your data will persist even when the server is stopped.');
          } else {
            console.log('⚠️ Using local MongoDB - make sure MongoDB is running locally.');
          }
        } else {
          console.log('\n⚠️ Warning: Your MongoDB connection string may be invalid.');
          console.log('It should start with "mongodb+srv://" for MongoDB Atlas or "mongodb://" for local MongoDB.');
        }
        
        console.log('\nTo start the server, run:');
        console.log('cd server');
        console.log('npm start');
        
        rl.close();
      });
    });
  });
}); 