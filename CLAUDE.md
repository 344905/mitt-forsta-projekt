# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser-based tic-tac-toe ("luffarschack") game between two fixed players, John (green) and Vera
(magenta/purple), played as a best-of-5 series with a retro 80s/90s neon space arcade look (pixel
font, animated starfield, chunky box-shadow borders). This is the user's first-ever coding project —
they are a complete beginner. When making changes, explain what's happening and why in plain terms
rather than assuming familiarity with web dev concepts.

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

Five files carry all the logic, no framework:

- **`index.html`** — all "screens" (welcome, game, series-winner, play-again, goodbye) live as
  sibling `<section class="screen">` elements inside `#app`; only one has the `.active` class at a
  time (toggled by `showScreen()` in `script.js`). There is no router or single "current view" other
  than that class toggle. The `screen-game` section itself is never swapped away when a match ends —
  see below.
- **`script.js`** — all game state and logic, plain DOM manipulation, no modules/build step. Central
  `state` object (board array, current player, scores, whose turn starts next, etc.) plus a handful
  of `render*()` functions that sync the DOM to `state` after every change. No component framework —
  read this file top to bottom to understand the whole app.
- **`style.css`** — neon color theme via CSS variables (`--john-color`, `--vera-color`, `--accent`),
  "Press Start 2P" pixel font, and hand-rolled chunky borders using stacked `box-shadow` (no border
  images). Per-player custom SVG cursors (`cursor: url('data:image/svg+xml...')`) are defined here,
  not as image files.
- **`stars.js`** — self-contained `<canvas>` starfield animation, independent of the game logic.
- **`server.js`** — a dependency-free static file server (Node's built-in `http`/`fs`, no Express).
  Its `MIME_TYPES` map only covers `.html`/`.css`/`.js`; `.json` and `.png` fall back to
  `text/plain`, which is harmless for local testing but worth fixing if it ever causes issues (GitHub
  Pages, which serves the real deployed site, sets correct MIME types itself).

### Game rules (current, not what an older README/commit message might say)

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
