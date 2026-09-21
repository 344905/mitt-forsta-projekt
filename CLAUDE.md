# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A small browser-based arcade with two games for two fixed players, John (green) and Vera
(magenta/purple), sharing a retro 80s/90s neon space look (pixel font, animated starfield, chunky
box-shadow borders): **Luffarschack** (tic-tac-toe, best-of-5 series) and **Hänga gubbe**
(Hangman, co-op letter-guessing). A game-picker screen (`screen-game-select`) is the app's entry
point. This is the user's first-ever coding project — they are a complete beginner. When making
changes, explain what's happening and why in plain terms rather than assuming familiarity with web
dev concepts.

Plain HTML/CSS/JS with zero build step and zero npm dependencies — deliberately kept simple. It is
also an installable PWA (manifest + service worker) deployed via GitHub Pages, so it can be added to
an Android home screen.

## Commands

```bash
npm start        # runs `node server.js`, serves the game at http://localhost:3000
```

There is no build step, bundler, linter, or test suite — edit the files directly and reload the
browser. `node -c <file>.js` (e.g. `node -c script.js`) is a fast way to catch JS syntax errors
without starting the server.

### Deployment

The repo is pushed to `origin` (`https://github.com/344905/mitt-forsta-projekt.git`, branch `main`)
and served live via GitHub Pages at `https://344905.github.io/mitt-forsta-projekt/`. Pushing to
`main` triggers a Pages rebuild automatically — check status with:

```bash
gh api repos/344905/mitt-forsta-projekt/pages/builds/latest
```

## Architecture

No framework, no build step:

- **`index.html`** — every "screen" for both games (game-select, Luffarschack's welcome/game/
  series-winner/play-again/goodbye, Hänga gubbe's single game screen) lives as a sibling
  `<section class="screen">` inside `#app`; only one has the `.active` class at a time (toggled by
  `showScreen()`, defined in `script.js` but used by both games). There is no router. Luffarschack's
  `screen-game` section is never swapped away when a match ends, and Hänga gubbe's
  `screen-hangman-game` likewise stays visible when a round ends — see the game-specific notes below.
- **`script.js`** — Luffarschack's state/logic (unchanged since it was built; don't merge Hangman
  code into this file), plus the truly shared "app chrome": `showScreen()`, the exit button, service
  worker registration, and the two game-select button handlers. Central `state` object (board array,
  current player, scores, whose turn starts next, etc.) plus `render*()` functions that sync the DOM
  to `state` after every change.
- **`hangman.js`** — Hänga gubbe's state/logic, deliberately kept in its own file rather than
  appended to `script.js`, so the two games can't accidentally break each other. Same pattern as
  `script.js`: a `hangmanState` object + `render*()` functions. `WORDS` is the user's own hand-picked
  Swedish word list — ask before replacing or filtering it (it intentionally includes very short
  words like "vi"/"du"/"en").
- **`style.css`** — neon color theme via CSS variables (`--john-color`, `--vera-color`, `--accent`,
  `--danger-color` for Hänga gubbe's figure), "Press Start 2P" pixel font, and hand-rolled chunky
  borders using stacked `box-shadow` (no border images). Per-player custom SVG cursors
  (`cursor: url('data:image/svg+xml...')`) are defined here, not as image files.
- **`stars.js`** — self-contained `<canvas>` starfield animation, independent of game logic.
- **`server.js`** — a dependency-free static file server (Node's built-in `http`/`fs`, no Express).
  Its `MIME_TYPES` map only covers `.html`/`.css`/`.js`; `.json` and `.png` fall back to
  `text/plain`, which is harmless for local testing but worth fixing if it ever causes issues (GitHub
  Pages, which serves the real deployed site, sets correct MIME types itself).

### Responsive layout gotchas

Never give a game board/grid a fixed pixel size (e.g. `width: 90px` per cell) — on narrow phones
this forces the whole `#app` panel wider than the viewport and clips the neon border off-screen.
Both `.board-wrap` (Luffarschack) and `.hangman-drawing-wrap`/`.hangman-keyboard` (Hänga gubbe) use
responsive sizing instead (`fr` units, `auto-fill`, `min(Npx, 100%)`, `clamp()`). One specific trap
to avoid repeating: the size constraint must live on the **wrapper** div, not on the grid/SVG inside
it — putting `width: min(340px, 100%)` on `.board` itself (instead of `.board-wrap`) created a
circular sizing dependency where the wrapper tried to shrink-to-fit the board while the board's `100%`
tried to resolve against the wrapper, and the board collapsed to near-zero width. When testing
layout changes, check `document.documentElement.scrollWidth > window.innerWidth` at 320px viewport
width, not just visually — the Browser pane's screenshot tool scales/crops in ways that can make a
real overflow bug look fine, or a fine layout look broken.

### Luffarschack game rules (current, not what an older README/commit message might say)

- Best-of-5 series, decided as soon as either player reaches 3 match wins (`WINS_NEEDED`).
- Classic 3x3 board, alternating turns. Who starts match 1 is randomized; after that, the **loser**
  of the previous match starts the next one (`state.nextStarter`).
- No draws are possible by design: once a player has 3 marks on the board (`MAX_MARKS_PER_PLAYER`),
  they no longer place new marks — they must **move** one of their existing marks to an empty cell
  instead (`isMovePhase()`). This replaced an earlier "oldest mark auto-vanishes" rule; don't
  reintroduce that without checking history/user intent first.
- Moving a piece supports two input styles through the same Pointer Events handlers
  (`handlePointerDown`/`handlePointerMove`/`handlePointerUp`): a real press-drag-release gesture, or
  a two-tap fallback (tap own piece to select, tap an empty cell as destination). Both must keep
  working — this was an explicit accessibility requirement, not just a nice-to-have.
- On a win, the game does **not** navigate away from the board: `handleRoundWin()` draws a neon line
  through the 3 winning cells (`drawWinLine()`, an absolutely-positioned `<svg>` overlay computed
  from cell pixel centers) and shows the result text + "Nästa match" button inline below the board,
  while `roundLocked` blocks further board input until the player continues. Don't reintroduce a
  separate "round result" screen that hides the board.

### Hänga gubbe game rules

- Co-op, not competitive: John and Vera take turns picking the next letter on the **same** word,
  alternating regardless of whether the guess was right or wrong (see `guessLetter()`).
- 6 wrong guesses allowed (`MAX_WRONG_GUESSES`), matching the classic head/body/2 arms/2 legs figure
  — each wrong guess reveals one more `.hm-part` element in the SVG.
- Same lesson as Luffarschack's win line: on win or loss, the word/drawing/keyboard stay visible and
  the result + "Nytt ord"/"Byt spel" buttons appear inline (`#hangman-result`) rather than switching
  screens; the keyboard just gets `disabled`.

### PWA / service worker gotchas

The service worker (`sw.js`) is network-first with a cache fallback, **not** cache-first — this was
a deliberate fix after real deployed updates silently failed to reach an already-installed phone.
Two details matter if you touch this file:

1. `fetch(event.request, { cache: "no-store" })` — without `no-store`, the browser's own HTTP cache
   can silently satisfy the "network-first" fetch with a stale response even though the code is
   asking the network.
2. `CACHE_NAME` must be bumped (e.g. `v3` → `v4`) whenever cached assets change in a way that matters,
   so old clients purge their old cache in the `activate` handler.
3. `script.js` reloads the page once on `controllerchange` (new SW taking control) specifically to
   avoid a half-updated state (e.g. new JS expecting DOM elements that a stale cached `index.html`
   doesn't have yet).

When adding/removing files that should work offline, update the `ASSETS` array in `sw.js` to match.
