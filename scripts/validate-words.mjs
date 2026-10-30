import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wordsPath = join(__dirname, '../words.js');

const VALID_PACKAGES = new Set(['standard', 'party', 'familj', 'klurigt']);
const VALID_DIFFICULTIES = new Set(['enkel', 'medel', 'svår']);
const MAX_LENGTH = 35;

// Basic profanity / slur blocklist (Swedish) to ensure no offensive terms are in party/standard/etc.
const BLOCKLIST = new Set([
  'neger', 'negerboll', 'blatte', 'svartskalle', 'hora', 'fitta', 'bögdjävel',
  'mongo', 'retard', 'kukhuvud', 'fittig', 'fittans'
]);

function runValidation() {
  const content = readFileSync(wordsPath, 'utf-8');
  
  // Extract JSON array from words.js
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) {
    throw new Error('Kunde inte hitta ord-array i words.js');
  }

  const words = JSON.parse(match[0]);
  console.log(`Validerar ${words.length} ord...`);

  if (words.length < 300) {
    throw new Error(`För få ord: ${words.length} (krav: minst 300)`);
  }

  const seenIds = new Set();
  const seenWords = new Map();
  const packageCounts = { standard: 0, party: 0, familj: 0, klurigt: 0 };
  const diffCounts = { enkel: 0, medel: 0, svår: 0 };
  const categories = new Set();

  for (const [index, item] of words.entries()) {
    const loc = `Index ${index} (ord: "${item.word}")`;

    if (!item.id || seenIds.has(item.id)) {
      throw new Error(`${loc}: Dubblett eller saknat id (${item.id})`);
    }
    seenIds.add(item.id);

    if (typeof item.word !== 'string' || item.word.trim().length === 0) {
      throw new Error(`${loc}: Ogiltigt ord`);
    }

    if (item.word.length > MAX_LENGTH) {
      throw new Error(`${loc}: Ordet är längre än ${MAX_LENGTH} tecken (${item.word.length})`);
    }

    const key = item.word.trim().toLocaleLowerCase('sv');
    if (seenWords.has(key)) {
      throw new Error(`${loc}: Dubblett av "${seenWords.get(key)}"`);
    }
    seenWords.set(key, item.word);

    // Blocklist check
    const wordsInPhrase = key.split(/[\s-]+/);
    for (const w of wordsInPhrase) {
      if (BLOCKLIST.has(w)) {
        throw new Error(`${loc}: Innehåller blockerat/olämpligt ord ("${w}")`);
      }
    }

    if (!VALID_PACKAGES.has(item.package)) {
      throw new Error(`${loc}: Ogiltigt paket "${item.package}"`);
    }
    packageCounts[item.package]++;

    if (!VALID_DIFFICULTIES.has(item.difficulty)) {
      throw new Error(`${loc}: Ogiltig svårighet "${item.difficulty}"`);
    }
    diffCounts[item.difficulty]++;

    if (!item.category || typeof item.category !== 'string') {
      throw new Error(`${loc}: Saknar kategori`);
    }
    categories.add(item.category);
  }

  console.log('✔ Alla ord passerade validering!');
  console.log('Paketfördelning:', packageCounts);
  console.log('Svårighetsfördelning:', diffCounts);
  console.log(`Kategorier (${categories.size} st):`, Array.from(categories).sort().join(', '));
}

try {
  runValidation();
} catch (err) {
  console.error('❌ Valideringsfel:', err.message);
  process.exit(1);
}
