import test from 'node:test';
import assert from 'node:assert/strict';
import { RoundTimer } from '../js/timer.js';

test('RoundTimer ticks based on elapsed time without drift', () => {
  let currentTime = 1000;
  const now = () => currentTime;
  const ticks = [];
  let expired = false;

  const timer = new RoundTimer({
    now,
    setInterval: () => 1,
    clearInterval: () => {},
    onSecond: (sec) => ticks.push(sec),
    onExpire: () => { expired = true; }
  });

  timer.start(5);
  assert.equal(timer.secondsLeft, 5);

  currentTime += 1000;
  timer.tick();
  assert.equal(timer.secondsLeft, 4);

  currentTime += 2000;
  timer.tick();
  assert.equal(timer.secondsLeft, 2);

  currentTime += 2000;
  timer.tick();
  assert.equal(timer.secondsLeft, 0);
  assert.equal(expired, true);
  assert.deepEqual(ticks, [4, 2, 0]);
});

test('RoundTimer handles pause and resume accurately', () => {
  let currentTime = 1000;
  const now = () => currentTime;
  let expired = false;

  const timer = new RoundTimer({
    now,
    setInterval: () => 1,
    clearInterval: () => {},
    onExpire: () => { expired = true; }
  });

  timer.start(10);
  currentTime += 4000; // 4 seconds pass
  timer.tick();
  assert.equal(timer.secondsLeft, 6);

  timer.pause();
  currentTime += 50000; // lots of time passes while paused
  timer.tick(); // should do nothing because paused
  assert.equal(timer.secondsLeft, 6);
  assert.equal(expired, false);

  timer.resume();
  currentTime += 2000; // 2 seconds pass after resume
  timer.tick();
  assert.equal(timer.secondsLeft, 4);
});
