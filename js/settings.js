import { loadSettings, saveSettings } from './storage.js';

/**
 * Settings state. Colour values deliberately live in css/styles.css (the
 * [data-accent] / [data-contrast] blocks and .swatch rules) — this only knows
 * ids and labels, so the palette has exactly one home.
 */
export const THEMES = [
  { id: 'dark', name: 'Dark' },
  { id: 'light', name: 'Light' },
];

export const ACCENTS = [
  { id: 'crimson', name: 'Crimson' },
  { id: 'slate', name: 'Slate blue' },
  { id: 'teal', name: 'Deep teal' },
  { id: 'rose', name: 'Rose' },
  { id: 'charcoal', name: 'Charcoal' },
];

export const CONTRASTS = [
  { id: 'normal', name: 'Normal' },
  { id: 'high', name: 'High' },
];

// Matches the dark/light --bg tokens; keeps the iOS status bar in step.
const THEME_COLOR = { dark: '#121516', light: '#efe7d8' };

export function getSettings() {
  return loadSettings();
}

/** Applies settings to the document. Pure DOM — no storage writes. */
export function applySettings(settings) {
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.dataset.accent = settings.accent;
  root.dataset.contrast = settings.contrast;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOR[settings.theme] || THEME_COLOR.dark);
}

/** Persists a patch and applies the result immediately. */
export function updateSettings(patch) {
  const settings = saveSettings(patch);
  applySettings(settings);
  return settings;
}
