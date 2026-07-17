import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, mergeLetterStates, Game } from '../js/game.js';
import { STATE, COLS, ROWS } from '../js/config.js';

const { CORRECT, PRESENT, ABSENT } = STATE;

const LETTER = { [CORRECT]: 'c', [PRESENT]: 'p', [ABSENT]: 'a' };

/** Compact notation: c=correct, p=present, a=absent. */
const score = (guess, answer) => evaluate(guess, answer).map((s) => LETTER[s]).join('');

const BASE_WORDS = ['crane', 'stoke', 'audio', 'cross', 'sheep', 'peels'];

const makeWordList = (extra = []) => ({
  answers: ['crane'],
  isAllowed: (w) => [...BASE_WORDS, ...extra].includes(w),
  pick: () => 'crane',
  random: () => 'crane',
});

const newGame = (answer = 'crane', extra = []) =>
  new Game({ answer, wordList: makeWordList(extra) });

test('evaluate: all correct', () => {
  assert.equal(score('crane', 'crane'), 'ccccc');
});

test('evaluate: nothing in common', () => {
  assert.equal(score('stump', 'chief'), 'aaaaa');
});

test('evaluate: a present letter in the wrong place', () => {
  assert.equal(score('audio', 'crane'), 'paaaa');
});

/* The duplicate-letter rules are where naive scorers go wrong, and they're the
   whole reason evaluate() makes two passes instead of one. */

test('evaluate: exact matches claim their letter before present ones do', () => {
  // answer 'those' has one e, at index 4. The guess has three.
  // The aligned e takes it; the other two must find nothing left.
  assert.equal(score('geese', 'those'), 'aaacc');
});

test('evaluate: a repeated guess letter only claims as many as the answer holds', () => {
  // answer 'khaki' has one a (index 2). Guess 'kayak' has a at 1 and 3.
  // Exactly one may be credited — the first to ask.
  assert.equal(score('kayak', 'khaki'), 'cpaap');
});

test('evaluate: leftovers are still available to a later duplicate', () => {
  // answer 'sheep' has two e. Guess 'peels' has two: one aligns, one claims the spare.
  assert.equal(score('peels', 'sheep'), 'ppcap');
});

test('evaluate: a duplicate next to an exact match gets nothing', () => {
  // answer 'above' has one b, at index 1, taken exactly. The b at 2 goes hungry.
  assert.equal(score('abbey', 'above'), 'ccapa');
});

test('evaluate: result length always matches the board width', () => {
  assert.equal(evaluate('abbey', 'crane').length, COLS);
});

test('mergeLetterStates: a key never downgrades once correct', () => {
  let map = mergeLetterStates({}, 'aaaaa', [CORRECT, ABSENT, ABSENT, ABSENT, ABSENT]);
  assert.equal(map.a, CORRECT);
  map = mergeLetterStates(map, 'aaaaa', new Array(5).fill(PRESENT));
  assert.equal(map.a, CORRECT, 'present must not demote a green key');
});

test('mergeLetterStates: absent upgrades to present', () => {
  let map = mergeLetterStates({}, 'zzzzz', new Array(5).fill(ABSENT));
  assert.equal(map.z, ABSENT);
  map = mergeLetterStates(map, 'zzzzz', new Array(5).fill(PRESENT));
  assert.equal(map.z, PRESENT);
});

test('Game: rejects a short guess', () => {
  const g = newGame();
  g.current = 'cra';
  const out = g.submit();
  assert.equal(out.ok, false);
  assert.match(out.reason, /Not enough letters/);
});

test('Game: rejects a word outside the list', () => {
  const g = newGame();
  g.current = 'zzzzz';
  const out = g.submit();
  assert.equal(out.ok, false);
  assert.match(out.reason, /Not in word list/);
});

test('Game: winning sets status and records the guess', () => {
  const g = newGame();
  g.current = 'crane';
  assert.equal(g.submit().ok, true);
  assert.equal(g.status, 'won');
  assert.deepEqual(g.guesses, ['crane']);
});

test('Game: loses after exactly ROWS guesses', () => {
  const g = newGame();
  for (let i = 0; i < ROWS; i++) {
    assert.equal(g.status, 'playing', `still playing before guess ${i + 1}`);
    g.current = 'stoke';
    g.submit();
  }
  assert.equal(g.status, 'lost');
  assert.equal(g.guesses.length, ROWS);
});

test('Game: accepts no input once the round is over', () => {
  const g = newGame();
  g.current = 'crane';
  g.submit();
  assert.equal(g.addLetter('a'), false);
  assert.equal(g.removeLetter(), false);
  assert.equal(g.submit().ok, false);
});

