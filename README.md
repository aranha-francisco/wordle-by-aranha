# WORDLE — by aranha

Vanilla JS/HTML/CSS word game. Unlimited: every game deals a fresh random word,
never the same one twice in a row. No backend, no build step, no dependencies.
All state lives in `localStorage`. Installable and playable offline.

## Running

ES modules and the service worker both require HTTP — opening `index.html` over
`file://` will not work.

```
python serve.py 5500
```

It prints both a localhost URL and your LAN URL.

`serve.py` is a dev server that sends `Cache-Control: no-store`. Plain
`python -m http.server` sends no cache headers at all, so the browser
heuristically caches JS and you end up staring at a stale build. Use `serve.py`
for local work; real hosting should do the opposite and cache aggressively —
`sw.js` is what makes offline work there.

## Playing on a phone

**Quick look, same wi-fi.** Run `serve.py` and open the `http://192.168.x.x:5500`
URL it prints. Good enough to play, but plain HTTP is not a *secure context*, so
the service worker won't register: no offline, and no real home-screen install.
Your computer must stay on, and Windows Firewall may prompt to allow Python.

**Proper install — needs HTTPS.** Any of these gives a real installable PWA:

- **Netlify Drop** (`app.netlify.com/drop`) — drag the `wordle-pwa` folder onto
  the page, get an HTTPS URL in seconds. No account needed to start. Easiest.
- **GitHub Pages** — push the folder to a repo, enable Pages. Free and permanent.
- **Cloudflare Tunnel** — `cloudflared tunnel --url http://localhost:5500` gives
  a temporary HTTPS URL to your running dev server. Good for a quick device test.

Then on iPhone: open the HTTPS URL **in Safari** (not Chrome), tap Share → Add to
Home Screen. It launches fullscreen with no browser chrome, works offline, and
respects the notch/home-indicator safe areas.

## Word database

Bundled locally in `js/data/words-data.js` (~87 KB, generated, no network at
runtime), and precached by the service worker:

- **2,315 answers** — the curated common-word solution pool.
- **12,540 extra guesses** — accepted as valid input but never used as answers.
- **14,855 accepted guesses total**, which is roughly Wordle's own ~13k. Obscure
  openers (SOARE, ROATE, TARES, ADIEU) and oddities (QAJAQ, PZAZZ, XYLYL) all
  pass, so a legitimate word should essentially never be rejected.

The answer pool is deliberately much smaller than the guess list — solutions
stay common words while guesses stay permissive. Stored as space-delimited
strings and `split(' ')` at load, which is far smaller than array literals.

## Typography

Rubik, bundled at `fonts/rubik-latin-var.woff2` (34.5 KB, latin subset,
variable 400–600, OFL — see `fonts/OFL.txt`). It is a local file rather than a
system stack for two reasons:

1. **Centring.** Uppercase glyphs are centred by flexbox using the *line box*,
   which includes descender space. If a font's ascent/descent aren't symmetric
   around its cap height, every letter lands off-centre. Segoe UI's 24/6 split
   pushed tile letters ~1px low. Rubik's gaps are 0.22em above the cap vs
   0.23em below the baseline, so the optical error drops to ~0.1px.
2. **Consistency.** Bundling pins the metrics across desktop and iOS, so
   centring can't drift per-platform — and it keeps the app fully offline.

Type scale and weights are tokens (`--fs-*`, `--fw-*`) in `:root`; no
hard-coded font sizes elsewhere.

**Tracked-out text is indented by half its letter-spacing.** CSS appends a
letter-space after the *last* glyph too, so centred tracked text sits half a
space left of centre. `.title` / `.subtitle` / `.modal-word` compensate with
`text-indent: <half the tracking>`. Verified by canvas ink measurement: title
offset is −0.19px. A full-tracking indent overshoots the other way.

## Layout

