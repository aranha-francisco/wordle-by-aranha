import { Game } from './game.js';
import { defaultWordList } from './words.js';
import { Board } from './ui/board.js';
import { Keyboard } from './ui/keyboard.js';
import { Modal } from './ui/modal.js';
import { SettingsModal } from './ui/settings-modal.js';
import { toast } from './ui/toast.js';
import { playIntro } from './ui/intro.js';
import { applySettings, getSettings } from './settings.js';
import { loadStats, loadGame, saveGame, recordResult } from './storage.js';

const wordList = defaultWordList;

let game;
let stats = loadStats();
let locked = false;        // true while a row is mid-flip, or while the intro plays
let skipMode = 'skip';     // 'skip' while playing; 'new' once the result is dismissed

const board = new Board(document.getElementById('board'));
const keyboard = new Keyboard(document.getElementById('keyboard'), handleKey);
const modal = new Modal({ onNewGame: startGame, onClose: handleResultClosed });
const settingsModal = new SettingsModal({
  onChange: (settings) => { if (game) game.hardMode = settings.hardMode; },
  // Flipping hard mode mid-round would change the rules of a game already
  // underway, so the control waits for the next one.
  isHardModeLocked: () => Boolean(game) && !game.isOver && game.guesses.length > 0,
});
const skipBtn = document.getElementById('btn-skip');
const hintBtn = document.getElementById('btn-hint');
const settingsBtn = document.getElementById('btn-settings');

// The inline script in index.html already set these before first paint; this
// keeps the meta theme-color in step and covers a blocked-storage first run.
applySettings(getSettings());

skipBtn.addEventListener('click', () => (skipBtn.dataset.mode === 'new' ? startGame() : skip()));
hintBtn.addEventListener('click', hint);
settingsBtn.addEventListener('click', () => {
  pulseIcon(settingsBtn);
  settingsModal.show();
});

/**
 * The skip bar doubles as the way out of a finished round: once the result modal
 * is dismissed there'd otherwise be no route to a new game short of a reload.
 *
 * Driven by the modal closing rather than by game.isOver. The round is already
 * over while the final row is still flipping and while the modal covers the
 * board, so keying off isOver would swap the label early — behind the scrim,
 * where the morph can't be seen and has nothing left to animate by the time it
 * matters.
 *
 * @param {'skip'|'new'} mode
 */
function setSkipMode(mode, animate = false) {
  const changed = skipMode !== mode;
  skipMode = mode;

  // Written every call, not just on change: render() re-asserts the current mode,
  // and skipping the write would let the DOM keep a stale label.
  skipBtn.dataset.mode = mode;
  skipBtn.textContent = mode === 'new' ? 'New game' : 'Skip';
  if (changed && animate) pulse(skipBtn, SKIP_MORPH_MS, 'morph');

  // Still "Skip" on a finished board: the round ended while the modal was up, so
  // there's nothing left to skip until it's been dismissed.
  skipBtn.disabled = locked || (mode === 'skip' && game.isOver);
}

/** Result modal dismissed: the board is on show, so offer the way forward. */
function handleResultClosed() {
  if (game?.isOver) setSkipMode('new', true);
}

function render() {
  board.render(game);
  keyboard.render(game.letterStates);
  setSkipMode(skipMode);
  hintBtn.disabled = game.isOver || locked;
}

/** Random word, but never the same one twice in a row. */
function nextAnswer() {
  const previous = game?.answer;
  let answer = wordList.random();
  while (wordList.answers.length > 1 && answer === previous) answer = wordList.random();
  return answer;
}

function startGame() {
  game = new Game({ answer: nextAnswer(), wordList });
  game.hardMode = getSettings().hardMode;
  locked = false;
  skipMode = 'skip';
  saveGame(game);
  // hide() before render(): hiding fires onClose, which would otherwise flip the
  // fresh round's button straight back to "New game".
  modal.hide();
  render();
}

/** Resume an unfinished board across reloads; otherwise deal a fresh word. */
function restoreOrStart() {
  const saved = loadGame();
  if (!saved) return startGame();

  game = Game.fromJSON(saved, wordList);
  game.hardMode = getSettings().hardMode;
  modal.hide();
  render();
}