test('hint: never reveals a position already guessed correctly', () => {
  for (let run = 0; run < 200; run++) {
    const g = newGame();
    g.current = 'cross';
    g.submit(); // pins c@0 and r@1
    const solved = g.solvedPositions();
    assert.deepEqual([...solved].sort(), [0, 1]);

    for (let i = 0; i < COLS; i++) {
      const h = g.hint();
      if (!h.ok) break;
      assert.ok(!solved.has(h.position), 'hint landed on an already-solved position');
      assert.equal(h.letter, 'crane'[h.position], 'hint revealed the wrong letter');
    }
  }
});

test('hint: never repeats a position, and exhausts cleanly', () => {
  const g = newGame();
  const seen = new Set();
  for (let i = 0; i < COLS; i++) {
    const h = g.hint();
    assert.equal(h.ok, true);
    assert.ok(!seen.has(h.position), 'hint repeated a position');
    seen.add(h.position);
  }
  const out = g.hint();
  assert.equal(out.ok, false);
  assert.match(out.reason, /Nothing left/);
});

test('hint: marks the round assisted', () => {
  const g = newGame();
  assert.equal(g.assisted, false);
  g.hint();
  assert.equal(g.assisted, true);
});

test('reveal: ends as a loss without polluting the guess history', () => {
  const g = newGame();
  g.current = 'stoke';
  g.submit();

  const out = g.reveal();
  assert.equal(out.ok, true);
  assert.equal(g.status, 'lost');
  assert.equal(g.revealedWord, 'crane');
  // A revealed word is not a guess. If it were recorded, the result pattern
  // would gain a fake all-green row and a skipped round would read as a win.
  assert.deepEqual(g.guesses, ['stoke']);
  assert.equal(g.results.length, 1);
});

test('hard mode: a known correct letter must stay in place', () => {
  const g = newGame();
  g.hardMode = true;
  g.current = 'cross';
  g.submit(); // c@0 and r@1 are now known

  g.current = 'stoke';
  const out = g.submit();
  assert.equal(out.ok, false);
  assert.match(out.reason, /1st letter must be C/);
});

test('hard mode: a known present letter must be reused', () => {
  const g = newGame();
  g.hardMode = true;
  g.current = 'audio';
  g.submit(); // 'a' is present

  g.current = 'sheep';
  const out = g.submit();
  assert.equal(out.ok, false);
  assert.match(out.reason, /must contain A/);
});

test('hard mode: a legal guess still passes', () => {
  const g = newGame();
  g.hardMode = true;
  g.current = 'cross';
  g.submit();
  g.current = 'crane';
  assert.equal(g.submit().ok, true);
});

test('hard mode: off by default, and enforces nothing when off', () => {
  const g = newGame();
  assert.equal(g.hardMode, false);
  g.current = 'cross';
  g.submit();
  g.current = 'stoke';
  assert.equal(g.submit().ok, true);
});

test('toJSON/fromJSON: round-trips a game in progress', () => {
  const g = newGame();
  g.current = 'stoke';
  g.submit();
  g.hint();

  const restored = Game.fromJSON(JSON.parse(JSON.stringify(g.toJSON())), makeWordList());
  assert.equal(restored.answer, g.answer);
  assert.deepEqual(restored.guesses, g.guesses);
  assert.deepEqual(restored.results, g.results);
  assert.deepEqual([...restored.hints], [...g.hints]);
  assert.equal(restored.assisted, true);
  assert.deepEqual(restored.letterStates, g.letterStates);
});

test('toJSON/fromJSON: round-trips a skipped game', () => {
  const g = newGame();
  g.current = 'stoke';
  g.submit();
  g.reveal();

  const restored = Game.fromJSON(JSON.parse(JSON.stringify(g.toJSON())), makeWordList());
  assert.equal(restored.status, 'lost');
  assert.equal(restored.revealedWord, 'crane');
  assert.deepEqual(restored.guesses, ['stoke']);
});

test('fromJSON: replays guesses that are no longer in the word list', () => {
  // The list can change under a saved game; a guess that was legal when it was
  // made must survive the restore.
  const restored = Game.fromJSON(
    { answer: 'crane', guesses: ['xxxxx'], status: 'playing' },
    makeWordList()
  );
  assert.deepEqual(restored.guesses, ['xxxxx']);
});

test('fromJSON: infers assisted from hints saved before the flag existed', () => {
  const restored = Game.fromJSON(
    { answer: 'crane', guesses: [], status: 'playing', hints: [2] },
    makeWordList()
  );
  assert.equal(restored.assisted, true);
});
