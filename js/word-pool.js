/**
 * Ordpool: filtrerar ord efter paket och svårighetsgrad, blandar in egna
 * ord och delar ut ord utan upprepning tills poolen är slut.
 * Ren logik – inga DOM-beroenden.
 * @license MIT
 */
import { CONFIG, DIFFICULTY_MODES } from './config.js';
import { wordKey } from './text.js';

/**
 * Fisher–Yates-blandning (på plats).
 * @template T
 * @param {T[]} array
 * @param {() => number} random
 * @returns {T[]}
 */
export function shuffle(array, random = Math.random) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Gör om egna ord till ordobjekt med stabila id:n.
 * @param {string[]} customWords
 */
export function customWordObjects(customWords) {
  return customWords.map((word) => ({
    id: `custom:${wordKey(word)}`,
    word,
    category: 'Eget ord ⭐',
    difficulty: 'medel',
    package: 'custom'
  }));
}

/**
 * Bygger listan med spelbara ord.
 * @param {Array<{id:any, word:string, package?:string, difficulty?:string}>} allWords
 * @param {{packages: Iterable<string>, difficulty?: string, customWords?: string[]}} options
 * @returns {{words: any[], widened: boolean}}
 *   widened = true om svårighetsfiltret släpptes för att poolen blev för liten
 */
export function buildPool(allWords, { packages, difficulty = 'blandat', customWords = [] }) {
  const pkgSet = new Set(packages);
  const byPackage = allWords.filter((w) => pkgSet.has(w.package || 'standard'));
  const base = byPackage.length > 0 ? byPackage : [...allWords];

  const levels = DIFFICULTY_MODES[difficulty] || DIFFICULTY_MODES.blandat;
  let filtered = base.filter((w) => levels.includes(w.difficulty || 'medel'));
  let widened = false;
  if (filtered.length < CONFIG.MIN_POOL_SIZE && filtered.length < base.length) {
    filtered = base;
    widened = true;
  }

  // Egna ord läggs alltid till, och dubbletter mot ordlistan tas bort
  const seen = new Set(filtered.map((w) => wordKey(w.word)));
  const custom = customWordObjects(customWords).filter((w) => !seen.has(wordKey(w.word)));

  return { words: [...filtered, ...custom], widened };
}

export class WordPool {
  /**
   * @param {any[]} words
   * @param {{random?: () => number, usedIds?: Array<string|number>}} [options]
   */
  constructor(words, { random = Math.random, usedIds = [] } = {}) {
    this.random = random;
    const used = new Set(usedIds);
    this.available = shuffle(words.filter((w) => !used.has(w.id)), random);
    this.used = words.filter((w) => used.has(w.id));
    if (words.length === 0) {
      throw new Error('Ordpoolen är tom');
    }
  }

  get size() {
    return this.available.length + this.used.length;
  }

  /** Drar nästa ord. När alla är använda blandas de om. */
  next() {
    if (this.available.length === 0) {
      this.available = shuffle(this.used, this.random);
      this.used = [];
    }
    const word = this.available.pop();
    this.used.push(word);
    return word;
  }

  /** Id:n för använda ord (för att kunna spara och återuppta en match) */
  usedIds() {
    return this.used.map((w) => w.id);
  }
}
