# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Rymdarkaden** — a small browser-based arcade with two games for two fixed players, John (green)
and Vera (magenta/purple), sharing a retro 80s/90s neon space look (pixel font, animated starfield,
chunky box-shadow borders): **Luffarschack** (tic-tac-toe, best-of-5 series) and **Hänga gubbe**
(Hangman, co-op letter-guessing). A game-picker screen (`screen-game-select`) is the app's entry
point, and every screen in both games has a way back to it ("Byt spel"/back buttons) — don't add a
screen without one. This is the user's first-ever coding project — they are a complete beginner.
When making changes, explain what's happening and why in plain terms rather than assuming
familiarity with web dev concepts.

Plain HTML/CSS/JS with zero build step and zero *runtime* npm dependencies — deliberately kept
simple. It is also an installable PWA (manifest + service worker) deployed via GitHub Pages, so it
can be added to an Android home screen. Playwright (`@playwright/test`) was added as the project's
first dependency, but it's dev-only (testing), doesn't ship, and doesn't affect the PWA/GitHub Pages
build — the "zero dependencies" principle still applies to the app itself.

## Commands

```bash
npm start          # runs `node server.js`, serves the game at http://localhost:3000
npm run test:e2e   # Playwright end-to-end tests (see below)
```

There is no build step or bundler — edit the files directly and reload the browser. `node -c
<file>.js` (e.g. `node -c script.js`) is a fast way to catch JS syntax errors without starting the
server. Playwright (`@playwright/test`, dev-only) is the project's one test/build dependency — see
"Agent-team workflow" below for how it's used, and "PWA / service worker gotchas" for why
`page.addInitScript` disabling `navigator.serviceWorker.register` shows up in every spec file.

`playwright.config.js` runs the suite across 4 projects: `chromium`/`webkit` (desktop, different
rendering engines — `webkit` exists specifically because an iOS Safari-only `AudioContext` bug was
found by manual code review, not by tests, before it was added) and `android-samsung`/
`android-oneplus-liknande` (real Playwright device profiles — `Galaxy S24` and `Pixel 8`, chosen
because Playwright has no exact "OnePlus" profile but Pixel 8 shares the OnePlus 12's 412px width —
with genuine touch events and mobile Chrome user-agents, not just a narrow desktop viewport).
`tests/e2e/touch-interaction.spec.js` exercises the real `handlePointerDown`/`handlePointerMove`/
`handlePointerUp` code path (drag and the two-tap fallback) via genuinely dispatched pointer/touch
events — not `page.evaluate` shortcuts calling internal functions — skipped automatically on the
non-touch `chromium`/`webkit` projects. (This closed a gap that existed for one iteration: every
other spec file still drives state via direct function calls, which is fine for what those files
test, but touch-interaction.spec.js is the one place the real event-handling code is exercised.)

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

