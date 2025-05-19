import mongoose from 'mongoose';
import { User } from '../models/User';
import { config } from '../config';

async function listUsers() {
  try {
    console.log('Pripájam sa k MongoDB...');
    await mongoose.connect(config.mongodbUri);
    console.log('Pripojené k MongoDB');
    
    console.log('\nZoznam registrovaných používateľov:');
    console.log('----------------------------------');
    
    const users = await User.find().select('-password');
    
    if (users.length === 0) {
      console.log('Žiadni používatelia nie sú zaregistrovaní.');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user._id}`);
        console.log(`   Meno: ${user.name || 'neuvedené'}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Vytvorený: ${user.createdAt}`);
        console.log('----------------------------------');
      });
      
      console.log(`Celkový počet používateľov: ${users.length}`);
    }
    
  } catch (error) {
    console.error('Chyba:', error);
  } finally {
    // Ukončenie spojenia s MongoDB
    await mongoose.disconnect();
    console.log('Spojenie s databázou ukončené');
  }
}

// Spustenie skriptu
listUsers(); 