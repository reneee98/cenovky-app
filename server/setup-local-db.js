/**
 * Local MongoDB Setup Script
 * This script helps you set up your local MongoDB connection
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');

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

console.log(`${colors.bright}${colors.cyan}=== Local MongoDB Setup ===${colors.reset}`);
console.log('This script will help you set up your local MongoDB connection.');
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

// Check if MongoDB is installed
console.log(`${colors.cyan}Checking if MongoDB is installed...${colors.reset}`);

exec('mongod --version', (error) => {
  if (error) {
    console.log(`${colors.yellow}⚠️ MongoDB is not installed or not in PATH.${colors.reset}`);
    console.log(`${colors.yellow}We will continue with setup, but you'll need to install MongoDB later.${colors.reset}`);
    console.log(`${colors.yellow}Download MongoDB Community Edition from:${colors.reset}`);
    console.log('https://www.mongodb.com/try/download/community');
    console.log('');
  } else {
    console.log(`${colors.green}✅ MongoDB is installed.${colors.reset}`);
  }
  
  setupLocalMongoDB();
});

function setupLocalMongoDB() {
  // Default MongoDB connection string for local development
  const defaultMongoUri = 'mongodb://localhost:27017/cenovky';
  
  console.log(`${colors.cyan}Setting up local MongoDB connection...${colors.reset}`);
  console.log(`Default connection string: ${defaultMongoUri}`);
  
  rl.question(`Enter your MongoDB connection string (default: ${defaultMongoUri}): `, (mongoUri) => {
    mongoUri = mongoUri || defaultMongoUri;

    rl.question('Enter the port for your server (default: 5000): ', (port) => {
      port = port || '5000';
      
      const defaultJwtSecret = generateJwtSecret();
      rl.question('Enter your JWT secret (or press enter for a random one): ', (jwtSecret) => {
        jwtSecret = jwtSecret || defaultJwtSecret;
        
        rl.question('Enter your client URL (default: http://localhost:5173): ', (clientUrl) => {
          clientUrl = clientUrl || 'http://localhost:5173';
          
          // Create .env content
          const envContent = `# MongoDB Connection (Local)
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
          
          console.log(`\n${colors.green}✅ Your local MongoDB connection is now configured.${colors.reset}`);
          console.log(`${colors.green}✅ Your data will be stored in the local MongoDB database.${colors.reset}`);
          
          console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
          console.log(`1. Install MongoDB Community Edition if not already installed`);
          console.log(`2. Make sure MongoDB service is running`);
          console.log(`3. Start your server with: ${colors.bright}npm run dev${colors.reset}`);
          console.log(`4. Your data will be stored in: ${colors.bright}${mongoUri}${colors.reset}`);
          
          // Try to check if MongoDB is running
          try {
            // Try to connect to MongoDB
            const { MongoClient } = require('mongodb');
            const client = new MongoClient(mongoUri, { 
              useNewUrlParser: true, 
              useUnifiedTopology: true,
              serverSelectionTimeoutMS: 2000
            });
            
            console.log(`\n${colors.cyan}Checking if MongoDB service is running...${colors.reset}`);
            
            client.connect()
              .then(() => {
                console.log(`${colors.green}✅ Successfully connected to MongoDB!${colors.reset}`);
                console.log(`${colors.green}✅ MongoDB service is running.${colors.reset}`);
                client.close();
                rl.close();
              })
              .catch(() => {
                console.log(`${colors.red}❌ Could not connect to MongoDB.${colors.reset}`);
                console.log(`${colors.yellow}Please make sure MongoDB service is running:${colors.reset}`);
                console.log('1. Open Services (services.msc)');
                console.log('2. Find "MongoDB Server" and make sure it is running');
                console.log('3. If not, start the service');
                rl.close();
              });
          } catch (err) {
            console.log(`${colors.red}❌ Could not check MongoDB connection.${colors.reset}`);
            console.log(`${colors.yellow}Please install MongoDB and make sure it's running.${colors.reset}`);
            rl.close();
          }
        });
      });
    });
  });
} 