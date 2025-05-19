// Skript na vytvorenie testovacieho používateľa
import fetch from 'node-fetch';

const API_URLS = ['http://localhost:5000/api', 'http://localhost:3000/api'];

async function findWorkingApiUrl() {
  for (const url of API_URLS) {
    try {
      console.log(`Testujem API na: ${url}/test`);
      const response = await fetch(`${url}/test`);
      if (response.ok) {
        console.log(`✅ API je dostupné na: ${url}`);
        return url;
      }
    } catch (err) {
      console.log(`❌ API nie je dostupné na: ${url}`);
    }
  }
  return null;
}

async function createUser(baseUrl, email, password, name) {
  try {
    console.log(`Vytváram používateľa: ${email}`);
    const response = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        name
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Používateľ bol úspešne vytvorený!');
      console.log('Token:', data.token);
      console.log('Údaje:', data.user);
      return data;
    } else {
      console.log('❌ Chyba pri vytváraní používateľa:', data.message);
      
      if (data.message?.includes('existuje')) {
        console.log('🔍 Skúšam prihlásenie existujúceho používateľa...');
        return await loginUser(baseUrl, email, password);
      }
      
      return null;
    }
  } catch (error) {
    console.error('Chyba:', error);
    return null;
  }
}

async function loginUser(baseUrl, email, password) {
  try {
    console.log(`Prihlasujem používateľa: ${email}`);
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Prihlásenie úspešné!');
      console.log('Token:', data.token);
      console.log('Údaje:', data.user);
      return data;
    } else {
      console.log('❌ Chyba pri prihlásení:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Chyba:', error);
    return null;
  }
}

async function run() {
  try {
    // Hľadáme fungujúce API
    const apiUrl = await findWorkingApiUrl();
    if (!apiUrl) {
      console.error('❌ API nie je dostupné, spustite najprv server!');
      return;
    }

    // Vytvoríme/prihlásime používateľa
    // ⚠️ Pozor: Tu sú priamo zadané prihlasovacie údaje
    const email = 'design@renemoravec.sk';
    const password = 'raptor123';
    const name = 'René Moravec';
    
    await createUser(apiUrl, email, password, name);
  } catch (error) {
    console.error('Neočakávaná chyba:', error);
  }
}

run(); 