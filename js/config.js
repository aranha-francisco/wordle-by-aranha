// Central knobs. Anything a future "custom word list / theme" mode would touch lives here.
export const ROWS = 6;
export const COLS = 5;

// Animation timings must match css/styles.css (--flip-ms, --flip-stagger-ms).
export const FLIP_MS = 300;
export const FLIP_STAGGER_MS = 100;

// v2 dropped the daily-word schema; a v1 payload is discarded on read.
export const STORAGE_KEY = 'wordle.v2';

export const STATE = { CORRECT: 'correct', PRESENT: 'present', ABSENT: 'absent' };

export const EMOJI = {
  [STATE.CORRECT]: '\u{1F7E9}',
  [STATE.PRESENT]: '\u{1F7E8}',
  [STATE.ABSENT]: '\u{2B1B}',
};
