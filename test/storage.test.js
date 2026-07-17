import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * storage.js reads localStorage lazily inside each function, never at module
 * load, so a stub installed here is enough — no jsdom required.
 */
class MemoryStorage {
  #map = new Map();
  getItem(k) { return this.#map.has(k) ? this.#map.get(k) : null; }
  setItem(k, v) { this.#map.set(k, String(v)); }
  removeItem(k) { this.#map.delete(k); }
  clear() { this.#map.clear(); }
}

globalThis.localStorage = new MemoryStorage();

const { loadStats, loadSettings, saveSettings, loadGame, saveGame, clearGame, recordResult } =
  await import('../js/storage.js');
const { STORAGE_KEY } = await import('../js/config.js');

const reset = () => localStorage.clear();

const play = (opts) => recordResult({ guessCount: 3, ...opts });

test('stats start empty', () => {
  reset();
  const s = loadStats();
  assert.equal(s.played, 0);
  assert.equal(s.wins, 0);
  assert.equal(s.currentStreak, 0);
  assert.equal(s.maxStreak, 0);
  assert.deepEqual(s.distribution, [0, 0, 0, 0, 0, 0]);
});

test('an unaided win extends the streak and the distribution', () => {
  reset();
  const s = play({ won: true, guessCount: 3 });
  assert.equal(s.played, 1);
  assert.equal(s.wins, 1);
  assert.equal(s.currentStreak, 1);
  assert.equal(s.maxStreak, 1);
  assert.equal(s.distribution[2], 1, 'a 3-guess win lands in bucket 3');
});

test('a loss breaks the streak but keeps max', () => {
  reset();
  play({ won: true });
  play({ won: true });
  const s = play({ won: false });
  assert.equal(s.played, 3);
  assert.equal(s.wins, 2);
  assert.equal(s.currentStreak, 0);
  assert.equal(s.maxStreak, 2);
});

/* The incentive rules. A hint costs the streak — otherwise you could hint your
   way past every hard word and the streak would never break, which would make
   it meaningless. */

test('an assisted win resets the streak', () => {
  reset();
  play({ won: true });
  assert.equal(loadStats().currentStreak, 1);

  const s = play({ won: true, assisted: true });
  assert.equal(s.currentStreak, 0, 'a hint ends the streak exactly like a loss');
});

test('an assisted win still counts in played and wins, so win% stays honest', () => {
  reset();
  const s = play({ won: true, assisted: true });
  assert.equal(s.played, 1);
  assert.equal(s.wins, 1);
});

test('an assisted win is excluded from the distribution', () => {
  reset();
  const s = play({ won: true, guessCount: 4, assisted: true });
  assert.deepEqual(s.distribution, [0, 0, 0, 0, 0, 0],
    'the histogram means "solved unaided in N"');
});

test('hints cannot be used as a streak shield', () => {
  reset();
  play({ won: true });
  play({ won: true });
  play({ won: true });
  assert.equal(loadStats().currentStreak, 3);

  // Stuck on a hard word? A hint does not preserve the run.
  play({ won: true, assisted: true });
  assert.equal(loadStats().currentStreak, 0);
  assert.equal(loadStats().maxStreak, 3);
});

test('maxStreak survives later resets', () => {
  reset();
  for (let i = 0; i < 5; i++) play({ won: true });
  assert.equal(loadStats().maxStreak, 5);
  play({ won: false });
  assert.equal(loadStats().currentStreak, 0);
  assert.equal(loadStats().maxStreak, 5);
});

test('settings default to dark, crimson, normal contrast, hard mode off', () => {
  reset();
  const s = loadSettings();
  assert.equal(s.theme, 'dark');
  assert.equal(s.accent, 'crimson');
  assert.equal(s.contrast, 'normal');
  assert.equal(s.hardMode, false);
});

test('saveSettings merges rather than replaces', () => {
  reset();
  saveSettings({ theme: 'light' });
  const s = saveSettings({ accent: 'teal' });
  assert.equal(s.theme, 'light', 'an earlier key survives a later patch');
  assert.equal(s.accent, 'teal');
  assert.equal(s.hardMode, false, 'untouched defaults remain');
});

test('unknown settings from a newer build are preserved, not dropped', () => {
  reset();
  saveSettings({ future: 'value' });
  assert.equal(loadSettings().future, 'value');
});

test('a saved game round-trips and clears', () => {
  reset();
  saveGame({ toJSON: () => ({ answer: 'crane', guesses: ['stoke'] }) });
  assert.deepEqual(loadGame(), { answer: 'crane', guesses: ['stoke'] });
  clearGame();
  assert.equal(loadGame(), null);
});

test('saving a game does not disturb stats or settings', () => {
  reset();
  play({ won: true });
  saveSettings({ theme: 'light' });
  saveGame({ toJSON: () => ({ answer: 'crane' }) });

  assert.equal(loadStats().wins, 1);
  assert.equal(loadSettings().theme, 'light');
});

test('corrupt storage falls back to defaults instead of throwing', () => {
  reset();
  localStorage.setItem(STORAGE_KEY, '{not json');
  assert.equal(loadStats().played, 0);
  assert.equal(loadSettings().theme, 'dark');
  assert.equal(loadGame(), null);
});

test('a payload missing whole sections still yields complete defaults', () => {
  reset();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ stats: { played: 4 } }));
  const s = loadStats();
  assert.equal(s.played, 4, 'the known field survives');
  assert.equal(s.maxStreak, 0, 'missing fields are filled in');
  assert.deepEqual(s.distribution, [0, 0, 0, 0, 0, 0]);
  assert.equal(loadSettings().accent, 'crimson');
});
