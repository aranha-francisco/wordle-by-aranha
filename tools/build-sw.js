/**
 * Rewrites the ASSETS list and CACHE name in sw.js from the filesystem.
 *
 *   node tools/build-sw.js
 *
 * Run this after adding, removing or editing any shipped file. test/build.test.js
 * fails if you forget, so the drift can't reach a user.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expectedServiceWorker, parseServiceWorker } from './assets.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const swPath = join(root, 'sw.js');

const source = readFileSync(swPath, 'utf8');
const { assets, cache } = expectedServiceWorker(root);
const before = parseServiceWorker(source);

const list = assets.map((a) => `  '${a}',`).join('\n');
const updated = source
  .replace(/const CACHE = '[^']+';/, `const CACHE = '${cache}';`)
  .replace(/const ASSETS = \[[\s\S]*?\];/, `const ASSETS = [\n${list}\n];`);

if (updated === source) {
  console.log(`sw.js already up to date (${cache}, ${assets.length} assets)`);
} else {
  // No BOM: PowerShell's Set-Content -Encoding utf8 adds one, and a BOM at the
  // top of a service worker is a great way to lose an afternoon.
  writeFileSync(swPath, updated, { encoding: 'utf8' });
  console.log(`sw.js updated: ${before.cache} -> ${cache}, ${assets.length} assets`);
}
