import { STORAGE_KEY, ROWS } from './config.js';

const emptyStats = () => ({
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  distribution: new Array(ROWS).fill(0),
});

const defaults = () => ({ stats: emptyStats(), game: null });

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    return { ...defaults(), ...parsed, stats: { ...emptyStats(), ...(parsed.stats || {}) } };
  } catch {
    return defaults();
  }
}

function write(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Private mode or quota exhausted — the game still plays, it just won't persist.
  }
}

export function loadStats() { return read().stats; }

/** The in-progress game, so a reload doesn't lose the current board. */
export function loadGame() { return read().game; }

export function saveGame(game) {
  const data = read();
  data.game = game.toJSON();
  write(data);
}

export function clearGame() {
  const data = read();
  data.game = null;
  write(data);
}

/** Records a finished game. Streak is consecutive wins — every game counts. */
export function recordResult({ won, guessCount }) {
  const data = read();
  const stats = data.stats;

  stats.played += 1;
  if (won) {
    stats.wins += 1;
    stats.distribution[guessCount - 1] += 1;
    stats.currentStreak += 1;
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
  } else {
    stats.currentStreak = 0;
  }

  write(data);
  return stats;
}
