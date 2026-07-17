const FOCUSABLE = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Keeps Tab inside a dialog and restores focus to whatever opened it.
 *
 * aria-modal alone is a promise to assistive tech, not an enforcement: without
 * this, Tab walks straight out of the dialog and onto the keyboard behind it.
 *
 * Elements are re-queried on every Tab because both dialogs build their controls
 * dynamically, and the settings ones change disabled state while open.
 */
export function createFocusTrap(container) {
  let previouslyFocused = null;

  const onKeydown = (e) => {
    if (e.key !== 'Tab') return;

    const items = [...container.querySelectorAll(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );
    if (!items.length) return;

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    // Wrap at the ends; also catches focus having escaped the container entirely.
    if (e.shiftKey && (active === first || !container.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !container.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  };

  return {
    activate() {
      previouslyFocused = document.activeElement;
      document.addEventListener('keydown', onKeydown, true);
    },
    release() {
      document.removeEventListener('keydown', onKeydown, true);
      // Only restore if the opener still exists and is focusable.
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
      previouslyFocused = null;
    },
  };
}