Two more things that only show up as *vertical* overflow (scrolling required) rather than horizontal
clipping, both fixed once already — don't reintroduce them:
- `h1`, `h2`, and `p` need `margin: 0` (set globally near the top of `style.css`). Spacing between
  elements is meant to come entirely from the flex `gap` on `.screen.active`; browser default margins
  on headings/paragraphs silently stack on top of that gap and add up fast across a screen with many
  stacked text elements (Hänga gubbe's screen has 6+).
- Size things that can grow tall (Hänga gubbe's drawing) against viewport *height* too
  (`min(180px, 50vw, 24vh)`), not just width — a width-only cap does nothing on a short-but-not-narrow
  viewport.
- Two result/action buttons side by side (`.result-actions`, shared by both games) need a smaller
  `padding`/`font-size` override — at full `.primary-btn` size they don't fit on one row at 320px and
  silently wrap to two, adding a whole extra row of height.

### Other interaction gotchas fixed once, don't reintroduce

- Luffarschack's `handlePointerDown`/`handlePointerUp` must check `event.button !== 0` — without it,
  right-click (opening the context menu) and middle-click also place/move marks.
- Hänga gubbe's physical-keyboard listener must ignore events with `ctrlKey`/`metaKey`/`altKey` set —
  without that guard, Cmd+R (reload) or Ctrl+F (find) register as a guess of the letter R or F.
- `updateCursorBlink()`'s `setInterval` must be stopped (`stopCursorBlink()`) whenever the game screen
  is left or a round ends, not just restarted — an unstoppped interval keeps running indefinitely.
- The exit button no longer closes immediately: it shows `screen-exit-confirm` first
  (`screenBeforeExitConfirm` remembers where to return to on "Avbryt"). Don't make any button that
  ends the session skip this confirmation.
- Animating an SVG stroke property (e.g. `stroke-dashoffset` for the win-line draw-in effect) from
  JS: set a **CSS custom property** via `style.setProperty("--x", value)`, and let the stylesheet's
  class-based rule read `var(--x)` — don't set the animated property directly via inline `style`.
  An inline style always beats a stylesheet rule on specificity regardless of selector, so a direct
  inline `stroke-dashoffset` would permanently pin the value and the class-toggled CSS transition
  would never have anything to animate from/to.
- Restarting a CSS class-driven animation/transition on the *same* element for a repeated event
  (win-line redraw, hangman shake on each new wrong guess) needs a forced reflow between removing
  and re-adding the class (`void el.getBoundingClientRect()` or `void el.offsetWidth`) — otherwise
  the browser coalesces the remove+add into a no-op and the animation doesn't restart.

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
- The win line draws in with a short animation (`stroke-dasharray`/`stroke-dashoffset` driven by the
  `--win-line-length` CSS custom property, computed from the actual pixel distance between the two
  end cells so it works for rows, columns, and diagonals alike).
- Winning the whole series triggers a `sparkBurst()` (shared helper, also used by Hänga gubbe) on the
  winner banner, in the winning player's color.

### Hänga gubbe game rules

- Co-op, not competitive: John and Vera take turns picking the next letter on the **same** word,
  alternating regardless of whether the guess was right or wrong (see `guessLetter()`).
- 9 wrong guesses allowed (`MAX_WRONG_GUESSES`, derived from `HANGMAN_PARTS.length` — always keep it
  derived, don't hardcode a number that can drift out of sync). The first 3 build the gallows itself
  (post, crossbeam, rope), the remaining 6 build the body (head, body, 2 arms, 2 legs) — each wrong
  guess reveals one more `.hm-part` element in the SVG, in `HANGMAN_PARTS` order. Only the ground line
  is permanently visible (`.hm-gallows`); everything else starts hidden.
- Same lesson as Luffarschack's win line: on win or loss, the word/drawing/keyboard stay visible and
  the result + "Nytt ord"/"Byt spel" buttons appear inline (`#hangman-result`) rather than switching
  screens; the keyboard just gets `disabled`.
- A wrong guess shakes the drawing (`shakeDrawing()`, a retriggerable CSS animation on
  `.hangman-drawing-wrap`) as the visual counterpart to the `playWrongGuess()`/`playLose()` sound.
- Winning shows a `sparkBurst()` on the revealed word.
- `pickRandomWord()` excludes the just-played word (`lastWord`) from the next round's random pick,
  so the same word can't repeat back-to-back.

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

## Agent-team workflow (experimental)

The user is experimenting with Claude Code's subagent delegation model on this project — the roles
below are scoped for a small dependency-free static game, not a general template. The main/
coordinating session acts as the point of contact with the user: breaks a request into steps,
delegates to the right subagent(s) below, and reports back a short summary (what changed, what's
still open, a suggested next step) rather than dumping every subagent's raw output.

Roles (`.claude/agents/`):
- **`builder`** — implements features/fixes per this file's conventions. Never commits on its own
  (this project only commits when the user explicitly asks — see the global git safety rules).
- **`game-designer`** — proposes gameplay/UI ideas and flows as markdown in `docs/design/`. Never
  touches code.
- **`sound-designer`** — proposes retro 8-bit sound effect ideas (Web Audio API oscillator beeps
  preferred over audio files, to keep the shipped app dependency-free) as markdown in `docs/design/`.
  Never touches code. The app currently has no sound at all.
- **`code-reviewer`** — reviews a finished change against this file's conventions and known pitfalls
  (see the gotcha sections above). Read-only; never edits code.
- **`qa-browser`** — writes/runs Playwright end-to-end tests in `tests/e2e/` against the real running
  app (`npm start`), across multiple screen widths. Never touches production code.

Typical per-feature flow: confirm scope with the user → `game-designer`/`sound-designer` propose
(when the feature has a real design/sound decision) → `builder` implements → `code-reviewer` and
`qa-browser` run → `builder` fixes any critical/high findings → summarize for the user.

Definition of done for a feature built this way: `npm run test:e2e` passing, and no unresolved
critical/high findings from `code-reviewer`.
