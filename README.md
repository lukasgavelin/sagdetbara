# Säg det bara! ⚡🗣️

Det blixtsnabba sällskapsspelet på svenska – optimerat för **pass-and-play** på mobil och surfplatta.

---

## ☁️ Deploy till Cloudflare Pages

Appen är anpassad och förberedd för omedelbar publicering på **Cloudflare Pages**:
- Inkluderar `_headers` med strikta säkerhetsheaders och optimerad caching för PWA/Service Worker.
- Inkluderar `_redirects` för SPA-routing.
- Inkluderar `wrangler.toml` för direkt deploy via Wrangler CLI eller GitHub Actions.
- Inkluderar PWA-ikoner (`icon-192.png`, `icon-512.png`, `icon.svg`), `manifest.webmanifest` och `sw.js`.

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

## 🌟 Funktioner

### 1. Ordpaket & Teman
Välj fritt vilka typer av ord som ska blandas i omgången:
- 🌟 **Standard**: Varierade substantiv, verb och vardagsord.
- 🎉 **Party & Fest**: Nattliv, drinkar, kändisar och rolig slang.
- 👨‍👩‍👧 **Familj**: Barnvänliga ord, leksaker, djur och lek.
- 🧠 **Nörd & Klurigt**: Vetenskap, paradoxer, filosofi och teknik.
- ✍️ **Egna ord & interna skämt**: Skapa och spara egna ord direkt i appen (sparas lokalt i webbläsarens `localStorage`).

### 2. Sudden Death vid Oavgjort
Om två eller fler lag slutar på samma högsta poäng över målet när alla lag kört omgången, bryter spelet ut i en intensiv **Sudden Death**! En 25-sekunders blixtrunda mellan de oavgjorda lagen avgör vem som tar hem segern.

### 3. Stoppa & Avbryta Runda
Tryck på pausknappen ⏸️ för att välja mellan:
- **▶️ Återuppta runda**
- **🏁 Avsluta runda i förtid & räkna poäng**
- **🔄 Kasta rundan / Gör om**

### 4. Fullt PWA-stöd (Offline-spel)
- Installeras som en app direkt på hemskärmen i Safari (iOS) och Chrome (Android).
- Fungerar 100% offline via Service Worker.

---

## 🎮 Spelregler & Touch
- **2 till 6 lag** med anpassade namn och färger.
- **Målställning**: 30, 50 eller 80 poäng.
- **Rundtid**: 30, 45, 60 eller 90 sekunder.
- **Pass-regel**: Välj om *Pass* ger -1 eller 0 poäng.
- **Svepgester**:
  - Svep **Höger / Upp** för **Rätt** (+1).
  - Svep **Vänster / Ner** för **Pass** (-1 / 0).
- **Ljud & Haptik**: Web Audio API utan externa filer.
