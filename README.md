# Säg det bara!

Ett snabbt sällskapsspel på svenska, optimerat för pass-and-play på mobil, surfplatta och dator.

---

## Funktioner

### 1. Ordpaket och teman (1 095 ord)
Spelet innehåller en kurerad svensk ordbas med valbara paket:
- Standard: 441 varierade substantiv, verb och vardagsord.
- Party: 223 ord med fokus på fest, nöjesliv, slang och samtalsämnen.
- Familj: 250 barnvänliga ord lämpliga för alla åldrar.
- Klurigt: 181 ord inom vetenskap, filosofi, teknik och abstrakta begrepp.
- Egna ord och interna skämt: Skapa, redigera, exportera och importera egna ord direkt i applikationen (lagras lokalt i webbläsaren).

### 2. Lag och förklarar-rotation
- Stöd för 2 till 6 lag med anpassade namn och färger.
- Valfri inmatning av spelarnamn per lag.
- Automatisk rotation av förklarare och gissare inför varje runda, vilket visas på överlämningsskärmen.

### 3. Sudden Death vid oavgjort
Om två eller fler lag når eller passerar målpoängen med samma slutpoäng efter en fullbordad omgång, bryter spelet ut i en blixtrunda på 25 sekunder per oavgjort lag tills en ensam vinnare koras.

### 4. Återuppta match
Pågående matchläge sparas automatiskt i webbläsarens lokala lagring. Om sidan stängs eller laddas om kan matchen återupptas från startsidan.

### 5. Mobil- och pekskärmsoptimering
- Screen Wake Lock API håller skärmen aktiv under aktiva rundor.
- Automatisk paus vid flikbyte eller inkommande samtal via `visibilitychange`.
- Säker historiknavigering (`popstate`) som fångar bakåtsvep och förhindrar att matchen oavsiktligt stängs.
- Granskningsvy efter varje runda för att korrigera poäng eller avgöra status på det sista ordet vid tidens slut.
- Resultatdelning via Web Share API på vinstskärmen.

### 6. PWA och offlinestöd
- Fullt stöd för Progressive Web App med installation på hemskärmen i iOS och Android.
- Tjänstearbetare (`sw.js`) med stale-while-revalidate för statiska tillgångar och nätverks-först för navigering.
- Automatisk uppdateringsavisering vid ny version.

---

## Spelregler och kontroller

- Antal lag: 2 till 6 lag.
- Svårighetsgrad: Lätt, Blandat eller Klurigt.
- Målpoäng: 20 (snabbmatch), 30, 50 eller 80 poäng.
- Rundtid: 30, 45, 60 eller 90 sekunder.
- Passningsregel: Valbart mellan 0 poäng eller -1 poäng vid pass.
- Kontroller:
  - Svep eller dra kortet åt höger/uppåt för Rätt (+1).
  - Svep eller dra kortet åt vänster/nedåt för Pass (0 eller -1).
  - Piltangenter eller mellanslag vid tangentbordsstyrning.

---

## Arkitektur och moduler

Källkoden är uppdelad i ren affärslogik frikopplad från DOM, samt presentations- och interaktionsmoduler:

- `js/config.js`: Global konfiguration, intervallgränser, färger, ordpaket och standardinställningar.
- `js/game-state.js`: Spellogik, laghantering, poängräkning, förklarar-rotation, serialisering och Sudden Death. Helt frikopplad från webbläsarens DOM.
- `js/timer.js` (`RoundTimer`): Tidsdrift-säker rundtimer baserad på `performance.now()` och absolut sluttid, vilket eliminerar felmarginaler när fliken körs i bakgrunden.
- `js/word-pool.js` (`WordPool`): Filtrering av ord baserat på paket och svårighetsgrad, sammanfogning med egna ord och slumpmässig utdelning via Fisher-Yates-blandning.
- `js/storage.js`: Typvalidering, sanering och persistens i `localStorage` för inställningar, egna ord och matchtillstånd.
- `js/wake-lock.js` (`WakeLockManager`): Hanterar Screen Wake Lock API för att förhindra att enhetens skärm stängs av under pågående runda.
- `js/audio.js` (`SoundEffects`): Ljudeffekter syntetiserade med Web Audio API utan externa ljudfiler.
- `js/text.js`: Normalisering av textsträngar, svensk genitivböjning och skiftlägesoberoende nycklar.
- `js/app.js` (`AliasApp`): UI-styrning, vy-växling, händelsehantering, drag- och svepgester samt historiknavigering.
- `words.js`: Ordbas med 1 095 ord fördelade på paket, kategorier och svårighetsgrader.

---

## Lokal utveckling och tester

Applikationen bygger på moderna ES-moduler utan krav på byggsteg eller bundlers. För lokal utveckling körs en lokal HTTP-server:

```bash
# Starta lokal utvecklingsserver
npx serve .
# alternativt
python3 -m http.server 8080
```

### Automatiserade tester och validering

Projektet har automatiserade tester som körs med Node.js inbyggda testkörare (`node --test`), samt ordbanksvalidering:

```bash
# Kör samtliga 20 enhetstester
npm test

# Validera ordbanken (kontroll av dubbletter, paket, längd och blockerade ord)
npm run validate-words

# Bumpa Service Worker-cacheversion (sw.js) inför release
npm run bump-version
```

---

## Deploy till Cloudflare Pages

Applikationen är förberedd för publicering på Cloudflare Pages:
- Inkluderar `_headers` med Content-Security-Policy (CSP), HSTS och anpassade cache-huvuden för Service Worker och statiska tillgångar.
- Inkluderar `wrangler.toml` för deploy via Wrangler CLI eller automatiserade CI/CD-pipelines.
- Inkluderar PWA-ikoner (`icon-192.png`, `icon-512.png`, `icon.svg`), `manifest.webmanifest` och `sw.js` (stale-while-revalidate och offline-cache).

### Metod 1: Koppla Git-arkiv till Cloudflare Dashboard
1. Gå till Cloudflare Dashboard och välj Workers & Pages -> Create application -> Pages -> Connect to Git.
2. Välj arkivet: `lukasgavelin/sagdetbara`.
3. I bygginställningarna (Build settings):
   - Framework preset: None
   - Build command: (lämna tomt)
   - Build output directory: `.` (eller lämna tomt för rotkatalogen)
4. Spara och driftsätt.

### Metod 2: Deploy via Wrangler CLI
Kör i projektkatalogen:
```bash
npx wrangler pages deploy . --project-name=sagdetbara
```
