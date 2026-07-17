const LAYOUT = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  // Enter sits on the right, matching a physical keyboard; backspace on the left.
  ['Backspace', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'Enter'],
];

/* Key icons. Inline so they inherit currentColor and ship offline.
 *
 * Drawn on an explicit grid rather than borrowed from an icon set, because the
 * stock paths were neither centred nor weight-matched to the type:
 *
 * - Stroke 2.48 user units. The svg is sized in em, so it scales 1:1 with the
 *   key's font-size: at 13px the icon renders 20.8px wide, putting the stroke at
 *   2.48 * 20.8/24 = 2.15px — exactly Rubik 600's stem at 13px (measured). Both
 *   sides of that ratio are font-relative, so they stay matched if --fs-key moves.
 * - Both icons: ink 14 units tall, ~17-18 wide, centred on (12, 12).
 * - Every corner that reads as a corner is 90 degrees: the backspace tip, its box
 *   corners (r2 arcs) and the enter arrowhead all match.
 * - miter joins keep the arrowhead as crisp as the box corner instead of blobbing.
 * - Geometry is nudged +0.26 in x: a 90-degree miter overshoots its vertex by
 *   (stroke/2)/sin(45) = 1.75 units, and both icons point left, so without the
 *   nudge the painted ink sits a quarter unit left of centre.
 */
const SVG = (paths) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.48"` +
  ` stroke-linecap="round" stroke-linejoin="miter" aria-hidden="true">${paths}</svg>`;

const ICONS = {
  // backspace: tag with a 90-degree point, x centred in the box half
  Backspace: SVG(
    '<path d="M10.26 5H19.26A2 2 0 0 1 21.26 7V17A2 2 0 0 1 19.26 19H10.26L3.26 12Z"/>' +
    '<line x1="13.26" y1="9.5" x2="18.26" y2="14.5"/>' +
    '<line x1="18.26" y1="9.5" x2="13.26" y2="14.5"/>'
  ),
  // enter: riser turning left into a shaft, 90-degree arrowhead
  Enter: SVG(
    '<path d="M20.76 5V12A2 2 0 0 1 18.76 14H3.76"/>' +
    '<polyline points="8.76 9 3.76 14 8.76 19"/>'
  ),
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
