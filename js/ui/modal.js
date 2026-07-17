import { createFocusTrap } from './focus-trap.js';

export class Modal {
  /**
   * @param {object} opts
   * @param {() => void} opts.onNewGame
   * @param {() => void} [opts.onClose] fires whenever the result modal is dismissed
   */
  constructor({ onNewGame, onClose }) {
    this.overlay = document.getElementById('overlay');
    this.card = this.overlay.querySelector('.modal');
    this.eyebrowEl = document.getElementById('modal-eyebrow');
    this.wordEl = document.getElementById('modal-word');
    this.noteEl = document.getElementById('modal-note');
    this.patternEl = document.getElementById('modal-pattern');
    this.statsEl = document.getElementById('modal-stats');
    this.newBtn = document.getElementById('btn-new');
    this.closeBtn = document.getElementById('btn-modal-close');
    this.onClose = onClose;
    this.trap = createFocusTrap(this.card);

    this.newBtn.addEventListener('click', onNewGame);
    this.closeBtn.addEventListener('click', () => this.hide());

    // Dismissible so the finished board can be reviewed. Closing isn't a dead end:
    // main.js turns the skip bar into "New game" on close, so there's always a
    // way to start the next round without a reload.
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.hide();
    });
  }

  get isOpen() { return !this.overlay.hidden; }

  show(game, stats) {
    const won = game.status === 'won';
    const tries = game.guesses.length;

    // The label sits above the word and never repeats it — "the word was WEIGH"
    // under a big WEIGH said the same thing twice.
    this.eyebrowEl.textContent = won
      ? `solved in ${tries} ${tries === 1 ? 'try' : 'tries'}`
      : 'the word was';
    this.wordEl.textContent = game.answer;

    // Be upfront about why a won round didn't move the streak.
    const assisted = Boolean(game.assisted);
    this.noteEl.textContent = assisted ? 'hint used — streak reset' : '';
    this.noteEl.hidden = !assisted;

    this.renderPattern(game.results);
    this.renderStats(stats);

    this.overlay.hidden = false;
    this.trap.activate();
    this.newBtn.focus({ preventScroll: true });
  }

  hide() {
    if (!this.isOpen) return;
    this.overlay.hidden = true;
    this.trap.release();
    this.onClose?.();
  }

  renderPattern(results) {
    this.patternEl.replaceChildren();
    for (const row of results) {
      const rowEl = document.createElement('div');
      rowEl.className = 'pattern-row';
      for (const state of row) {
        const sq = document.createElement('div');
        sq.className = 'sq';
        sq.dataset.state = state;
        rowEl.appendChild(sq);
      }
      this.patternEl.appendChild(rowEl);
    }
  }

  renderStats(stats) {
    const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
    const items = [
      ['Played', stats.played],
      ['Win %', winPct],
      ['Streak', stats.currentStreak],
      ['Max', stats.maxStreak],
    ];

    this.statsEl.replaceChildren();
    for (const [label, value] of items) {
      const el = document.createElement('div');
      el.className = 'stat';
      el.innerHTML = `<div class="stat-value"></div><div class="stat-label"></div>`;
      el.querySelector('.stat-value').textContent = value;
      el.querySelector('.stat-label').textContent = label;
      this.statsEl.appendChild(el);
    }
  }
}