/**
 * Lay the board out, then play the intro over it. Input stays locked until the
 * intro finishes so keystrokes can't land on a board that isn't visible yet,
 * and a restored finished game holds its modal back until the reveal is done.
 */
async function boot() {
  // Lock before the first await: the font wait below is a real gap during which
  // the board is laid out but not yet revealed, and keys would otherwise land.
  locked = true;
  restoreOrStart();

  // Measure the header only once Rubik is applied — fallback metrics would give
  // a different header height and a slightly wrong travel distance.
  await document.fonts.ready;

  await playIntro(document.querySelector('.app'), document.querySelector('.header'));
  locked = false;

  if (game.isOver) modal.show(game, stats);
}

function handleKey(key) {
  if (locked || !game || game.isOver) return;

  if (key === 'Enter') return submit();

  if (key === 'Backspace') {
    if (game.removeLetter()) render();
    return;
  }

  if (/^[a-zA-Z]$/.test(key)) {
    const col = game.current.length;
    if (game.addLetter(key)) {
      render();
      board.popTile(game.row, col);
    }
  }
}

async function submit() {
  const rowIndex = game.row;
  const word = game.current;
  const priorLetterStates = game.letterStates;
  const outcome = game.submit();

  if (!outcome.ok) {
    toast(outcome.reason);
    board.shakeRow(rowIndex);
    return;
  }

  saveGame(game);

  locked = true;
  keyboard.render(priorLetterStates); // hold the new key colours until the row lands
  await board.revealRow(rowIndex, word, outcome.result);
  locked = false;

  render();
  if (game.isOver) finish();
}

const SKIP_PULSE_MS = 280; // must match skip-pulse in styles.css
const SKIP_MORPH_MS = 340; // must match skip-morph
const ICON_PULSE_MS = 320; // must match icon-press / icon-fill / icon-tint

/** Restart-safe press animation; the element may be disabled mid-play. */
function pulse(el, ms, name = 'pulse') {
  el.dataset.anim = '';
  void el.offsetWidth; // force reflow so the animation restarts
  el.dataset.anim = name;
  setTimeout(() => { el.dataset.anim = ''; }, ms);
}

const pulseSkip = () => pulse(skipBtn, SKIP_PULSE_MS);
const pulseIcon = (el) => pulse(el, ICON_PULSE_MS);

/** Reveal one letter the player hasn't already pinned down. */
function hint() {
  pulseIcon(hintBtn);
  if (locked || !game || game.isOver) return;

  const wasAssisted = game.assisted;
  const outcome = game.hint();
  if (!outcome.ok) {
    toast(outcome.reason);
    return;
  }

  // Say the price out loud the first time, rather than silently killing a streak.
  if (!wasAssisted) toast("Hint used — streak won't count", 1600);

  saveGame(game);
  render();
}

/** Give up: flip the answer into the next row, then end the round as a loss. */
async function skip() {
  if (locked || !game || game.isOver) return;

  const outcome = game.reveal();
  if (!outcome.ok) return;

  pulseSkip();

  saveGame(game);

  locked = true;
  render(); // disables the button for the duration of the flip
  await board.revealRow(outcome.row, outcome.word, outcome.result);
  locked = false;

  render();
  finish();
}

function finish() {
  const won = game.status === 'won';

  if (!game.statsRecorded) {
    stats = recordResult({ won, guessCount: game.guesses.length, assisted: game.assisted });
    game.statsRecorded = true;
    saveGame(game);
  }

  if (won) toast('Nice.', 900);
  setTimeout(() => modal.show(game, stats), won ? 600 : 900);
}

document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (settingsModal.isOpen) return; // don't type into the board behind the dialog
  if (modal.isOpen && e.key !== 'Escape') return;
  if (e.key === 'Enter' || e.key === 'Backspace' || /^[a-zA-Z]$/.test(e.key)) {
    e.preventDefault();
    handleKey(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  }
});

boot();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
