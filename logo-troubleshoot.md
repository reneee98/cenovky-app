# Riešenie problémov s zobrazením loga v PDF exporte

Ak sa logo nezobrazuje správne v exportovanom PDF, môžete vyskúšať nasledujúce riešenia:

## Kontrolný zoznam pre správne zobrazenie loga

1. **Formát loga**
   - Pre najlepšiu kompatibilitu používajte formáty PNG alebo JPG namiesto SVG
   - SVG formát môže spôsobiť problémy pri konverzii do PDF

2. **Veľkosť súboru**
   - Optimalizujte veľkosť súboru loga (ideálne pod 100 KB)
   - Príliš veľké súbory môžu spôsobiť problémy pri PDF exporte

3. **Rozmery loga**
   - Používajte logo s primeranými rozmermi (napr. 300x100 pixelov)
   - Príliš veľké rozmery môžu spôsobiť problémy s pamäťou v prehliadači

## Ako otestovať a vyriešiť problém

1. **Vyčistite LocalStorage a nahrajte nové logo**
   - Otvorte súbor `force-reset.html` v prehliadači
   - Kliknite na "Vymazať všetky údaje" a potom obnovte aplikáciu
   - Prejdite do Nastavenia > Logo firmy a nahrajte logo znova

2. **Použite testovací nástroj pre logo**
   - Otvorte súbor `logo-test.html` v prehliadači
   - Kliknite na "Načítať logo z LocalStorage" 
   - Kliknite na "Debug informácie o logu" pre zobrazenie detailov
   - Vyskúšajte export do PDF

3. **Konvertujte SVG na PNG**
   - Ak používate SVG logo, konvertujte ho na PNG formát
   - Môžete použiť online nástroje ako [SVG2PNG](https://svgtopng.com)
   - Alebo použite náš testovací nástroj, ktorý vykoná konverziu automaticky

## Dodatočné tipy

1. **Uistite sa, že logo je platný obrázok**
   - Skontrolujte, či sa logo správne zobrazuje v prehliadači
   - Skúste obrázok otvoriť v novom okne/karte prehliadača

2. **Vyskúšajte iný prehliadač**
   - Niekedy môže problém s exportom PDF súvisieť s konkrétnym prehliadačom
   - Odporúčame Chrome alebo Firefox pre najlepšiu kompatibilitu

## Technické detaily pre vývojárov

PDF export používa knižnicu `html2pdf.js`, ktorá má tieto obmedzenia:

- Obrázky musia byť načítané pred generovaním PDF
- SVG formát nie je plne podporovaný v PDF exporte
- Veľké obrázky/logá môžu spôsobiť problémy s pamäťou

Ak problém pretrváva, vyskúšajte:

```javascript
// V konzole prehliadača
// 1. Uložte si aktuálne logo
const settings = JSON.parse(localStorage.getItem('companySettings'));
const logo = settings.logo;
// 2. Skontrolujte typ loga
console.log('Logo type:', logo ? logo.substring(0, 30) + '...' : 'not set');
``` 