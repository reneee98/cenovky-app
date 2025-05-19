/**
 * Setup Simple Local MongoDB Database
 * 
 * Tento skript vytvorí jednoduchú lokálnu MongoDB databázu v pamäti.
 */

const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Farby pre konzolu
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

console.log(`${colors.bright}${colors.cyan}=== Jednoduchá Lokálna MongoDB Databáza ===${colors.reset}`);
console.log('Tento skript vytvorí jednoduchú lokálnu MongoDB databázu v pamäti.');
console.log('');

async function setupSimpleMongoDB() {
  try {
    console.log(`${colors.cyan}Vytváram MongoDB server v pamäti...${colors.reset}`);
    
    // Vytvorenie MongoDB Memory Servera
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    console.log(`${colors.green}✅ MongoDB server vytvorený!${colors.reset}`);
    console.log(`URI: ${mongoUri}`);
    
    // Vytvorenie .env súboru
    const envPath = path.join(__dirname, '.env');
    const envContent = `# Jednoduchá Lokálna MongoDB (v pamäti)
MONGODB_URI=${mongoUri}

# Konfigurácia servera
PORT=5000
JWT_SECRET=local_development_secret_key
CLIENT_URL=http://localhost:5173
`;
    
    fs.writeFileSync(envPath, envContent);
    console.log(`${colors.green}✅ .env súbor vytvorený: ${envPath}${colors.reset}`);
    
    console.log(`\n${colors.green}✅ Lokálna MongoDB databáza je pripravená!${colors.reset}`);
    console.log(`${colors.cyan}Teraz môžete spustiť server príkazom:${colors.reset} npm run dev`);
    
    // Ponechanie servera bežiaceho pre použitie s aplikáciou
    console.log(`\n${colors.yellow}⚠️ MongoDB server beží na pozadí. Nechajte toto okno otvorené.${colors.reset}`);
    console.log(`${colors.yellow}⚠️ Pre ukončenie servera stlačte Ctrl+C.${colors.reset}`);
    console.log(`${colors.yellow}⚠️ Upozornenie: Táto databáza je v pamäti a dáta sa stratia po ukončení tohto skriptu.${colors.reset}`);
    
    // Ponechanie servera bežiaceho
    process.stdin.resume();
    
    // Zachytenie ukončenia procesu
    process.on('SIGINT', async () => {
      console.log(`\n${colors.cyan}Ukončujem MongoDB server...${colors.reset}`);
      await mongoServer.stop();
      console.log(`${colors.green}✅ MongoDB server ukončený.${colors.reset}`);
      process.exit(0);
    });
    
  } catch (error) {
    console.error(`${colors.red}❌ Chyba: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

setupSimpleMongoDB().catch(console.error); 