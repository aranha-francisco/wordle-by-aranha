import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative, posix, sep } from 'node:path';
import { createHash } from 'node:crypto';

/** Directories that never ship to the browser. */
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'test', 'tools']);

/** Files that live in the repo but aren't runtime assets. */
const IGNORED_FILES = new Set(['sw.js', 'package.json', 'package-lock.json']);

/** Extensions the app actually fetches. */
const SHIPPED = new Set(['.html', '.css', '.js', '.json', '.png', '.woff2']);

const ext = (name) => {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i).toLowerCase();
};

/**
 * Every asset the app needs to run offline, as sw.js-relative paths.
 *
 * Derived from the filesystem rather than hand-listed: a hand-kept list breaks
 * offline *silently* — the app still works online, so a missing entry surfaces
 * only when someone is already on a plane.
 */
export function listAssets(root) {
  const found = [];

  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (!IGNORED_DIRS.has(name)) walk(full);
      } else if (SHIPPED.has(ext(name)) && !IGNORED_FILES.has(name)) {
        found.push('./' + relative(root, full).split(sep).join(posix.sep));
      }
    }
  };

  walk(root);
  // './' is the navigation request; index.html alone doesn't cover it.
  return ['./', ...found];
}

/**
 * Content hash of every asset. Used as the cache name so the version can't go
 * stale: change any byte and the name changes, which is the whole trigger for
 * the service worker to re-install.
 */
export function assetHash(root, assets) {
  const hash = createHash('sha256');
  for (const asset of assets) {
    if (asset === './') continue;
    hash.update(asset);
    hash.update(readFileSync(join(root, asset.slice(2))));
  }
  return hash.digest('hex').slice(0, 8);
}

/** The exact ASSETS array and CACHE name sw.js should contain right now. */
export function expectedServiceWorker(root) {
  const assets = listAssets(root);
  return { assets, cache: `wordle-${assetHash(root, assets)}` };
}

/** Parses the ASSETS array and CACHE name currently written into sw.js. */
export function parseServiceWorker(source) {
  const cache = source.match(/const CACHE = '([^']+)'/)?.[1] ?? null;
  const block = source.match(/const ASSETS = \[([\s\S]*?)\];/)?.[1] ?? '';
  const assets = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  return { cache, assets };
}
