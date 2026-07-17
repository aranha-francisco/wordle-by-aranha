const LAYOUT = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['Enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'Backspace'],
];

const LABELS = { Enter: 'Enter', Backspace: 'Del' };

export class Keyboard {
  /** @param {(key: string) => void} onKey */
  constructor(root, onKey) {
    this.root = root;
    this.keys = new Map();
    this.build();

    // Pointer, not click: keeps response immediate on iOS without a hover state.
    this.root.addEventListener('pointerup', (e) => {
      const btn = e.target.closest('.key');
      if (btn) onKey(btn.dataset.key);
    });
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  build() {
    this.root.replaceChildren();
    for (const row of LAYOUT) {
      const rowEl = document.createElement('div');
      rowEl.className = 'krow';
      for (const key of row) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'key';
        btn.dataset.key = key;
        btn.textContent = LABELS[key] || key;
        if (key.length > 1) btn.dataset.wide = 'true';
        btn.setAttribute('aria-label', key === 'Backspace' ? 'Backspace' : key);
        rowEl.appendChild(btn);
        this.keys.set(key, btn);
      }
      this.root.appendChild(rowEl);
    }
  }

  render(letterStates) {
    for (const [key, btn] of this.keys) {
      if (key.length > 1) continue;
      const state = letterStates[key];
      if (state) btn.dataset.state = state;
      else delete btn.dataset.state;
    }
  }
}