```
index.html          markup shell (incl. the pre-paint theme script)
serve.py            no-cache dev server
package.json        test + build:sw scripts. Nothing here ships to the browser.
css/styles.css      all styling; design tokens are the :root custom properties
fonts/              bundled Rubik + its OFL licence
js/
  config.js         board size, animation timings, storage key
  words.js          createWordList() factory over the bundled data
  data/words-data.js  generated word lists
  game.js           pure game state — evaluate(), Game class. No DOM.
  storage.js        localStorage read/write, stats, settings, saved board
  settings.js       theme/accent/contrast/hard-mode state. Ids only, no colours.
  main.js           wiring: input → game → UI
  ui/
    board.js        tile grid, flip reveal
    keyboard.js     on-screen keyboard
    modal.js        win/lose overlay
    settings-modal.js
    focus-trap.js   keeps Tab inside a dialog
    toast.js        transient messages
    intro.js        opening reveal (measures the header's travel)
test/               node --test suite (see below)
tools/              service-worker generator
manifest.json
sw.js               cache-first service worker — GENERATED, see Caching
icons/
```

The UI layer never mutates game state and `game.js` never touches the DOM;
`main.js` is the only place the two meet. That split is what makes the whole
game layer testable in Node with no browser and no jsdom.

## Tests

```
npm test
```

51 tests, no dependencies — Node's built-in runner over the pure modules.
`storage.js` reads `localStorage` lazily inside each function, so a ~10-line
in-memory stub is enough to test it.

The suite leans on `evaluate()`'s duplicate-letter rules, which are the classic
Wordle bug and the reason it makes two passes instead of one, and on the streak
rules below.

`test/build.test.js` guards the couplings that **fail silently** — the ones that
keep working on your machine and break for someone else, later:

| guard | what it catches |
|---|---|
| sw.js asset list | a new module that never got precached; offline breaks only once someone's on a plane |
| sw.js cache name | an edited asset without a cache bump; installed copies keep serving the old build |
| storage key | `index.html`'s pre-paint script can't import `STORAGE_KEY`; change one and the theme silently flashes again |
| flip timings | `config.js` and the stylesheet drifting, so the colour lands before or after the tile turns edge-on |
| accent tokens | an accent missing one of its three values, or a swatch with no colour |

Each one has been checked by deliberately breaking it and watching it fail.

## Stats and the cost of a hint

Streak is **consecutive unaided wins**. `Game.statsRecorded` guards against a
reload double-counting a finished board.

| outcome | played | wins | streak | distribution |
|---|---|---|---|---|
| unaided win | +1 | +1 | +1 | +1 |
| assisted win (any hint used) | +1 | +1 | **reset** | — |
| loss | +1 | — | reset | — |
| skip (giving up) | +1 | — | reset | — |

**A hint ends the streak exactly like a loss.** That's the entire price of a
hint, and without it the whole thing is theatre: you could hint your way past
every hard word and the streak would never break. Assisted rounds still count in
played/wins so the win rate stays honest — they're only kept out of the
distribution, so that histogram keeps meaning "solved unaided in N".

The UI says this out loud rather than quietly resetting: the first hint of a
round toasts "streak won't count", and the result modal carries a "hint used —
streak reset" note.

**The distribution is recorded but deliberately not shown anywhere.** It accrues
history so a future stats screen has something to show; stats can't be
backfilled, so dropping the write would cost real data.

## Skip / reveal, and the way out of a finished round

`Game.reveal()` puts the answer in the next empty row and ends the round as a
loss. The board flips it in with the normal stagger, then the modal opens.

The result modal **is** dismissible (X, backdrop, Escape) so the finished board
can be reviewed. Closing it isn't a dead end: the skip bar morphs into "New
game", filling with the accent, so there's always a route to the next round
without a reload.

That morph is driven by **the modal closing**, not by `game.isOver`. The round is
already over while the last row is still flipping and while the modal covers the
board, so keying off `isOver` swaps the label early — behind the scrim, where the
animation can't be seen and has nothing left to play by the time it matters.
`skipMode` in `main.js` tracks this; `startGame()` resets it.

**The revealed word is deliberately kept out of `guesses`/`results`.** It was
never guessed, so recording it would push an all-green row into the result
pattern and make a skipped round read as a win. It lives in `game.revealedWord`
instead, and `board.render()` paints that row from it — without that branch the
row would blank out on the next render, since it isn't a guess.

