// Skript na vymazanie všetkých údajov z localStorage
// Spustite v konzole prehliadača na stránke aplikácie

// Vymazanie API URL
localStorage.removeItem('apiUrl');
console.log('API URL odstránená z localStorage');

// Vymazanie authToken
localStorage.removeItem('token');
console.log('Auth token odstránený z localStorage');

// Vymazanie ponúk
localStorage.setItem('offers', JSON.stringify([]));
console.log('Ponuky vymazané z localStorage');

console.log('Obnovte stránku (F5) a prihláste sa znova pre načítanie aktuálnych dát zo servera'); 