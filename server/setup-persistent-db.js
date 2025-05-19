/**
 * Setup Persistent Local MongoDB Database
 * 
 * Tento skript vytvorí lokálnu MongoDB databázu pomocou mongodb-memory-server,
 * ktorá bude ukladať dáta do súboru, aby zostali zachované aj po reštarte.
 */

const fs = require('fs');
const path = require('path');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
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

// Adresár pre uloženie dát
const DB_PATH = path.join(__dirname, 'mongodb-data');

console.log(`${colors.bright}${colors.cyan}=== Perzistentná Lokálna MongoDB Databáza ===${colors.reset}`);
console.log('Tento skript vytvorí lokálnu MongoDB databázu s uložením dát na disk.');
console.log(`Dáta budú uložené v: ${DB_PATH}`);
console.log('');

async function setupPersistentMongoDB() {
  try {
    console.log(`${colors.cyan}Vytváram adresár pre dáta...${colors.reset}`);
    
    // Vytvorenie adresára pre dáta, ak neexistuje
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(DB_PATH, { recursive: true });
    }
    
    console.log(`${colors.cyan}Vytváram perzistentnú MongoDB databázu...${colors.reset}`);
    
    // Vytvorenie MongoDB Memory Server s perzistenciou
    const mongoReplSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
      instanceOpts: [
        {
          instance: {
            storageEngine: {
              wiredTiger: {
                configString: `wiredTigerCollectionBlockCompressor=snappy,cache_size=256M`
              }
            },
            dbPath: DB_PATH
          }
        }
      ]
    });
    
    const mongoUri = mongoReplSet.getUri();
    
    console.log(`${colors.green}✅ MongoDB server vytvorený!${colors.reset}`);
    console.log(`URI: ${mongoUri}`);
    
    // Vytvorenie .env súboru
    const envPath = path.join(__dirname, '.env');
    const envContent = `# Perzistentná Lokálna MongoDB
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
    
    // Uloženie URI do súboru pre ďalšie použitie
    const uriFilePath = path.join(__dirname, 'mongodb-uri.txt');
    fs.writeFileSync(uriFilePath, mongoUri);
    
    console.log(`\n${colors.green}✅ Perzistentná lokálna MongoDB databáza je pripravená!${colors.reset}`);
    console.log(`${colors.green}✅ Dáta budú uložené v: ${DB_PATH}${colors.reset}`);
    console.log(`${colors.cyan}Teraz môžete spustiť server príkazom:${colors.reset} npm run dev`);
    
    // Ponechanie servera bežiaceho pre použitie s aplikáciou
    console.log(`\n${colors.yellow}⚠️ MongoDB server beží na pozadí. Nechajte toto okno otvorené.${colors.reset}`);
    console.log(`${colors.yellow}⚠️ Pre ukončenie servera stlačte Ctrl+C.${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Chyba: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

setupPersistentMongoDB().catch(console.error); 