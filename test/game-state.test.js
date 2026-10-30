import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState, pointsFor, summarizeRound } from '../js/game-state.js';
import { WORD_STATUS } from '../js/config.js';

test('pointsFor computes correct scores according to passPenalty', () => {
  assert.equal(pointsFor(WORD_STATUS.CORRECT, true), 1);
  assert.equal(pointsFor(WORD_STATUS.CORRECT, false), 1);

  assert.equal(pointsFor(WORD_STATUS.PASS, true), -1);
  assert.equal(pointsFor(WORD_STATUS.PASS, false), 0);

  // Sista ordet (SKIPPED) gives 0 points regardless of penalty
  assert.equal(pointsFor(WORD_STATUS.SKIPPED, true), 0);
  assert.equal(pointsFor(WORD_STATUS.SKIPPED, false), 0);
});

test('summarizeRound correctly counts correct, pass, skipped and net points', () => {
  const words = [
    { status: WORD_STATUS.CORRECT },
    { status: WORD_STATUS.CORRECT },
    { status: WORD_STATUS.PASS },
    { status: WORD_STATUS.SKIPPED }
  ];

  const withPenalty = summarizeRound(words, true);
  assert.equal(withPenalty.correct, 2);
  assert.equal(withPenalty.pass, 1);
  assert.equal(withPenalty.skipped, 1);
  assert.equal(withPenalty.net, 1); // 2 - 1 = 1

  const noPenalty = summarizeRound(words, false);
  assert.equal(noPenalty.net, 2); // 2 - 0 = 2
});

test('GameState flow: rounds, last word skipped by default, toggle in review', () => {
  const game = new GameState({
    teams: [
      { name: 'Lag Blå', color: '#3b82f6' },
      { name: 'Lag Röd', color: '#ef4444' }
    ],
    targetScore: 10,
    roundTime: 60,
    passPenalty: true
  });

  assert.equal(game.activeTeam.name, 'Lag Blå');
  game.beginRound();

  game.record({ id: 1, word: 'Bord' }, WORD_STATUS.CORRECT);
  game.record({ id: 2, word: 'Stol' }, WORD_STATUS.PASS);

  // End round with time running out on word 'Kopp'
  game.endRound({ id: 3, word: 'Kopp' });

  assert.equal(game.roundWords.length, 3);
  assert.equal(game.roundWords[2].status, WORD_STATUS.SKIPPED);

  // Net: 1 (correct) - 1 (pass) + 0 (skipped) = 0
  assert.equal(game.roundSummary.net, 0);

  // Toggle word 2 (last word): skipped -> correct
  game.toggleWordStatus(2);
  assert.equal(game.roundWords[2].status, WORD_STATUS.CORRECT);
  assert.equal(game.roundSummary.net, 1); // 2 correct, 1 pass = 1

  const outcome = game.confirmRound();
  assert.equal(outcome.type, 'scoreboard');
  assert.equal(game.teams[0].score, 1);
  assert.equal(game.activeTeam.name, 'Lag Röd');
});

test('GameState victory trigger happens only when whole round completes', () => {
  const game = new GameState({
    teams: [
      { name: 'Lag Blå', color: '#3b82f6' },
      { name: 'Lag Röd', color: '#ef4444' }
    ],
    targetScore: 10,
    roundTime: 60,
    passPenalty: true
  });

  // Lag Blå reaches target score during their turn
  game.teams[0].score = 10;
  game.beginRound();
  const outcome1 = game.confirmRound();
  // Should go to Lag Röd so both teams get equal turns!
  assert.equal(outcome1.type, 'scoreboard');
  assert.equal(game.activeTeam.name, 'Lag Röd');

  // Lag Röd finishes with 5 points
  game.teams[1].score = 5;
  game.beginRound();
  const outcome2 = game.confirmRound();
  // Now whole round is done, Lag Blå wins!
  assert.equal(outcome2.type, 'victory');
  assert.equal(outcome2.winner.name, 'Lag Blå');
});

test('GameState triggers Sudden Death on tie over targetScore', () => {
  const game = new GameState({
    teams: [
      { name: 'Lag Blå', color: '#3b82f6' },
      { name: 'Lag Röd', color: '#ef4444' }
    ],
    targetScore: 10,
    roundTime: 60,
    passPenalty: true
  });

  game.teams[0].score = 12;
  game.confirmRound(); // turn passes to team 2
  game.teams[1].score = 12;
  const outcome = game.confirmRound();

  assert.equal(outcome.type, 'suddenDeath');
  assert.equal(game.isSuddenDeath, true);
  assert.equal(game.suddenDeathTeams.length, 2);
});

test('GameState serialization and deserialization', () => {
  const game = new GameState({
    teams: [
      { name: 'Lag 1', color: '#3b82f6' },
      { name: 'Lag 2', color: '#ef4444' }
    ],
    targetScore: 30,
    roundTime: 45,
    passPenalty: false
  });
  game.teams[0].score = 15;
  game.currentTeamIndex = 1;
  game.roundNumber = 3;

  const json = game.toJSON();
  const restored = GameState.fromJSON(json);

  assert.equal(restored.teams[0].score, 15);
  assert.equal(restored.currentTeamIndex, 1);
  assert.equal(restored.roundNumber, 3);
  assert.equal(restored.passPenalty, false);
});
