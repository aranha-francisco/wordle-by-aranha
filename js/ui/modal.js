export class Modal {
  constructor({ onNewGame }) {
    this.overlay = document.getElementById('overlay');
    this.wordEl = document.getElementById('modal-word');
    this.subEl = document.getElementById('modal-sub');
    this.patternEl = document.getElementById('modal-pattern');
    this.statsEl = document.getElementById('modal-stats');
    this.newBtn = document.getElementById('btn-new');

    this.newBtn.addEventListener('click', onNewGame);

    // Tapping the dimmed backdrop closes; the board stays exactly as it was.
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

    this.wordEl.textContent = game.answer;
    this.subEl.textContent = won
      ? `solved in ${tries} ${tries === 1 ? 'try' : 'tries'}`
      : `the word was ${game.answer.toUpperCase()}`;

    this.renderPattern(game.results);
    this.renderStats(stats);

    this.overlay.hidden = false;
    this.newBtn.focus({ preventScroll: true });
  }

  hide() { this.overlay.hidden = true; }

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
