// Jednoduchý skript na testovanie API endpointov
import fetch from 'node-fetch';

try {
  // Skúsime obe porty, na ktorých by mohol server bežať
  const API_URLS = [
    'http://localhost:5000/api', 
    'http://localhost:3000/api'
  ];

  console.log(`Testovanie API na adresách: ${API_URLS.join(', ')}`);
  console.log('Debug: Štart testovania...');

  // Funkcia na otestovanie dostupnosti servera
  async function checkServerAvailability() {
    for (const baseUrl of API_URLS) {
      try {
        console.log(`Skúšam server na: ${baseUrl}/test`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(`${baseUrl}/test`, { signal: controller.signal });
        clearTimeout(timeout);
        
        if (response.ok) {
          console.log(`✅ Server je dostupný na: ${baseUrl}`);
          return baseUrl;
        }
      } catch (error) {
        console.log(`❌ Server nie je dostupný na: ${baseUrl} - ${error.message}`);
      }
    }
    return null;
  }

  async function testLogin(apiUrl) {
    try {
      console.log('\n🔒 TEST PRIHLÁSENIA');
      console.log('Posielam požiadavku na:', `${apiUrl}/auth/login`);
      console.log('Údaje pre prihlásenie:', { 
        email: 'test@example.com', 
        password: 'password123' 
      });
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      
      // Log full response headers
      const headers = {};
      response.headers.forEach((value, name) => {
        headers[name] = value;
      });
      console.log('Response Headers:', headers);
      
      const responseText = await response.text();
      console.log('Raw Response Text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed Response:', data);
      } catch (parseError) {
        console.error('Chyba pri parsovaní JSON:', parseError);
      }
      
      if (response.ok) {
        console.log('✅ Prihlásenie úspešné!');
        return data.token;
      } else {
        console.error('❌ Prihlásenie zlyhalo.');
        return null;
      }
    } catch (error) {
      console.error('Chyba pri prihlásení:', error.message || error.toString());
      console.error('Stack:', error.stack);
      if (error.code) {
        console.error('Error code:', error.code);
      }
      if (error.code === 'ECONNREFUSED') {
        console.error('Server nie je dostupný na adrese: ' + apiUrl);
      }
      return null;
    }
  }

  // Funkcia na testovanie registrácie (pre vytvorenie používateľa)
  async function testRegister(apiUrl) {
    try {
      console.log('\n📝 TEST REGISTRÁCIE');
      console.log('Posielam požiadavku na:', `${apiUrl}/auth/register`);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      console.log('Registrované údaje:', { 
        name: 'Test User', 
        email: 'test@example.com', 
        password: 'password123' 
      });
      
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      
      const responseText = await response.text();
      console.log('Raw Response Text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed Response:', data);
      } catch (parseError) {
        console.error('Chyba pri parsovaní JSON:', parseError);
      }
      
      if (response.ok) {
        console.log('✅ Registrácia úspešná!');
        return data.token;
      } else {
        console.error('❌ Registrácia zlyhala.');
        return null;
      }
    } catch (error) {
      console.error('Chyba pri registrácii:', error.message || error.toString());
      console.error('Stack:', error.stack);
      if (error.code) {
        console.error('Error code:', error.code);
      }
      return null;
    }
  }

  // Spustiť testy
  async function runTests() {
    try {
      console.log('Debug: Začínam testy...');
      
      // Najprv zistíme, na ktorom porte je server dostupný
      const apiUrl = await checkServerAvailability();
      
      if (!apiUrl) {
        console.error('❌ Server nie je dostupný na žiadnej z adries:', API_URLS.join(', '));
        console.error('Skontrolujte, či server beží a je správne nakonfigurovaný.');
        return;
      }

      // Skúsime najprv login
      console.log('\n🔍 Skúšam prihlásenie...');
      let token = await testLogin(apiUrl);
      
      // Ak login zlyhá, skúsime registráciu a potom znovu login
      if (!token) {
        console.log('\n🔍 Login zlyhal, skúšam registráciu a potom login znovu...');
        await testRegister(apiUrl);
        token = await testLogin(apiUrl);
      }
      
      if (token) {
        console.log('\n✅ Úspešne prihlásený s tokenom:', token);
      } else {
        console.error('\n❌ Nepodarilo sa prihlásiť ani po registrácii.');
      }
      
      console.log('Debug: Testy dokončené');
    } catch (error) {
      console.error('Chyba pri testovaní API:', error);
    }
  }

  console.log('Debug: Spúšťanie testov...');
  // Manually wait for runTests to complete
  runTests().then(() => {
    console.log('Všetky testy dokončené');
  }).catch((error) => {
    console.error('Hlavná chyba:', error);
  });

} catch (error) {
  console.error('Globálna chyba v skripte:', error);
}