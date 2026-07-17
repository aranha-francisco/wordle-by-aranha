const LAYOUT = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  // Enter sits on the right, matching a physical keyboard; backspace on the left.
  ['Backspace', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'Enter'],
];

// Inline so they inherit currentColor and ship offline with no extra request.
// Both are 24x24 line icons, drawn to match the keyboard's weight.
const SVG = (paths) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"` +
  ` stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const ICONS = {
  // backspace: tag shape with an x inside
  Backspace: SVG(
    '<path d="M21 4H8.5a1 1 0 0 0-.75.34l-5.3 6a1 1 0 0 0 0 1.32l5.3 6a1 1 0 0 0 .75.34H21a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>' +
    '<line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>'
  ),
  // enter: arrow down then left
  Enter: SVG('<polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>'),
};

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
        // ICONS values are module constants, never user input
        if (ICONS[key]) btn.innerHTML = ICONS[key];
        else btn.textContent = key;
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
