/**
 * Setup MongoDB Atlas Online Database
 * 
 * Tento skript vám pomôže správne nastaviť MongoDB Atlas online databázu.
 */

const fs = require('fs');
const path = require('path');
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

console.log(`${colors.bright}${colors.cyan}=== MongoDB Atlas Online Databáza ===${colors.reset}`);
console.log('Tento skript vám pomôže správne nastaviť MongoDB Atlas online databázu.');
console.log('');

// MongoDB Atlas connection string
const mongoUri = 'mongodb+srv://renkomoravec:raptor123@cluster0.mveli.mongodb.net/cenovky?retryWrites=true&w=majority';

// Vytvorenie .env súboru
const envPath = path.join(__dirname, '.env');
const envContent = `# MongoDB Atlas Online
MONGODB_URI=${mongoUri}

# Konfigurácia servera
PORT=5000
JWT_SECRET=online_production_secret_key
CLIENT_URL=http://localhost:5173
`;

// Uloženie .env súboru
fs.writeFileSync(envPath, envContent);
console.log(`${colors.green}✅ .env súbor vytvorený: ${envPath}${colors.reset}`);

// Testovanie pripojenia k MongoDB Atlas
console.log(`${colors.cyan}Testujem pripojenie k MongoDB Atlas...${colors.reset}`);

async function testConnection() {
  try {
    const client = new MongoClient(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    
    await client.connect();
    console.log(`${colors.green}✅ Pripojenie k MongoDB Atlas úspešné!${colors.reset}`);
    
    const db = client.db('cenovky');
    console.log(`${colors.green}✅ Databáza 'cenovky' je dostupná.${colors.reset}`);
    
    // Vypíšeme zoznam kolekcií
    const collections = await db.listCollections().toArray();
    console.log(`${colors.cyan}Dostupné kolekcie:${colors.reset}`);
    if (collections.length === 0) {
      console.log('   Žiadne kolekcie zatiaľ neexistujú.');
    } else {
      collections.forEach(collection => {
        console.log(`   - ${collection.name}`);
      });
    }
    
    // Vytvoríme testovacieho používateľa, ak ešte neexistuje
    const usersCollection = db.collection('users');
    const existingUser = await usersCollection.findOne({ email: 'admin@example.com' });
    
    if (!existingUser) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      await usersCollection.insertOne({
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`${colors.green}✅ Vytvorený admin používateľ:${colors.reset}`);
      console.log('   Email: admin@example.com');
      console.log('   Heslo: admin123');
    } else {
      console.log(`${colors.yellow}⚠️ Admin používateľ už existuje.${colors.reset}`);
    }
    
    await client.close();
    
    console.log(`\n${colors.green}✅ MongoDB Atlas je správne nakonfigurovaná!${colors.reset}`);
    console.log(`${colors.cyan}Teraz môžete spustiť server príkazom:${colors.reset} npm run dev`);
    console.log(`${colors.cyan}Vaše dáta budú uložené online v MongoDB Atlas.${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Chyba pri pripojení k MongoDB Atlas: ${error.message}${colors.reset}`);
    console.error(`${colors.yellow}Skontrolujte:${colors.reset}`);
    console.error('1. Či je connection string správny');
    console.error('2. Či je vaša IP adresa povolená v MongoDB Atlas (Network Access)');
    console.error('3. Či sú prihlasovacie údaje správne');
    
    console.log(`\n${colors.yellow}Skúsim opraviť connection string...${colors.reset}`);
    
    // Alternatívny connection string bez databázového názvu
    const alternativeUri = 'mongodb+srv://renkomoravec:raptor123@cluster0.mveli.mongodb.net/?retryWrites=true&w=majority';
    
    try {
      console.log(`${colors.cyan}Skúšam alternatívny connection string...${colors.reset}`);
      const altClient = new MongoClient(alternativeUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
      });
      
      await altClient.connect();
      console.log(`${colors.green}✅ Pripojenie s alternatívnym connection string úspešné!${colors.reset}`);
      
      // Aktualizujeme .env súbor
      const newEnvContent = `# MongoDB Atlas Online
MONGODB_URI=${alternativeUri}

# Konfigurácia servera
PORT=5000
JWT_SECRET=online_production_secret_key
CLIENT_URL=http://localhost:5173
`;
      fs.writeFileSync(envPath, newEnvContent);
      console.log(`${colors.green}✅ .env súbor aktualizovaný s alternatívnym connection string.${colors.reset}`);
      
      await altClient.close();
      
    } catch (altError) {
      console.error(`${colors.red}❌ Aj alternatívny connection string zlyhal: ${altError.message}${colors.reset}`);
      console.error(`${colors.red}❌ Prosím, vytvorte nového používateľa v MongoDB Atlas a skúste znova.${colors.reset}`);
    }
  }
}

testConnection().catch(console.error); 