/**
 * Konfigurationskonstanter för Säg det bara!
 * @license MIT
 */

export const CONFIG = Object.freeze({
  MIN_TEAMS: 2,
  MAX_TEAMS: 6,
  MAX_CUSTOM_WORDS: 150,
  MAX_WORD_LENGTH: 35,
  MAX_TEAM_NAME_LENGTH: 20,
  SUDDEN_DEATH_SECONDS: 25,
  DEFAULT_ROUND_TIME: 60,
  DEFAULT_TARGET_SCORE: 50,
  SWIPE_THRESHOLD: 85,
  TILT_THRESHOLD: 100,
  CARD_TRANSITION_MS: 180,
  MIN_POOL_SIZE: 50
});

export const STORAGE_KEYS = Object.freeze({
  CUSTOM_WORDS_LEGACY: 'sag_det_bara_custom_words_v1',
  CUSTOM_WORDS: 'sag_det_bara_custom_words_v2',
  SETTINGS: 'sag_det_bara_settings_v1',
  GAME: 'sag_det_bara_game_v1'
});

export const PRESET_COLORS = Object.freeze([
  '#3b82f6', // Blå
  '#ef4444', // Röd
  '#10b981', // Grön
  '#f59e0b', // Gul
  '#8b5cf6', // Lila
  '#ec4899' // Rosa
]);

export const PRESET_TEAM_NAMES = Object.freeze([
  'Lag Blå',
  'Lag Röd',
  'Lag Raketen',
  'Lag Stjärnorna',
  'Lag Tigrarna',
  'Lag Mästarna'
]);

export const PACKAGES = Object.freeze(['standard', 'party', 'familj', 'klurigt']);

export const TARGET_SCORES = Object.freeze([20, 30, 50, 80]);
export const ROUND_TIMES = Object.freeze([30, 45, 60, 90]);

/** Svårighetsnivåer i orddatan */
export const DIFFICULTIES = Object.freeze(['enkel', 'medel', 'svår']);

/** Svårighetsval i inställningarna → vilka nivåer som ingår */
export const DIFFICULTY_MODES = Object.freeze({
  latt: Object.freeze(['enkel']),
  blandat: Object.freeze(['enkel', 'medel', 'svår']),
  svart: Object.freeze(['medel', 'svår'])
});

/** Statusar för ett ord i en runda */
export const WORD_STATUS = Object.freeze({
  CORRECT: 'correct',
  PASS: 'pass',
  SKIPPED: 'skipped' // Sista ordet när tiden tar slut – räknas inte
});

export const DEFAULT_SETTINGS = Object.freeze({
  teams: [
    { name: 'Lag Blå', color: '#3b82f6', players: [] },
    { name: 'Lag Röd', color: '#ef4444', players: [] }
  ],
  packages: ['standard', 'party'],
  difficulty: 'blandat',
  targetScore: 50,
  roundTime: 60,
  passPenalty: true,
  sound: true,
  vibrate: true
});
