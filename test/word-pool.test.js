import test from 'node:test';
import assert from 'node:assert/strict';
import { WordPool, buildPool, shuffle } from '../js/word-pool.js';

const mockWords = [
  { id: 1, word: 'Hund', package: 'familj', difficulty: 'enkel' },
  { id: 2, word: 'Katt', package: 'familj', difficulty: 'enkel' },
  { id: 3, word: 'Öl', package: 'party', difficulty: 'enkel' },
  { id: 4, word: 'Baksmälla', package: 'party', difficulty: 'medel' },
  { id: 5, word: 'Paradox', package: 'klurigt', difficulty: 'svår' },
  { id: 6, word: 'Bord', package: 'standard', difficulty: 'enkel' }
];

test('buildPool filters by package and includes custom words', () => {
  const { words, widened } = buildPool(mockWords, {
    packages: ['party'],
    difficulty: 'blandat',
    customWords: ['Eget Skämt', 'Öl'] // 'Öl' should not be duplicated
  });

  const wordNames = words.map(w => w.word);
  assert.ok(wordNames.includes('Öl'));
  assert.ok(wordNames.includes('Baksmälla'));
  assert.ok(wordNames.includes('Eget Skämt'));
  assert.ok(!wordNames.includes('Hund'));
  assert.equal(words.filter(w => w.word === 'Öl').length, 1);
});

test('WordPool draws unique words until exhausted, then recycles', () => {
  const words = [
    { id: 1, word: 'A' },
    { id: 2, word: 'B' },
    { id: 3, word: 'C' }
  ];

  const pool = new WordPool(words);
  const first = pool.next();
  const second = pool.next();
  const third = pool.next();

  assert.equal(new Set([first.id, second.id, third.id]).size, 3);

  // Pool exhausted, drawing next word should recycle without error
  const recycled = pool.next();
  assert.ok([1, 2, 3].includes(recycled.id));
});

test('shuffle preserves elements and length', () => {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8];
  const copy = [...arr];
  shuffle(copy);
  assert.equal(copy.length, arr.length);
  assert.deepEqual([...copy].sort(), [...arr].sort());
});
