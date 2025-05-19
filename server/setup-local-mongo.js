/**
 * Setup Local MongoDB Database
 * 
 * Tento skript vytvorí lokálnu MongoDB databázu pomocou mongodb-memory-server,
 * ktorá bude fungovať aj bez nainštalovanej MongoDB.
 * 
 * Dáta budú uložené v pamäti, ale môžeme ich exportovať do súboru.
 */

const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

// Farby pre konzolu
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

console.log(`${colors.bright}${colors.cyan}=== Lokálna MongoDB Databáza ===${colors.reset}`);
console.log('Tento skript vytvorí lokálnu MongoDB databázu v pamäti.');
console.log('');

async function setupMemoryMongoDB() {
  try {
    console.log(`${colors.cyan}Vytváram MongoDB server v pamäti...${colors.reset}`);
    
    // Vytvorenie MongoDB Memory Servera
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    console.log(`${colors.green}✅ MongoDB server vytvorený!${colors.reset}`);
    console.log(`URI: ${mongoUri}`);
    
    // Vytvorenie .env súboru
    const envPath = path.join(__dirname, '.env');
    const envContent = `# Lokálna MongoDB (v pamäti)
MONGODB_URI=${mongoUri}

# Konfigurácia servera
PORT=5000
JWT_SECRET=local_development_secret_key
CLIENT_URL=http://localhost:5173
`;
    
    fs.writeFileSync(envPath, envContent);
    console.log(`${colors.green}✅ .env súbor vytvorený: ${envPath}${colors.reset}`);
    
    // Pripojenie k databáze a vytvorenie testovacieho používateľa
    console.log(`${colors.cyan}Pripájam sa k databáze...${colors.reset}`);
    const client = new MongoClient(mongoUri);
    await client.connect();
    
    const db = client.db('cenovky');
    
    // Vytvorenie testovacieho používateľa
    const usersCollection = db.collection('users');
    
    // Kontrola, či používateľ už existuje
    const existingUser = await usersCollection.findOne({ email: 'test@example.com' });
    
    if (!existingUser) {
      await usersCollection.insertOne({
        name: 'Test User',
        email: 'test@example.com',
        password: '$2a$10$XgNEHQJgXCM.ZZt1EYIyZ.qZEMjRDy1Bw5RmRoz5KQF3JWgvUVhCW', // heslo: password123
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`${colors.green}✅ Testovací používateľ vytvorený${colors.reset}`);
      console.log('   Email: test@example.com');
      console.log('   Heslo: password123');
    } else {
      console.log(`${colors.yellow}⚠️ Testovací používateľ už existuje${colors.reset}`);
    }
    
    // Zatvorenie pripojenia
    await client.close();
    
    console.log(`\n${colors.green}✅ Lokálna MongoDB databáza je pripravená!${colors.reset}`);
    console.log(`${colors.cyan}Teraz môžete spustiť server príkazom:${colors.reset} npm run dev`);
    console.log(`\n${colors.yellow}⚠️ Upozornenie: Táto databáza je v pamäti a dáta sa stratia po reštarte servera.${colors.reset}`);
    console.log(`${colors.yellow}⚠️ Pre trvalé uloženie dát by ste mali použiť skutočnú MongoDB databázu.${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Chyba: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

setupMemoryMongoDB().catch(console.error); 