## Hint

`Game.hint()` reveals one random position the player hasn't pinned down.
Candidates exclude positions already guessed correctly (a hint can never tell
you something you know) and positions already hinted (repeat clicks always give
new information). Verified over 1,000 randomised runs: zero reveals of a solved
position, zero duplicates, zero wrong letters.

The revealed letter renders as a **ghost** in the active row while that slot is
empty — typing covers it, backspacing brings it back, and it follows to the next
row until that position is guessed. It is stored as `game.hints` (a Set of
positions) and persists across reloads. `board.revealRow()` clears the ghost
attribute, since a skip reveal can land on a hinted slot.

Hints are unlimited, but they are not free — the first one marks the round
`assisted`, which costs the streak. See the table above.

## Hard mode

Off by default. When on, every clue already earned must be honoured: correct
letters stay in place, present letters must reappear. `Game.hardModeViolation()`
returns a specific reason ("3rd letter must be O") rather than a generic refusal.

Enforcement covers clues from *guesses*, not lightbulb hints — that's the classic
rule, and making a hint also constrain later guesses would punish it twice.

The toggle **locks mid-round**, because flipping it would change the rules of a
game already underway. `main.js` supplies `isHardModeLocked` to the settings
modal, which disables the control and swaps the note.

## Settings

`js/settings.js` holds state, `js/ui/settings-modal.js` the UI. Changes apply
live and persist on click — there is no save button, so the UI only ever
reflects storage.

**Colour values live in CSS, not JS.** `settings.js` knows ids and labels only;
`[data-accent="…"]` blocks and `.swatch` rules in `styles.css` own the hexes, so
the palette has one home.

Each accent carries three values, because one hex can't do all three jobs:

| token | job |
|---|---|
| `--accent` | surface colour (keys, buttons, active-row outline) |
| `--accent-soft` | accent-coloured *text* on `--bg`; the raw accent is ~1.7:1 there, so this is the same hue lifted past 4.5:1 |
| `--accent-text` | text *on* `--accent` (enter key, new-game button) |

The accents are the shipped crimson `hsl(347, 50%, 28%)`, with slate, teal and
charcoal at the **same lightness and saturation** on other hues, so none reads
brighter than the rest.

**Rose is a deliberate exception.** Red carries far less luminance than green, so
a rose at `L=28%` would have read as a second dark wine next to crimson. It sits
at `L=44%` instead, which lands its measured brightness at 0.1223 against teal's
0.1218 — matched by eye rather than by HSL. If you add accents, match *perceived*
brightness, not the L number.
Light theme overrides `--accent-soft` back to `var(--accent)` — the lifted tint
is built for a dark background and vanishes on beige. That override must stay
**after** the `[data-accent]` blocks to win the cascade.

Light mode is warm beige (`#efe7d8`), not white. Absent still recedes — darker
than the keys, just inverted relative to dark mode.

**High contrast** (`[data-contrast="high"]`) swaps the tiles to orange/blue.
Green vs yellow is the one pairing red-green colourblindness can't separate, and
colour was the only channel carrying game state. Orange and blue differ in hue
*and* lightness, so they survive any colour vision. It layers over both themes,
so the block must come after both.

**The inline script in `index.html` is load-bearing.** It applies the saved
theme/accent/contrast before first paint; without it the page paints dark and
flips once the module runs. It can't import `STORAGE_KEY` (it runs before any
module), so `test/build.test.js` asserts the key and every themed attribute
instead — that test is the only thing standing between a renamed key and a
silently returning flash.

## Layout scaling

Phones are width-constrained, so `--tile-size` is derived from `100vw`.
Desktops are *height*-constrained — the column is ~5 tiles wide but 6 tall plus
a keyboard — so above 480px everything scales off `vh` (`--tile-size`,
`--key-h`, `--col-gap`, `--fs-title`) and `--max-width` grows with the tile.
The header top-aligns with a `4.5vh` gap rather than floating mid-screen.

Fixed 44px tiles in a 500px column left the app marooned in the middle of a
large monitor. Measured fill after the change: ~87% of viewport height at
1920x1002, 1600x900 and 1366x768; the clamp floors keep it from overflowing at
1280x600 and below.

