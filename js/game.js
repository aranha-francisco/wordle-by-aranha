import { ROWS, COLS, STATE } from './config.js';

/**
 * Scores a guess against the answer, handling repeated letters the standard way:
 * exact matches are claimed first, then remaining letters fill in as "present".
 */
export function evaluate(guess, answer) {
  const result = new Array(COLS).fill(STATE.ABSENT);
  const pool = {};

  for (let i = 0; i < COLS; i++) {
    if (guess[i] === answer[i]) {
      result[i] = STATE.CORRECT;
    } else {
      pool[answer[i]] = (pool[answer[i]] || 0) + 1;
    }
  }

  for (let i = 0; i < COLS; i++) {
    if (result[i] === STATE.CORRECT) continue;
    if (pool[guess[i]] > 0) {
      result[i] = STATE.PRESENT;
      pool[guess[i]]--;
    }
  }

  return result;
}

const RANK = { [STATE.ABSENT]: 0, [STATE.PRESENT]: 1, [STATE.CORRECT]: 2 };

/** A key never downgrades: once green it stays green. */
export function mergeLetterStates(map, guess, result) {
  const next = { ...map };
  for (let i = 0; i < guess.length; i++) {
    const letter = guess[i];
    const current = next[letter];
    if (!current || RANK[result[i]] > RANK[current]) next[letter] = result[i];
  }
  return next;
}

/**
 * Pure game state. Knows nothing about the DOM — the UI reads it after each submit.
 */
export class Game {
  constructor({ answer, wordList }) {
    this.answer = answer.toLowerCase();
    this.wordList = wordList;
    this.guesses = [];      // submitted words
    this.results = [];      // parallel array of state arrays
    this.current = '';      // in-progress row
    this.status = 'playing'; // 'playing' | 'won' | 'lost'
    this.letterStates = {};
    this.statsRecorded = false; // guards against double-counting across reloads
  }

  get row() { return this.guesses.length; }
  get isOver() { return this.status !== 'playing'; }

  addLetter(letter) {
    if (this.isOver || this.current.length >= COLS) return false;
    this.current += letter.toLowerCase();
    return true;
  }

  removeLetter() {
    if (this.isOver || !this.current.length) return false;
    this.current = this.current.slice(0, -1);
    return true;
  }

  /** @returns {{ok: true, result: string[], status: string} | {ok: false, reason: string}} */
  submit() {
    if (this.isOver) return { ok: false, reason: 'Game over' };
    if (this.current.length < COLS) return { ok: false, reason: 'Not enough letters' };
    if (!this.wordList.isAllowed(this.current)) return { ok: false, reason: 'Not in word list' };

    const guess = this.current;
    const result = evaluate(guess, this.answer);

    this.guesses.push(guess);
    this.results.push(result);
    this.letterStates = mergeLetterStates(this.letterStates, guess, result);
    this.current = '';

    if (guess === this.answer) this.status = 'won';
    else if (this.guesses.length >= ROWS) this.status = 'lost';

    return { ok: true, result, status: this.status };
  }

  toJSON() {
    return {
      answer: this.answer,
      guesses: this.guesses,
      status: this.status,
      statsRecorded: this.statsRecorded,
    };
  }

  static fromJSON(data, wordList) {
    const game = new Game({ answer: data.answer, wordList });
    // Replay past guesses without re-validating them: the list may have changed
    // since they were saved, and they were legal when they were made.
    game.wordList = { ...wordList, isAllowed: () => true };
    for (const guess of data.guesses || []) {
      game.current = guess;
      game.submit();
    }
    game.wordList = wordList;
    game.statsRecorded = Boolean(data.statsRecorded);
    return game;
  }
}
