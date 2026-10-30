import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText, decodeLegacyEntities, svGenitive, wordKey } from '../js/text.js';

test('normalizeText trims, handles whitespaces, strips control chars, cuts to max length', () => {
  assert.equal(normalizeText('  Kalle   Anka  \n'), 'Kalle Anka');
  assert.equal(normalizeText('Special \u0000 tecken'), 'Special tecken');
  assert.equal(normalizeText('VäldigtLångtOrdHär', 10), 'VäldigtLån');
  assert.equal(normalizeText(null), '');
  assert.equal(normalizeText(undefined), '');
});

test('B1 regression: normalizeText does NOT escape HTML entities', () => {
  // textContent is used for rendering, so & and < and > should remain intact!
  assert.equal(normalizeText('Kalle & Co'), 'Kalle & Co');
  assert.equal(normalizeText("Rock'n'roll"), "Rock'n'roll");
  assert.equal(normalizeText('<b>Test</b>'), '<b>Test</b>');
});

test('B1 regression: decodeLegacyEntities decodes single and multi-layer encoded entities', () => {
  assert.equal(decodeLegacyEntities('Kalle &amp; Co'), 'Kalle & Co');
  assert.equal(decodeLegacyEntities('Kalle &amp;amp; Co'), 'Kalle & Co');
  assert.equal(decodeLegacyEntities('Rock&#39;n&#39;roll'), "Rock'n'roll");
  assert.equal(decodeLegacyEntities('&lt;script&gt;'), '<script>');
  assert.equal(decodeLegacyEntities('Normal text'), 'Normal text');
});

test('R3 regression: svGenitive applies correct Swedish genitive rules', () => {
  assert.equal(svGenitive('Lag Blå'), 'Lag Blås');
  assert.equal(svGenitive('Lag Mästarna'), 'Lag Mästarnas');
  assert.equal(svGenitive('Lag Snillena'), 'Lag Snillenas');
  assert.equal(svGenitive('Hans'), 'Hans');
  assert.equal(svGenitive('Max'), 'Max');
  assert.equal(svGenitive('Lukas'), 'Lukas');
  assert.equal(svGenitive('Inéz'), 'Inéz');
  assert.equal(svGenitive(''), '');
});

test('wordKey produces case-insensitive key using Swedish locale', () => {
  assert.equal(wordKey('Äpple'), 'äpple');
  assert.equal(wordKey('  ÖL  '), 'öl');
  assert.equal(wordKey('ÅSKA'), 'åska');
});