## Intro animation

On load the wordmark sits optically centred in the viewport in `--accent-soft`,
an accent rule sweeps out beneath it, then the header rises to its resting place
as the title settles to off-white and the board and keyboard come up behind it.
~900ms total, `prefers-reduced-motion` skips straight to the resting layout.

Split of responsibilities: the CSS owns every keyframe; `js/ui/intro.js` exists
only to measure `--intro-shift`, the gap between the header's resting position
and the viewport centre. CSS can't express that — it depends on the laid-out
height of the board and keyboard. Measuring keeps the whole thing
transform/opacity only, so the resting layout never moves and nothing reflows.

The header icons are **not** part of the title card — they're app furniture, so
they're held at opacity 0 and come up with the board rather than riding the
wordmark in from the centre.

`INTRO_MS` must be **>= the longest animation in the CSS intro block** (currently
`intro-reveal` at 700ms delay + 400ms = 1100ms). Teardown removes `data-intro`,
so anything still mid-flight snaps to its resting state — at 900ms the board was
caught at opacity 0.8 and popped the last 20%. `test/build.test.js` parses the
stylesheet and fails if the two drift.

**Input is locked for the whole boot, starting before the `document.fonts.ready`
await** — not just during the animation. That await is a real window in which the
board is laid out but not yet revealed, and keystrokes would otherwise land on an
invisible board. If you refactor `boot()`, keep `locked = true` ahead of the
first `await`.

## Notes

**Animation timings are duplicated** — `FLIP_MS` / `FLIP_STAGGER_MS` in
`config.js` must stay in sync with `--flip-ms` / `--flip-stagger-ms` in
`styles.css`. JS drives the mid-rotation colour swap, CSS drives the rotation.
`test/build.test.js` fails if they drift.

## Extension points

**Custom word lists** — `createWordList(answers, extraGuesses)` in `words.js`
returns the `{ answers, isAllowed, pick, random }` interface the `Game` expects.
Build one from any source and pass it as the `wordList` option; nothing else
needs to change. `COLS` in `config.js` drives board width, so non-5-letter
lists mostly work already.

**Themes and accents are live** — see the Settings section below. Every colour,
radius (`--r-*`), font size (`--fs-*`) and weight (`--fw-*`) is still a custom
property on `:root`, so further variants are a token block, not new CSS.

**Accent colours.** `--accent` (#6d2434) is a *surface* colour — buttons, the
enter/backspace keys, the active-row outline. It is unreadable as text on the
background (1.71:1), so accented copy uses `--accent-soft` (#c85f77, 4.68:1).
Keep any replacement above 4.5:1.

**Eliminated letters** use `--absent: #0d0f10` — darker than both an empty tile
and an untouched key, so ruled-out letters read as holes punched in the board.
The original `#3a3f42` sat a hair above the `#2c3235` key and was nearly
impossible to distinguish. Two knock-ons worth keeping if you retheme: the
pattern grid's absent swatch needs an inset outline to stay visible on the
lighter modal surface, and absent keys need a stronger `:active` brightness
bump since they start near-black.

## Caching

`sw.js` is cache-first over an explicit asset list. **The `CACHE` name and
`ASSETS` array are generated — don't hand-edit them:**

```
npm run build:sw
```

`tools/build-sw.js` walks the filesystem for the asset list and names the cache
after a hash of those assets' contents. That kills two hand-maintenance bugs at
once: you can't forget to list a new module, and you can't forget to bump the
version, because the version *is* the content. `npm test` fails if `sw.js` has
drifted from the filesystem.

This replaced twelve manual `wordle-vN` bumps. A hand-kept list is a bad trade:
it breaks offline *silently*, so nobody notices until they're on a plane.

Install uses `Request(url, { cache: 'reload' })` so it can never precache a stale
copy through the HTTP cache.

Write `sw.js` with a BOM-free encoding. PowerShell's `Set-Content -Encoding utf8`
prepends one, and a BOM atop a service worker is a great way to lose an
afternoon — there's a test for that too.
