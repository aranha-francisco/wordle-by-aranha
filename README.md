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
index.html          markup shell
serve.py            no-cache dev server
css/styles.css      all styling; design tokens are the :root custom properties
fonts/              bundled Rubik + its OFL licence
js/
  config.js         board size, animation timings, storage key, emoji map
  words.js          createWordList() factory over the bundled data
  data/words-data.js  generated word lists
  game.js           pure game state — evaluate(), Game class. No DOM.
  storage.js        localStorage read/write, stats, saved board
  share.js          emoji grid text + clipboard (see note below)
  main.js           wiring: input → game → UI
  ui/
    board.js        tile grid, flip reveal
    keyboard.js     on-screen keyboard
    modal.js        win/lose overlay
    toast.js        transient messages
    intro.js        opening reveal (measures the header's travel)
manifest.json
sw.js               cache-first service worker
icons/
```

The UI layer never mutates game state and `game.js` never touches the DOM;
`main.js` is the only place the two meet.

## Stats

Streak is **consecutive wins** — every finished game counts, win or lose.
`Game.statsRecorded` guards against a reload double-counting a finished board.

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

**Input is locked for the whole boot, starting before the `document.fonts.ready`
await** — not just during the animation. That await is a real window in which the
board is laid out but not yet revealed, and keystrokes would otherwise land on an
invisible board. If you refactor `boot()`, keep `locked = true` ahead of the
first `await`.

## Notes

**`share.js` is currently unwired.** The share button was removed from the
modal, but the module (and `EMOJI` in `config.js`) is kept intact because a
shareable emoji grid is a planned feature — re-adding a button that calls
`buildShareText(game)` + `copyText(...)` is all it takes. Delete both if the
feature is off the table for good.

**Animation timings are duplicated** — `FLIP_MS` / `FLIP_STAGGER_MS` in
`config.js` must stay in sync with `--flip-ms` / `--flip-stagger-ms` in
`styles.css`. JS drives the mid-rotation colour swap, CSS drives the rotation.

## Extension points

**Custom word lists** — `createWordList(answers, extraGuesses)` in `words.js`
returns the `{ answers, isAllowed, pick, random }` interface the `Game` expects.
Build one from any source and pass it as the `wordList` option; nothing else
needs to change. `COLS` in `config.js` drives board width, so non-5-letter
lists mostly work already.

**Themes** — every colour, radius (`--r-*`), font size (`--fs-*`) and weight
(`--fw-*`) is a custom property on `:root` in `styles.css`. A theme mode means
swapping that block (e.g. via a `data-theme` attribute on `<html>`); no JS or
markup changes required.

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

`sw.js` is cache-first over an explicit asset list. **Bump `CACHE` whenever you
change any asset**, or clients keep serving the old build. Install uses
`Request(url, { cache: 'reload' })` so it can never precache a stale copy.
