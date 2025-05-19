import mongoose from 'mongoose';
import { User } from '../models/User';
import { config } from '../config';
import readline from 'readline';

// Vytvorenie rozhrania pre čítanie zo vstupu
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Funkcia na získanie vstupu od používateľa
function getInput(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function createUser() {
  try {
    console.log('Pripájam sa k MongoDB...');
    await mongoose.connect(config.mongodbUri);
    console.log('Pripojené k MongoDB');
    
    console.log('\n--- Vytvorenie nového používateľa ---');
    
    // Získanie údajov od používateľa
    const email = await getInput('Email: ');
    const name = await getInput('Meno: ');
    const password = await getInput('Heslo: ');
    
    // Kontrola, či používateľ už existuje
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      console.log(`\nChyba: Používateľ s emailom ${email} už existuje!`);
      return;
    }
    
    // Vytvorenie nového používateľa
    const newUser = new User({
      name,
      email,
      password
    });
    
    await newUser.save();
    
    console.log(`\nPoužívateľ ${email} bol úspešne vytvorený!`);
    console.log(`ID: ${newUser._id}`);
    
  } catch (error) {
    console.error('Chyba:', error);
  } finally {
    // Zatvorenie readline interface
    rl.close();
    
    // Ukončenie spojenia s MongoDB
    await mongoose.disconnect();
    console.log('Spojenie s databázou ukončené');
  }
}

// Spustenie skriptu
createUser(); 