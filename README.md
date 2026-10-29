# Säg det bara! ⚡🗣️

Det blixtsnabba sällskapsspelet på svenska – optimerat för **pass-and-play** på mobil och surfplatta.

---

## 🌟 Nya Funktioner & Uppdateringar

### 1. Ordpaket & Teman
Välj fritt vilka typer av ord som ska blandas i omgången:
- 🌟 **Standard**: Varierade substantiv, verb och vardagsord.
- 🎉 **Party & Fest**: Nattliv, drinkar, kändisar och rolig slang.
- 👨‍👩‍👧 **Familj**: Barnvänliga ord, leksaker, djur och lek.
- 🧠 **Nörd & Klurigt**: Vetenskap, paradoxer, filosofi och teknik.
- ✍️ **Egna ord & interna skämt**: Skapa och spara egna ord direkt i appen (sparas lokalt i webbläsaren).

### 2. Sudden Death vid Oavgjort
Om två eller fler lag slutar på samma högsta poäng över målet när alla lag kört omgången, bryter spelet ut i en intensiv **Sudden Death**! En 25-sekunders blixtrunda mellan de oavgjorda lagen avgör vem som tar hem segern.

### 3. Stoppa & Avbryta Runda
Blev ni avbrutna, ringde telefonen eller råkade någon fuska? Tryck på pausknappen ⏸️ för att välja mellan:
- **▶️ Återuppta runda**
- **🏁 Avsluta runda i förtid & räkna poäng** (sparar de ord som gissats hittills)
- **🔄 Kasta rundan / Gör om** (nollställer rundans ord och låter laget starta om)

### 4. Fullt PWA-stöd (Offline-spel)
Appen har nu en webbapp-manifest (`manifest.webmanifest`) och en Service Worker (`sw.js`).
- Kan installeras som en fristående app direkt till hemskärmen i Safari (iOS) och Chrome (Android).
- Fungerar 100% offline utan nätverksuppkoppling.

---

## 🎮 Spelregler & Funktioner i korthet
- **2 till 6 lag** med anpassade namn och lagfärger.
- **Målställning**: 30, 50 eller 80 poäng.
- **Rundtid**: 30, 45, 60 eller 90 sekunder.
- **Pass-regel**: Välj om *Pass* ska ge -1 eller 0 poäng.
- **Svepgester & Touch**:
  - Svep **Höger / Upp** för **Rätt** (+1).
  - Svep **Vänster / Ner** för **Pass** (-1 / 0).
  - Tydliga stämplar och 3D-lutning när kortet dras.
- **Ljud & Haptik**: Web Audio API-syntes för rätt-svar, pass, 5-sekunders varning och slut-buzzer.
- **Granskning efter runda**: Ändra enkelt felaktiga tryck innan poängen spikas.

---

## 🚀 Starta och spela
Öppna bara `index.html` direkt i valfri webbläsare, eller starta en lokal server:
```bash
python3 -m http.server 8000
```
Öppna sedan `http://localhost:8000` (eller datorns lokala IP på telefonen).
