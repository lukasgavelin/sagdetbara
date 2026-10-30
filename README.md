# Säg det bara! ⚡🗣️

Det blixtsnabba sällskapsspelet på svenska – optimerat för **pass-and-play** på mobil och surfplatta.

---

## ☁️ Deploy till Cloudflare Pages

Appen är anpassad och förberedd för omedelbar publicering på **Cloudflare Pages**:
- Inkluderar `_headers` med strikt Content-Security-Policy (CSP), HSTS och optimerad caching för PWA/Service Worker.
- Inkluderar `wrangler.toml` för direkt deploy via Wrangler CLI eller GitHub Actions.
- Inkluderar PWA-ikoner (`icon-192.png`, `icon-512.png`, `icon.svg`), `manifest.webmanifest` och `sw.js` (stale-while-revalidate & offline-cache).

### Metod 1: Koppla GitHub till Cloudflare Dashboard (Rekommenderas)
1. Gå till [Cloudflare Dashboard](https://dash.cloudflare.com/) och välj **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
2. Välj ditt repo: **`lukasgavelin/sagdetbara`**.
3. I inställningarna för bygget (**Build settings**):
   - **Framework preset**: `None`
   - **Build command**: *(lämna tomt)*
   - **Build output directory**: `.` *(eller lämna tomt för rotmappen)*
4. Klicka på **Save and Deploy**!
5. Klart! Du får en blixtsnabb `https://sagdetbara.pages.dev`-adress med gratis globalt CDN och HTTPS.

### Metod 2: Deploy via Wrangler CLI
Kör i projektmappen:
```bash
npx wrangler pages deploy . --project-name=sagdetbara
```

---

## 💻 Lokal Utveckling & Tester

Eftersom appen använder moderna ES-moduler körs den lokalt med en enkel webbserver (istället för `file://`):

```bash
# Starta lokal utvecklingsserver
npx serve .
# eller
python3 -m http.server 8080
```

### Kör automatiska enhetstester
Projektet har 19 automatiska tester för spellogik, Sudden Death, poängräkning, tidsberäkningar och datamigrering:

```bash
# Kör enhetstester med Node.js inbyggda testrunner
npm test

# Validera och kontrollera ordbank (dubbletter, längd, svordomar)
npm run validate-words
```

---

## 🌟 Funktioner

### 1. Ordpaket & Teman (1 000+ ord)
Välj fritt vilka typer av ord som ska blandas i omgången:
- 🌟 **Standard**: 400+ varierade substantiv, verb och vardagsord.
- 🎉 **Party & Fest**: 200+ nattliv, drinkar, kändisar och rolig slang.
- 👨‍👩‍👧 **Familj**: 250+ barnvänliga ord, leksaker, djur och lek.
- 🧠 **Nörd & Klurigt**: 160+ vetenskap, paradoxer, filosofi och teknik.
- ✍️ **Egna ord & interna skämt**: Skapa och spara egna ord direkt i appen (sparas lokalt i webbläsarens `localStorage`).

### 2. Sudden Death vid Oavgjort
Om två eller fler lag slutar på samma högsta poäng över målet när alla lag kört omgången, bryter spelet ut i en intensiv **Sudden Death**! En 25-sekunders blixtrunda mellan de oavgjorda lagen avgör vem som tar hem segern.

### 3. Återuppta pågående match
Appen sparar automatiskt spelets tillstånd i webbläsaren. Om sidan laddas om eller stängs av misstag kan matchen återupptas direkt från startsidan.

### 4. Mobil- och spelanpassad
- **Screen Wake Lock API**: Håller skärmen tänd under pågående runda.
- **Tidsbaserad timer**: Ingen tidsdrift om appen pausas eller fliken byts.
- **Auto-paus**: Pausar automatiskt om telefonen ringer eller appen hamnar i bakgrunden.
- **Sista ordet när tiden tar slut**: Räknas inte (0 poäng) som standard, men kan enkelt justeras i granskningen.
- **Granska och korrigera**: Ändra enkelt mellan Rätt, Pass och Räknas ej efter varje runda.

### 5. Fullt PWA-stöd (Offline-spel)
- Installeras som en app direkt på hemskärmen i Safari (iOS) och Chrome (Android).
- Fungerar 100% offline via Service Worker.
- Automatisk uppdateringsavisering vid ny version.

---

## 🎮 Spelregler & Touch
- **2 till 6 lag** med anpassade namn och färger.
- **Svårighetsgrad**: Lätt, Blandat eller Klurigt.
- **Målställning**: 30, 50 eller 80 poäng.
- **Rundtid**: 30, 45, 60 eller 90 sekunder.
- **Pass-regel**: Välj om *Pass* ger -1 eller 0 poäng.
- **Svepgester**:
  - Svep **Höger / Upp** för **Rätt** (+1).
  - Svep **Vänster / Ner** för **Pass** (-1 / 0).
- **Ljud & Haptik**: Web Audio API utan externa filer.
