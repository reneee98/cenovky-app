/**
 * MongoDB Atlas Setup Script
 * This script helps you set up your MongoDB Atlas connection
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { MongoClient } = require('mongodb');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Path to .env file
const envPath = path.join(__dirname, '.env');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

console.log(`${colors.bright}${colors.cyan}=== MongoDB Atlas Setup ===${colors.reset}`);
console.log('This script will help you set up your MongoDB Atlas connection.');
console.log('');
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

// Example connection string
console.log(`${colors.cyan}Example MongoDB Atlas connection string:${colors.reset}`);
console.log('mongodb+srv://username:password@cluster.mongodb.net/cenovky');
console.log('');

// Ask for MongoDB Atlas connection string
rl.question(`Enter your MongoDB Atlas connection string: `, (mongoUri) => {
  if (!mongoUri) {
    console.log(`${colors.red}❌ No connection string provided. Exiting.${colors.reset}`);
    rl.close();
    return;
  }

  if (!mongoUri.startsWith('mongodb+srv://') && !mongoUri.startsWith('mongodb://')) {
    console.log(`${colors.yellow}⚠️ Warning: Your connection string doesn't start with mongodb+srv:// or mongodb://`);
    console.log(`${colors.yellow}⚠️ This may not be a valid MongoDB connection string.${colors.reset}`);
    console.log('');
  }

  rl.question('Enter the port for your server (default: 5000): ', (port) => {
    port = port || '5000';
    
    const defaultJwtSecret = generateJwtSecret();
    rl.question('Enter your JWT secret (or press enter for a random one): ', (jwtSecret) => {
      jwtSecret = jwtSecret || defaultJwtSecret;
      
      rl.question('Enter your client URL (default: http://localhost:5173): ', (clientUrl) => {
        clientUrl = clientUrl || 'http://localhost:5173';
        
        // Create .env content
        const envContent = `# MongoDB Atlas Connection
MONGODB_URI=${mongoUri}

# Server Configuration
PORT=${port}
JWT_SECRET=${jwtSecret}
CLIENT_URL=${clientUrl}
`;

        // Write to .env file
        fs.writeFileSync(envPath, envContent);
        
        console.log(`\n${colors.green}✅ .env file created successfully!${colors.reset}`);
        console.log(`Location: ${envPath}`);
        
        console.log(`\n${colors.green}✅ Your MongoDB Atlas connection is now configured.${colors.reset}`);
        console.log(`${colors.green}✅ Your data will be stored in the cloud MongoDB Atlas database.${colors.reset}`);
        
        // Test the connection
        console.log(`\n${colors.cyan}Testing connection to MongoDB Atlas...${colors.reset}`);
        
        const client = new MongoClient(mongoUri, { 
          useNewUrlParser: true, 
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 5000
        });
        
        client.connect()
          .then(() => {
            console.log(`${colors.green}✅ Successfully connected to MongoDB Atlas!${colors.reset}`);
            console.log(`${colors.green}✅ Your database is ready to use.${colors.reset}`);
            
            // Extract database name from connection string
            let dbName = 'cenovky';
            try {
              if (mongoUri.includes('?')) {
                const uriParts = mongoUri.split('?')[0].split('/');
                dbName = uriParts[uriParts.length - 1] || 'cenovky';
              } else {
                const uriParts = mongoUri.split('/');
                dbName = uriParts[uriParts.length - 1] || 'cenovky';
              }
            } catch (e) {
              // Use default name if parsing fails
            }
            
            console.log(`${colors.cyan}Database name: ${dbName}${colors.reset}`);
            
            console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
            console.log(`1. Start your server with: ${colors.bright}npm run dev${colors.reset}`);
            console.log(`2. Your data will be stored in MongoDB Atlas cloud database`);
            
            client.close();
            rl.close();
          })
          .catch((err) => {
            console.log(`${colors.red}❌ Could not connect to MongoDB Atlas.${colors.reset}`);
            console.log(`${colors.red}❌ Error: ${err.message}${colors.reset}`);
            console.log(`${colors.yellow}Please check:${colors.reset}`);
            console.log('1. Your connection string is correct');
            console.log('2. Your IP address is whitelisted in MongoDB Atlas Network Access');
            console.log('3. Your username and password are correct');
            console.log('4. Your network connection is working');
            rl.close();
          });
      });
    });
  });
}); 