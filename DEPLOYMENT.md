# Návod na nasadenie aplikácie Cenovky

Tento návod vás prevedie procesom nasadenia aplikácie Cenovky na produkčný server.

## Obsah

1. [Príprava](#príprava)
2. [Nasadenie frontendu](#nasadenie-frontendu)
3. [Nasadenie backendu](#nasadenie-backendu)
4. [Konfigurácia MongoDB Atlas](#konfigurácia-mongodb-atlas)
5. [Testovanie](#testovanie)
6. [Riešenie problémov](#riešenie-problémov)

## Príprava

### Požiadavky
- Webhosting s podporou Node.js alebo možnosťou spustenia Node.js aplikácie
- Prístup k FTP alebo SSH
- MongoDB Atlas účet (bezplatná verzia je dostačujúca)

### Lokálna príprava
1. Stiahnite aktuálnu verziu projektu
2. Nainštalujte závislosti:
   ```
   npm install
   ```
3. Vytvorte produkčný build frontendu:
   ```
   npm run build
   ```

## Nasadenie frontendu

1. Nahrajte obsah adresára `dist` na váš webhosting do adresára `/cenovky/`
2. Uistite sa, že ste nahrali aj súbor `.htaccess` z adresára `dist`

## Nasadenie backendu

### Možnosť 1: Automatický deployment
1. Prejdite do adresára `server`:
   ```
   cd server
   ```
2. Spustite deployment skript:
   ```
   node deploy.js
   ```
3. Nahrajte obsah vytvoreného adresára `server/deploy` na váš webhosting do adresára `/cenovky/api/`

### Možnosť 2: Manuálny deployment
1. Prejdite do adresára `server`:
   ```
   cd server
   ```
2. Nainštalujte závislosti:
   ```
   npm install
   ```
3. Vytvorte produkčný build:
   ```
   npm run build
   ```
4. Nahrajte nasledujúce súbory na váš webhosting do adresára `/cenovky/api/`:
   - Celý adresár `dist`
   - `package.json`
   - `package-lock.json`
   - `.env` (vytvorený pomocou `setup-db.js`)
   - `.htaccess` z adresára `server/deploy`

5. Na serveri nainštalujte produkčné závislosti:
   ```
   npm install --production
   ```

## Konfigurácia MongoDB Atlas

1. Vytvorte si účet na [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Vytvorte nový cluster (môžete použiť bezplatnú tier)
3. Nastavte Network Access - pridajte IP adresu vášho servera alebo `0.0.0.0/0` pre prístup odkiaľkoľvek
4. Vytvorte Database User s menom a heslom
5. Získajte connection string:
   - Kliknite na "Connect" pri vašom clusteri
   - Vyberte "Connect your application"
   - Skopírujte connection string
6. Vytvorte alebo upravte súbor `.env` v adresári `/cenovky/api/` na vašom webhostingu:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cenovky
   PORT=5000
   JWT_SECRET=vaše_tajné_heslo
   CLIENT_URL=https://www.renemoravec.sk/cenovky
   ```

## Testovanie

1. Otestujte frontend aplikáciu:
   - Navštívte `https://www.renemoravec.sk/cenovky/`
   - Mali by ste vidieť úvodnú stránku aplikácie

2. Otestujte backend API:
   - Navštívte `https://www.renemoravec.sk/cenovky/api/test`
   - Mali by ste vidieť JSON odpoveď potvrdzujúcu, že API funguje

## Riešenie problémov

### Frontend problémy
- **Chyba 404**: Uistite sa, že súbor `.htaccess` je správne nakonfigurovaný a nahraný
- **Chyba pri načítaní API**: Skontrolujte, či API URL v aplikácii smeruje na správnu adresu

### Backend problémy
- **Chyba pri pripojení k MongoDB**: Skontrolujte connection string a uistite sa, že IP adresa servera je povolená v MongoDB Atlas
- **Server nebeží**: Uistite sa, že Node.js je správne nainštalovaný a beží na serveri
- **CORS chyby**: Skontrolujte nastavenie CORS v `server/src/index.ts` a `.htaccess` súboroch

### Kontaktné informácie pre podporu
- Email: váš_email@example.com
- Telefón: +421 XXX XXX XXX 