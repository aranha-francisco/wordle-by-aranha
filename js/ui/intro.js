// Total intro runtime. Must cover the LONGEST animation in the CSS intro block,
// which is intro-reveal: 700ms delay + 400ms duration. Teardown removes
// data-intro, so anything still mid-flight snaps to its resting state — at 900ms
// the board was caught at opacity .8 and popped the last 20%.
const INTRO_MS = 1100;

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Plays the opening: header centred in the viewport, then rising to reveal the
 * board and keyboard behind it.
 *
 * The travel distance is measured here rather than expressed in CSS because it
 * is the gap between the header's *resting* position and the viewport centre —
 * a value that depends on the final laid-out height of the board and keyboard.
 * Measuring keeps the animation transform-only, so the resting layout is never
 * disturbed and nothing reflows mid-flight.
 *
 * @param {HTMLElement} app   the .app column
 * @param {HTMLElement} header
 * @returns {Promise<void>} resolves once the board is interactive
 */
export function playIntro(app, header) {
  if (prefersReducedMotion()) {
    app.dataset.intro = 'done';
    return Promise.resolve();
  }

  const rect = header.getBoundingClientRect();
  const headerCentre = rect.top + rect.height / 2;
  const shift = window.innerHeight / 2 - headerCentre;

  // Already centred (very short viewport): nothing to travel, so skip the rise.
  if (Math.abs(shift) < 1) {
    app.dataset.intro = 'done';
    return Promise.resolve();
  }

  app.style.setProperty('--intro-shift', `${Math.round(shift)}px`);
  app.dataset.intro = 'playing';

  return new Promise((resolve) => {
    setTimeout(() => {
      app.dataset.intro = 'done';
      app.style.removeProperty('--intro-shift');
      resolve();
    }, INTRO_MS);
  });
}
