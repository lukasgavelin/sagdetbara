import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorage, sanitizeCustomWords, sanitizeSettings } from '../js/storage.js';

class MockStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}

test('sanitizeCustomWords strips control characters and deduplicates', () => {
  const words = ['Katt', '  Hund  ', 'KATT', 'Fisk\u0000'];
  const sanitized = sanitizeCustomWords(words);
  assert.deepEqual(sanitized, ['Katt', 'Hund', 'Fisk']);
});

test('createStorage migrates legacy custom words with decoded entities', () => {
  const mock = new MockStorage();
  mock.setItem('sag_det_bara_custom_words_v1', JSON.stringify(['Kalle &amp; Co', 'Rock&#39;n&#39;roll']));

  const storage = createStorage(mock);
  const words = storage.loadCustomWords();

  assert.deepEqual(words, ['Kalle & Co', "Rock'n'roll"]);
  assert.equal(mock.getItem('sag_det_bara_custom_words_v1'), null); // old key removed
  assert.ok(mock.getItem('sag_det_bara_custom_words_v2') !== null); // new key saved
});

test('sanitizeSettings ensures valid defaults and sanitizes corrupted input', () => {
  const badSettings = {
    teams: [{ name: 'A', color: 'invalid-color' }],
    targetScore: 999, // not in [30, 50, 80]
    packages: ['invalid-package']
  };

  const clean = sanitizeSettings(badSettings);
  assert.ok(clean.teams.length >= 2);
  assert.equal(clean.targetScore, 50); // fallback to default
  assert.deepEqual(clean.packages, ['standard', 'party']);
});
