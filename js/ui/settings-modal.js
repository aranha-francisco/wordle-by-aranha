import { THEMES, ACCENTS, CONTRASTS, getSettings, updateSettings } from '../settings.js';
import { createFocusTrap } from './focus-trap.js';

/**
 * Settings overlay. Every control applies live on click and persists itself —
 * there is no save button, so the UI just reflects storage.
 */
export class SettingsModal {
  /**
   * @param {object} [opts]
   * @param {(settings: object) => void} [opts.onChange] notified after a live change
   * @param {() => boolean} [opts.isHardModeLocked] true mid-round, when switching
   *   hard mode would retroactively change the rules of a game in progress
   */
  constructor({ onChange, isHardModeLocked } = {}) {
    this.onChange = onChange;
    this.isHardModeLocked = isHardModeLocked || (() => false);
    this.overlay = document.getElementById('settings-overlay');
    this.card = this.overlay.querySelector('.modal');
    this.themeGroup = document.getElementById('theme-toggle');
    this.accentGroup = document.getElementById('accent-swatches');
    this.contrastGroup = document.getElementById('contrast-toggle');
    this.hardGroup = document.getElementById('hard-toggle');
    this.hardNote = document.getElementById('hard-note');
    this.closeBtn = document.getElementById('btn-settings-close');
    this.trap = createFocusTrap(this.card);

    this.build();

    this.closeBtn.addEventListener('click', () => this.hide());

    // Click-outside: only when the press lands on the backdrop itself, not on a
    // child that happens to bubble up through it.
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.hide();
    });
  }

  get isOpen() { return !this.overlay.hidden; }

  /** @param {HTMLElement} group @param {{id:string,name:string}[]} options */
  buildSegmented(group, options, key) {
    group.replaceChildren();
    for (const option of options) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.value = option.id;
      btn.textContent = option.name;
      btn.addEventListener('click', () => this.set({ [key]: option.id }));
      group.appendChild(btn);
    }
  }

  build() {
    this.buildSegmented(this.themeGroup, THEMES, 'theme');
    this.buildSegmented(this.contrastGroup, CONTRASTS, 'contrast');
    this.buildSegmented(this.hardGroup, [
      { id: 'off', name: 'Off' },
      { id: 'on', name: 'On' },
    ], 'hardModeChoice');

    this.accentGroup.replaceChildren();
    for (const accent of ACCENTS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'swatch';
      btn.dataset.accent = accent.id;
      btn.title = accent.name;
      btn.setAttribute('aria-label', accent.name);
      btn.addEventListener('click', () => this.set({ accent: accent.id }));
      this.accentGroup.appendChild(btn);
    }
  }

  set(patch) {
    // The hard-mode segmented control speaks on/off; storage speaks boolean.
    if ('hardModeChoice' in patch) {
      if (this.isHardModeLocked()) return;
      patch = { hardMode: patch.hardModeChoice === 'on' };
    }
    const settings = updateSettings(patch);
    this.sync(settings);
    this.onChange?.(settings);
  }

  /** Reflects current settings onto the controls. */
  sync(settings = getSettings()) {
    const mark = (group, value) => {
      for (const btn of group.children) {
        btn.setAttribute('aria-pressed', String(btn.dataset.value === value));
      }
    };
    mark(this.themeGroup, settings.theme);
    mark(this.contrastGroup, settings.contrast);
    mark(this.hardGroup, settings.hardMode ? 'on' : 'off');

    for (const btn of this.accentGroup.children) {
      btn.setAttribute('aria-pressed', String(btn.dataset.accent === settings.accent));
    }

    // Locked mid-round: flipping it would change the rules of a game already
    // underway, so it waits for the next round (this is what Wordle does too).
    const locked = this.isHardModeLocked();
    for (const btn of this.hardGroup.children) btn.disabled = locked;
    this.hardGroup.dataset.locked = String(locked);
    this.hardNote.textContent = locked
      ? 'Finish this round to change hard mode'
      : 'Revealed clues must be reused in later guesses';
  }

  show() {
    this.sync();
    this.overlay.hidden = false;
    this.trap.activate();
    this.closeBtn.focus({ preventScroll: true });
  }

  hide() {
    if (!this.isOpen) return;
    this.overlay.hidden = true;
    this.trap.release();
  }
}
