/**
 * Lagring i localStorage med validering och migrering.
 * Allt som läses in valideras mot tillåtna värden – lagringen kan vara
 * manipulerad eller från en äldre version.
 * @license MIT
 */
import {
  CONFIG,
  STORAGE_KEYS,
  PRESET_COLORS,
  PACKAGES,
  TARGET_SCORES,
  ROUND_TIMES,
  DIFFICULTY_MODES,
  DEFAULT_SETTINGS
} from './config.js';
import { normalizeText, decodeLegacyEntities, wordKey } from './text.js';

/**
 * @param {Storage|null} storage
 */
export function createStorage(storage = safeLocalStorage()) {
  const read = (key) => {
    if (!storage) return null;
    try {
      const raw = storage.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    } catch {
      return null;
    }
  };
  const write = (key, value) => {
    if (!storage) return;
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Kunde inte spara till localStorage', e);
    }
  };
  const remove = (key) => {
    if (!storage) return;
    try {
      storage.removeItem(key);
    } catch {
      /* ignorera */
    }
  };

  return {
    // -------------------------------------------------------------------------
    // Egna ord
    // -------------------------------------------------------------------------
    loadCustomWords() {
      let list = read(STORAGE_KEYS.CUSTOM_WORDS);
      let migrated = false;
      if (!Array.isArray(list)) {
        // Migrera från v1, där orden sparades HTML-escapade (ibland i flera lager)
        const legacy = read(STORAGE_KEYS.CUSTOM_WORDS_LEGACY);
        list = Array.isArray(legacy) ? legacy.map((w) => decodeLegacyEntities(String(w))) : [];
        migrated = Array.isArray(legacy);
      }
      const words = sanitizeCustomWords(list);
      if (migrated) {
        write(STORAGE_KEYS.CUSTOM_WORDS, words);
        remove(STORAGE_KEYS.CUSTOM_WORDS_LEGACY);
      }
      return words;
    },

    saveCustomWords(words) {
      write(STORAGE_KEYS.CUSTOM_WORDS, sanitizeCustomWords(words));
    },

    // -------------------------------------------------------------------------
    // Inställningar
    // -------------------------------------------------------------------------
    loadSettings() {
      return sanitizeSettings(read(STORAGE_KEYS.SETTINGS));
    },

    saveSettings(settings) {
      write(STORAGE_KEYS.SETTINGS, sanitizeSettings(settings));
    },

    // -------------------------------------------------------------------------
    // Pågående match
    // -------------------------------------------------------------------------
    loadGame() {
      const data = read(STORAGE_KEYS.GAME);
      return data && typeof data === 'object' ? data : null;
    },

    saveGame(snapshot) {
      write(STORAGE_KEYS.GAME, snapshot);
    },

    clearGame() {
      remove(STORAGE_KEYS.GAME);
    }
  };
}

function safeLocalStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null; // T.ex. blockerad i privat läge
  }
}

/**
 * @param {unknown} list
 * @returns {string[]}
 */
export function sanitizeCustomWords(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const result = [];
  for (const raw of list) {
    const word = normalizeText(raw, CONFIG.MAX_WORD_LENGTH);
    const key = wordKey(word);
    if (!word || seen.has(key)) continue;
    seen.add(key);
    result.push(word);
    if (result.length >= CONFIG.MAX_CUSTOM_WORDS) break;
  }
  return result;
}

/**
 * @param {unknown} input
 */
export function sanitizeSettings(input) {
  const d = DEFAULT_SETTINGS;
  const s = input && typeof input === 'object' ? /** @type {any} */ (input) : {};

  let teams = Array.isArray(s.teams)
    ? s.teams
        .slice(0, CONFIG.MAX_TEAMS)
        .map((t, i) => {
          const rawPlayers = Array.isArray(t?.players)
            ? t.players
            : (typeof t?.players === 'string' ? t.players.split(',') : []);
          const players = rawPlayers
            .map((p) => normalizeText(p, 25))
            .filter(Boolean)
            .slice(0, 10);
          return {
            name: normalizeText(t?.name, CONFIG.MAX_TEAM_NAME_LENGTH) || `Lag ${i + 1}`,
            color: PRESET_COLORS.includes(t?.color) ? t.color : PRESET_COLORS[i % PRESET_COLORS.length],
            players
          };
        })
    : [];
  if (teams.length < CONFIG.MIN_TEAMS) teams = d.teams.map((t) => ({ ...t }));

  let packages = Array.isArray(s.packages) ? [...new Set(s.packages.filter((p) => PACKAGES.includes(p)))] : [];
  if (packages.length === 0) packages = [...d.packages];

  const bool = (v, fallback) => (typeof v === 'boolean' ? v : fallback);

  return {
    teams,
    packages,
    difficulty: Object.hasOwn(DIFFICULTY_MODES, s.difficulty) ? s.difficulty : d.difficulty,
    targetScore: TARGET_SCORES.includes(s.targetScore) ? s.targetScore : d.targetScore,
    roundTime: ROUND_TIMES.includes(s.roundTime) ? s.roundTime : d.roundTime,
    passPenalty: bool(s.passPenalty, d.passPenalty),
    sound: bool(s.sound, d.sound),
    vibrate: bool(s.vibrate, d.vibrate)
  };
}
