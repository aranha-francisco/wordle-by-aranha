import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expectedServiceWorker, parseServiceWorker } from '../tools/assets.js';
import { STORAGE_KEY, FLIP_MS, FLIP_STAGGER_MS } from '../js/config.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

/* These guard the couplings that fail silently — the ones where the app keeps
   working on your machine and only breaks for someone else, later. */

test('sw.js lists every shipped asset', () => {
  const actual = parseServiceWorker(read('sw.js'));
  const { assets } = expectedServiceWorker(root);

  const missing = assets.filter((a) => !actual.assets.includes(a));
  const stale = actual.assets.filter((a) => !assets.includes(a));

  assert.deepEqual(missing, [], 'assets missing from sw.js — offline breaks silently. Run: npm run build:sw');
  assert.deepEqual(stale, [], 'sw.js lists files that no longer exist. Run: npm run build:sw');
});

test('sw.js cache name matches the content of those assets', () => {
  const actual = parseServiceWorker(read('sw.js'));
  const { cache } = expectedServiceWorker(root);
  assert.equal(actual.cache, cache,
    'asset contents changed without a cache bump — installed copies keep the old build. Run: npm run build:sw');
});

test('sw.js has no BOM', () => {
  // PowerShell's Set-Content -Encoding utf8 prepends one, and a BOM at the top
  // of a service worker is a great way to lose an afternoon.
  const raw = readFileSync(join(root, 'sw.js'));
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'sw.js starts with a UTF-8 BOM');
});

test('the pre-paint theme script uses the same storage key as config.js', () => {
  // index.html has to read storage before any module loads, so it can't import
  // STORAGE_KEY. Change the key in config.js alone and the theme silently starts
  // flashing dark-then-light again — this is the only thing that would notice.
  const html = read('index.html');
  assert.ok(
    html.includes(`localStorage.getItem('${STORAGE_KEY}')`),
    `index.html's inline script must read '${STORAGE_KEY}' to match config.js STORAGE_KEY`
  );
});

test('the pre-paint script applies every attribute the stylesheet themes on', () => {
  const html = read('index.html');
  for (const attr of ['theme', 'accent', 'contrast']) {
    assert.ok(
      html.includes(`document.documentElement.dataset.${attr}`),
      `inline script must set data-${attr} before first paint, or that dimension flashes`
    );
  }
});

test('flip timings in config.js match the stylesheet', () => {
  // JS drives the mid-rotation colour swap; CSS drives the rotation itself.
  // If these drift, the colour lands before or after the tile turns edge-on.
  const css = read('css/styles.css');
  assert.ok(css.includes(`--flip-ms: ${FLIP_MS}ms`), `--flip-ms must be ${FLIP_MS}ms`);
  assert.ok(css.includes(`--flip-stagger-ms: ${FLIP_STAGGER_MS}ms`),
    `--flip-stagger-ms must be ${FLIP_STAGGER_MS}ms`);
});

test('every accent defines all three of its tokens', () => {
  // One hex can't do all three jobs: surface, text-on-background, text-on-accent.
  const css = read('css/styles.css');
  for (const accent of ['crimson', 'slate', 'teal', 'amber', 'charcoal']) {
    const block = css.match(new RegExp(`\\[data-accent="${accent}"\\]\\s*\\{([^}]*)\\}`))?.[1];
    assert.ok(block, `missing [data-accent="${accent}"] block`);
    for (const token of ['--accent:', '--accent-soft:', '--accent-text:']) {
      assert.ok(block.includes(token), `${accent} is missing ${token}`);
    }
  }
});

test('every accent has a matching swatch colour', () => {
  const css = read('css/styles.css');
  for (const accent of ['crimson', 'slate', 'teal', 'amber', 'charcoal']) {
    assert.ok(
      css.includes(`.swatch[data-accent="${accent}"]`),
      `no swatch colour for ${accent} — its settings chip would render empty`
    );
  }
});

test('the dead share module is really gone', () => {
  assert.throws(() => read('js/share.js'), 'js/share.js should have been deleted');
  const sw = read('sw.js');
  assert.ok(!sw.includes('share.js'), 'sw.js still precaches a file that no longer exists');
});
