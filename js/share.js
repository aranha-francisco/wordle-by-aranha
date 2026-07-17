import { EMOJI, ROWS } from './config.js';

export function buildShareText(game) {
  const score = game.status === 'won' ? game.guesses.length : 'X';
  const title = game.mode === 'daily' ? `Wordle ${game.dayIndex}` : 'Wordle (practice)';
  const grid = game.results.map((row) => row.map((s) => EMOJI[s]).join('')).join('\n');
  return `${title} ${score}/${ROWS}\n\n${grid}`;
}

/** Clipboard API needs a secure context; fall back to a hidden textarea otherwise. */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
