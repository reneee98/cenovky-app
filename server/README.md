# Price Offers Backend API

This is the backend API for the Price Offers application. It provides authentication and CRUD operations for managing price offers.

## Requirements

- Node.js 16+
- TypeScript
- MongoDB (optional, will use in-memory database if not configured)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   cd server
   npm install
   ```

3. Set up environment variables:
   ```
   node setup-env.js
   ```
   This will create a `.env` file with default settings. If you want to use MongoDB Atlas, edit the file and uncomment the `MONGODB_URI` line.

4. Start the development server:
   ```
   npm run dev
   ```
   This will start the server using nodemon, which will restart whenever you make changes to the code.

## API Endpoints

### Authentication

- **POST /api/auth/register** - Register a new user
  - Body: `{ "name": "Your Name", "email": "your@email.com", "password": "yourpassword" }`

- **POST /api/auth/login** - Login
  - Body: `{ "email": "your@email.com", "password": "yourpassword" }`

- **GET /api/auth/me** - Get current user information
  - Requires authentication token

### Offers

All offer endpoints require authentication.

- **GET /api/offers** - Get all offers for the authenticated user

- **GET /api/offers/:id** - Get a specific offer

- **POST /api/offers** - Create a new offer
  - Body: `{ "title": "Offer Title", "description": "Description", "items": [...], "isPublic": false }`

- **PUT /api/offers/:id** - Update an existing offer
  - Body: `{ "title": "Updated Title", "description": "Updated Description", "items": [...], "isPublic": false }`

- **DELETE /api/offers/:id** - Delete an offer

- **GET /api/offers/public/all** - Get all public offers

## Authentication

Authentication uses JSON Web Tokens (JWT). After logging in or registering, you will receive a token that should be included in the Authorization header of subsequent requests:

```
Authorization: Bearer <your_token>
```

## Database

By default, the application uses an in-memory MongoDB database, which means data will be lost when the server stops. To use a persistent database:

1. Create a MongoDB Atlas account or set up a local MongoDB server
2. Update the `.env` file with your MongoDB connection string
3. Restart the server

## Nastavenie MongoDB Atlas pre perzistentné dáta

Aby vaše dáta zostali uložené aj po vypnutí servera, je potrebné nastaviť MongoDB Atlas - cloudovú databázu.

### 1. Vytvorenie MongoDB Atlas účtu

1. Navštívte [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) a zaregistrujte sa alebo sa prihláste
2. Vytvorte nový cluster (môžete použiť bezplatnú tier)
3. Nastavte Network Access - pridajte vašu IP adresu alebo `0.0.0.0/0` pre prístup odkiaľkoľvek
4. Vytvorte Database User s menom a heslom

### 2. Získanie connection stringu

1. V MongoDB Atlas kliknite na "Connect" pri vašom clusteri
2. Vyberte "Connect your application"
3. Skopírujte connection string, ktorý bude vyzerať približne takto:
   ```
   mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority
   ```
4. Nahraďte `<password>` vaším skutočným heslom a `myFirstDatabase` názvom databázy (napr. `cenovky`)

### 3. Nastavenie .env súboru

Spustite nasledujúci príkaz v adresári `server`:

```
node setup-db.js
```

Tento skript vás prevedie nastavením MongoDB connection stringu a ďalších potrebných premenných.

## Spustenie servera

### Lokálne vývojové prostredie

```bash
# Inštalácia závislostí
npm install

# Spustenie vývojového servera
npm run dev
```

### Produkčné nasadenie

```bash
# Inštalácia závislostí
npm install

# Build projektu
npm run build

# Spustenie servera
npm start
```

## Nasadenie na hosting

Pre nasadenie na hosting potrebujete:

1. Nahrať celý adresár `server` na váš hosting
2. Nastaviť .env súbor s MongoDB connection stringom
3. Nainštalovať závislosti a spustiť build
4. Nastaviť server na spustenie cez `npm start`

## Prepojenie s frontend aplikáciou

Uistite sa, že v .env súbore máte správne nastavenú premennú `CLIENT_URL` na adresu, kde beží vaša frontend aplikácia (napr. `https://www.renemoravec.sk/cenovky`).

## Testovanie API

API môžete otestovať na adrese:

```
http://localhost:5000/api/test
```

alebo na vašej produkčnej URL. 