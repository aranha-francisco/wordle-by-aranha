import { THEMES, ACCENTS, getSettings, updateSettings } from '../settings.js';

/**
 * Settings overlay. Every control applies live on click and persists itself —
 * there is no save button, so the UI just reflects storage.
 */
export class SettingsModal {
  /** @param {(settings: object) => void} [onChange] notified after a live change */
  constructor({ onChange } = {}) {
    this.onChange = onChange;
    this.overlay = document.getElementById('settings-overlay');
    this.themeGroup = document.getElementById('theme-toggle');
    this.accentGroup = document.getElementById('accent-swatches');
    this.closeBtn = document.getElementById('btn-settings-close');

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

  build() {
    this.themeGroup.replaceChildren();
    for (const theme of THEMES) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.theme = theme.id;
      btn.textContent = theme.name;
      btn.addEventListener('click', () => this.set({ theme: theme.id }));
      this.themeGroup.appendChild(btn);
    }

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
    const settings = updateSettings(patch);
    this.sync(settings);
    this.onChange?.(settings);
  }

  /** Reflects current settings onto the controls. */
  sync(settings = getSettings()) {
    for (const btn of this.themeGroup.children) {
      btn.setAttribute('aria-pressed', String(btn.dataset.theme === settings.theme));
    }
    for (const btn of this.accentGroup.children) {
      btn.setAttribute('aria-pressed', String(btn.dataset.accent === settings.accent));
    }
  }

  show() {
    this.sync();
    this.overlay.hidden = false;
    this.closeBtn.focus({ preventScroll: true });
  }

  hide() { this.overlay.hidden = true; }
}
