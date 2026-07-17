import { ROWS, COLS, FLIP_MS, FLIP_STAGGER_MS } from '../config.js';

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Board {
  constructor(root) {
    this.root = root;
    this.rows = [];
    this.build();
  }

  build() {
    this.root.style.setProperty('--cols', COLS);
    this.root.replaceChildren();
    this.rows = [];

    for (let r = 0; r < ROWS; r++) {
      const row = document.createElement('div');
      row.className = 'row';
      row.setAttribute('role', 'row');
      const tiles = [];
      for (let c = 0; c < COLS; c++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.setAttribute('role', 'gridcell');
        row.appendChild(tile);
        tiles.push(tile);
      }
      this.root.appendChild(row);
      this.rows.push({ el: row, tiles });
    }
  }

  /** Repaints everything from game state. Safe to call any time input is unlocked. */
  render(game) {
    for (let r = 0; r < ROWS; r++) {
      const { el, tiles } = this.rows[r];
      const isCurrent = r === game.row && !game.isOver;
      // A skipped round's answer lives outside `guesses`, so paint it from
      // revealedWord — otherwise this row would blank out on the next render.
      const isRevealed = Boolean(game.revealedWord) && r === game.guesses.length;

      let word = '';
      if (r < game.guesses.length) word = game.guesses[r];
      else if (isRevealed) word = game.revealedWord;
      else if (isCurrent) word = game.current;

      const result = game.results[r] || (isRevealed ? new Array(COLS).fill('correct') : null);

      el.dataset.active = String(isCurrent);

      tiles.forEach((tile, c) => {
        let letter = word[c] || '';

        // Hint ghost: show the revealed letter in the active row while that slot
        // is empty. Typing covers it; backspacing brings it back.
        const showHint = !letter && isCurrent && game.hints?.has(c);
        if (showHint) letter = game.answer[c];

        tile.textContent = letter;
        tile.dataset.filled = String(Boolean(letter) && !showHint);
        if (showHint) tile.dataset.hint = 'true';
        else delete tile.dataset.hint;

        if (result) tile.dataset.state = result[c];
        else delete tile.dataset.state;
      });
    }
  }

  /** Pop feedback on the tile that just received a letter. */
  popTile(rowIndex, colIndex) {
    const tile = this.rows[rowIndex]?.tiles[colIndex];
    if (!tile) return;
    tile.dataset.anim = '';
    void tile.offsetWidth; // restart the animation
    tile.dataset.anim = 'pop';
  }

  shakeRow(rowIndex) {
    const row = this.rows[rowIndex]?.el;
    if (!row) return;
    row.dataset.anim = '';
    void row.offsetWidth;
    row.dataset.anim = 'shake';
    setTimeout(() => { row.dataset.anim = ''; }, 400);
  }

  /**
   * Flips a row left to right, swapping in each result colour at the midpoint of
   * its own rotation. Resolves once the last tile has landed.
   */
  revealRow(rowIndex, word, result) {
    const { el, tiles } = this.rows[rowIndex];
    el.dataset.active = 'false';

    if (prefersReducedMotion()) {
      tiles.forEach((tile, c) => {
        tile.textContent = word[c];
        tile.dataset.filled = 'true';
        delete tile.dataset.hint;
        tile.dataset.state = result[c];
      });
      return Promise.resolve();
    }

    const timers = [];
    const done = new Promise((resolve) => {
      tiles.forEach((tile, c) => {
        const delay = c * FLIP_STAGGER_MS;
        tile.textContent = word[c];
        tile.dataset.filled = 'true';
        delete tile.dataset.hint; // a skip reveal can land on a hinted slot
        tile.dataset.anim = '';

        timers.push(setTimeout(() => {
          void tile.offsetWidth;
          tile.dataset.anim = 'flip';
          // Halfway through the rotation the tile is edge-on: swap the colour there.
          timers.push(setTimeout(() => { tile.dataset.state = result[c]; }, FLIP_MS / 2));
          if (c === COLS - 1) timers.push(setTimeout(resolve, FLIP_MS));
        }, delay));
      });
    });

    return done.then(() => {
      tiles.forEach((tile) => { tile.dataset.anim = ''; });
    });
  }
}
