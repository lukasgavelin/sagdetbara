/**
 * Texthjälpare. All rendering sker med textContent, så ingen HTML-escaping
 * behövs (eller ska göras) här – bara normalisering.
 * @license MIT
 */

/**
 * Normaliserar användarinmatad text: tar bort kontrolltecken, slår ihop
 * blanksteg, trimmar och kapar till maxlängd.
 * @param {unknown} value
 * @param {number} maxLength
 * @returns {string}
 */
export function normalizeText(value, maxLength = Infinity) {
  if (value === null || value === undefined) return '';
  return String(value)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
    .trim();
}

const LEGACY_ENTITIES = Object.freeze({
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x2F;': '/',
  '&amp;': '&'
});

/**
 * Avkodar HTML-entiteter som den gamla sanitizeText-funktionen lade in
 * (eventuellt i flera lager, t.ex. "&amp;amp;"). Används för migrering.
 * @param {string} str
 * @returns {string}
 */
export function decodeLegacyEntities(str) {
  let current = String(str);
  for (let i = 0; i < 10; i++) {
    const next = current.replace(/&(?:lt|gt|quot|#39|#x2F|amp);/g, (m) => LEGACY_ENTITIES[m]);
    if (next === current) break;
    current = next;
  }
  return current;
}

/**
 * Svensk genitiv: "Lag Blå" → "Lag Blås", "Lag Mästarna" → "Lag Mästarnas",
 * "Hans" → "Hans", "Max" → "Max".
 * @param {string} name
 * @returns {string}
 */
export function svGenitive(name) {
  const trimmed = String(name).trim();
  if (!trimmed) return trimmed;
  return /[sxzSXZ]$/.test(trimmed) ? trimmed : `${trimmed}s`;
}

/**
 * Jämförelsenyckel för dubblettkontroll.
 * @param {string} str
 */
export function wordKey(str) {
  return normalizeText(str).toLocaleLowerCase('sv');
}
