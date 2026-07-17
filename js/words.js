import { ANSWERS, EXTRA_GUESSES } from './data/words-data.js';

export { ANSWERS, EXTRA_GUESSES };

/**
 * Bundles an answer pool with the set of accepted guesses.
 * Custom-list mode: call createWordList(myAnswers) and hand the result to the game.
 */
export function createWordList(answers = ANSWERS, extraGuesses = EXTRA_GUESSES) {
  const pool = [...new Set(answers.map((w) => w.toLowerCase()))];
  const allowed = new Set([...pool, ...extraGuesses.map((w) => w.toLowerCase())]);
  return {
    answers: pool,
    isAllowed: (word) => allowed.has(word.toLowerCase()),
    pick: (index) => pool[index % pool.length],
    random: () => pool[Math.floor(Math.random() * pool.length)],
  };
}

export const defaultWordList = createWordList();
