# Riešenie problémov so zobrazením loga v PDF exporte

## Zhrnutie problému
Niektoré logá sa nemusia správne zobrazovať v PDF exporte, najmä SVG formáty alebo obrázky s transparentnosťou.

## Riešené problémy

### 1. SVG logá nie sú viditeľné v PDF
**Riešenie:**
- SVG logá sa automaticky konvertujú na PNG formát pre lepšiu kompatibilitu
- Nová implementácia používa canvas na konverziu na rozlíšení plátna 

### 2. Logá s transparentným pozadím
**Riešenie:**
- Pri konverzii sa teraz pridáva biele pozadie pre lepšiu viditeľnosť

### 3. Postupnosť spracovania loga pri nahrávaní:
1. Nahratie súboru obrázka
2. Detekcia formátu (SVG/PNG/JPG/WebP)
3. Pre SVG súbory - automatická konverzia na PNG formát
4. Uloženie base64 reťazca do localStorage/companySettings
5. Pri generovaní PDF - opätovná validácia, že logo je v kompatibilnom formáte

### 4. Nastavenie parametrov html2pdf pre lepšie zobrazenie loga:
- Zvýšené rozlíšenie (scale: 4)
- Zapnuté CORS/allowTaint pre externé zdroje
- Pridané extra spracovanie pre logoContainer pri klonovaní DOM

## Ako otestovať, či logo funguje
1. Otvorte testovací súbor `logo-test.html`
2. Nahrajte logo (SVG/PNG/JPG)
3. Kliknite na "Debug informácie o logu" pre analýzu
4. Vyskúšajte "Exportovať PDF" a skontrolujte výsledok
5. Pri problémoch skontrolujte logovanie v konzole prehliadača

## Odporúčania pre budúce logá
- Preferujte PNG formát s rozlíšením aspoň 200×60px
- Vyhnite sa veľmi komplexným SVG súborom
- Maximálna odporúčaná veľkosť je 100KB
- Ak používate SVG, uistite sa, že neobsahuje externé zdroje a odkazy

## Technické poznámky pre vývojárov
- HTML2PDF má problémy s renderovaním SVG a niektorých typov PNG s transparentnosťou
- Pri konverzii SVG na PNG sa používa canvas, ktorý má isté limitácie pre komplexné SVG
- Pri implementácii v hlavnej aplikácii sme pridali dodatočné vrstvenie canvasu
- LogoUpload komponent bol aktualizovaný a riadi celý proces konverzie 