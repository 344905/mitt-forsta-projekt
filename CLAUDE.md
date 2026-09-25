# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Rymdarkaden** — a small browser-based arcade with two games for two fixed players, John (green)
and Vera (magenta/purple), sharing a retro 80s/90s neon space look (pixel font, animated starfield,
chunky box-shadow borders): **Luffarschack** (tic-tac-toe, best-of-5 series) and **Hänga gubbe**
(Hangman, co-op letter-guessing). Hänga gubbe also drives a shared, non-competitive "space journey"
(`journey.js`) through a fixed sequence of themed planets — see "The space journey" below; Luffarschack
is untouched by it. A game-picker screen (`screen-game-select`) is the app's entry point, and every
screen in both games has a way back to it ("Byt spel"/back buttons) — don't add a screen without one.
This is the user's first-ever coding project — they are a complete beginner. When making changes,
explain what's happening and why in plain terms rather than assuming familiarity with web dev concepts.

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
  series-winner/play-again/goodbye, Hänga gubbe's single game screen, the album) lives as a sibling
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
  `script.js`: a `hangmanState` object + `render*()` functions. Words come from the current planet's
  list in `journey.js` (`pickRandomWord()`), not a file-local list — see "The space journey" below.
- **`journey.js`** — the shared space-journey state/data (`PLANETS`, fuel, per-planet word lists and
  picture clues) — see "The space journey" below.
- **`album.js`** — the shared word-collection screen built on top of the journey's planets — see
  "The album" below.
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
  the result + "Nytt ord"/"Tillbaka" buttons appear inline (`#hangman-result`) rather than switching
  screens; the keyboard just gets `disabled`.
- A wrong guess shakes the drawing (`shakeDrawing()`, a retriggerable CSS animation on
  `.hangman-drawing-wrap`) as the visual counterpart to the `playWrongGuess()`/`playLose()` sound.
- Winning shows a `sparkBurst()` on the revealed word.
- `pickRandomWord()` excludes the just-played word (`lastWord`) from the next round's random pick,
  so the same word can't repeat back-to-back.
- **Picture clue**: `#hangman-clue` (inside a `.hangman-stage` wrapper alongside
  `.hangman-drawing-wrap`) shows the current word's emoji, via `getWordPicture(word, planet)` in
  `journey.js` — this is the main support for a child who can't read the word yet. `WORD_PICTURES`
  only maps words with an unambiguous concrete emoji; anything else (and any word not in the map)
  falls back to `planet.icon`. Both maps are hand-curated to avoid two failure modes that look fine
  in isolation but are actively misleading in play: **(a)** a planet's fallback `icon` must never
  equal a real word's own dedicated picture on that planet (a kid seeing the fallback would think of
  the wrong word) — this is why the planet icons are deliberately generic/thematic (⚙️ for
  Robotplaneten, not 🤖, since `robot` is itself a word there) rather than a literal match; **(b)**
  no two words on the *same* planet share the same explicit picture. When two real words would
  otherwise collide (e.g. `boll`/`fotboll`, `hav`/`våg`), keep the picture on the more concrete one
  and let the other fall back to the planet icon — per the design doc, a shared/guessed picture is
  worse than the neutral fallback. If you add or edit `WORD_PICTURES`/planet icons, re-check both
  rules (there's no automated test for it; it was caught by manual review, not Playwright).
  - **(c)** Keep the fallback *rate* low, per planet — a real user (a child) reported that
    Dinosaurieplaneten's clues were "impossible to make out, same picture for several words": with
    only 8/19 words mapped, 11 different words all showed the same 🦖. Seeing one fallback icon is a
    reasonable "no picture" signal; seeing it for most of the words you play in a row just reads as
    broken. There's no fixed target, but double-digit percentages (see the per-planet ratios you can
    recompute with the one-liner below) should prompt you to look for more real pictures before
    accepting the rest as "genuinely abstract, no good emoji exists" (comparative adjectives like
    `stor`/`liten`, or a real object with no pre-2020 emoji, e.g. `hjul`/`tamburin`, are legitimate
    reasons to leave a word on the fallback; "I didn't look for one" isn't). A one-off check:
    `node -e 'const c=require("fs").readFileSync("journey.js","utf8")+"\nthis.P=PLANETS;this.W=WORD_PICTURES;"; const ctx={}; require("vm").createContext(ctx); require("vm").runInContext(c,ctx); ctx.P.forEach(p=>{const n=p.words.filter(w=>!Object.hasOwn(ctx.W,w.toLowerCase())).length; console.log(p.id, n+"/"+p.words.length)})'`
    — also re-run this (and the collision check two bullets up) after any future word-list edit,
    since removing a word can silently orphan its `WORD_PICTURES` entry or shift the ratio.
- **Missed-letter reveal**: on loss, `renderHangmanWord()` fills in the unguessed letters in place
  (class `.missed`) instead of only naming the word in the result text — letters you *did* find keep
  the normal `.revealed` style, so you can see what you got right. `.missed` uses `text-decoration:
  underline dashed`, not `border-bottom` — a border adds to the letter's box height and visibly
  shifts the line the instant the result appears; text-decoration doesn't affect layout. `.missed` is
  never red (red means "wrong" on the keyboard elsewhere) and is distinguished from `.revealed` by
  both color *and* the underline, not color alone. Letters fade in staggered via a `--i` custom
  property (`animation-delay: calc(var(--i) * 120ms)`), indexed only among the missed letters, set in
  `renderHangmanWord()` — compute `hangmanState.status` before calling it, not after, so it renders
  the outcome in one pass instead of two.
- **Turn badge, keyboard glow, praise bubble**: `renderHangmanTurnIndicator()` is the single place that
  keeps three things in sync with `hangmanState.currentPlayer` — the turn text, a small J/V `.turn-badge`,
  and `.hangman-keyboard`'s `john`/`vera` class (a thin outer glow; the cyan/red correct/wrong key colors
  are unrelated and untouched). It's called at both places `currentPlayer` changes: round start
  (random starting player) and mid-round turn switches — don't add a third place that changes
  `currentPlayer` without also calling it. `showPraiseBubble()`/`hidePraiseBubble()` show a short,
  absolutely-positioned bubble (adds zero layout height) naming the current guesser after a guess —
  stars for a correct guess (one per occurrence of the letter in the word, matching the count passed
  to `playCorrectGuess(count)`), none for a wrong one — but **never** on the round-deciding guess; the
  win/loss branch in `guessLetter()` calls `hidePraiseBubble()` itself so a stale bubble never sits
  next to the result text. **Product rule, not just a style choice**: nothing here is ever counted or
  stored per player — no tally in the DOM, no per-child key in `localStorage`. The bubble only ever
  reports the *current* guess, in the moment. This is the same "no comparison between John and Vera"
  rule behind rejecting "Rivalerna" below — if you're tempted to add a running total ("Vera: 5 rätt"),
  don't.
- `sparkBurst()` (script.js) takes optional `sparkCount` (default 10) and `maxDistance` (default 60,
  px) parameters. The per-letter praise sparks use a much shorter `maxDistance` (18px) than the
  word-win/series-win bursts — a single letter is a small target, and the full 40-60px range could
  fly a spark past the edge of a 320px screen from an edge letter on a long word (e.g. the last letter
  of "fjärrkontroll"), which is exactly the kind of momentary horizontal-scroll bug this file warns
  about elsewhere; it just wouldn't show up in a `scrollWidth` check taken after the 0.7s animation
  finishes.

### The space journey (`journey.js`)

John and Vera travel together through a fixed sequence of themed planets, driven entirely by Hänga
gubbe — Luffarschack is completely unaffected. This exists to make Hänga gubbe (spelling/letters)
feel rewarding to keep playing, and deliberately replaced an earlier "Rivalerna" idea (a persistent
John-vs-Vera stats row) that the user rejected: John and Vera are meaningfully different ages, so the
journey is **one shared progress**, not a per-player comparison — see the design discussion this
grew out of before touching `PLANETS`.

- `PLANETS` (in `journey.js`) is a fixed, ordered list of 12 themed planets, each with its own
  `words` list (used instead of a single global word list — `pickRandomWord()` in `hangman.js` reads
  from `getCurrentPlanet().words`) and its own `fuelNeeded`. The first two planets need 8 fuel
  (~4 rounds), the rest need 12 (~6 rounds) — short at first so the concept "clicks" quickly, longer
  once it already feels fun.
- Every **completed** round adds fuel via `addFuel()` — a win gives `FUEL_PER_WIN` (2), a **loss**
  still gives `FUEL_PER_LOSS` (1). This is deliberate: losing must never stall progress, only slow it
  down, to match the "encouraging, not punishing" principle established elsewhere in this file.
- `journeyState` (`{ planetIndex, fuel }`) persists to `localStorage`
  (`JOURNEY_STORAGE_KEY = "rymdarkaden-journey-v1"`) the same try/catch-guarded way `sound.js` saves
  the sound preference. It's one shared journey, not per-player.
- When fuel reaches the current planet's `fuelNeeded`, `hangman-again-btn`'s label changes from
  "Nytt ord" to "🚀 Lyft till nästa planet!" (`readyToLaunch`, set in `guessLetter()`) and clicking it
  runs `launchToNextPlanet()` instead of `startNewHangmanRound()` directly.
- `launchToNextPlanet()` plays an animated trip (not a new screen — same "stay on the board"
  principle as the win-line/result inline pattern) in `#hangman-launch-overlay`: the planet you're
  leaving on the **right**, the next planet on the **left** (the user's explicit choice), a rocket
  with flickering engine flames flying along an arc between them, and a trail drawn behind it in a
  gradient from the origin's to the destination's `sceneColor`. The SVG comes from
  `buildTravelSceneSVG()` in `journey.js` (planet looks/patterns in `PLANET_LOOKS`/`PLANET_PATTERNS`);
  the motion is a `requestAnimationFrame` loop in `hangman.js` (`TRAVEL_DURATION_MS`, ~5 s, eased),
  positioning the rocket with `getPointAtLength()` — tapping the overlay skips straight to landing.
  Sounds: `playRocketLaunch()`/`playLanding()` in `sound.js`.
  - `advanceToNextPlanet()` is called at **launch**, not landing, so a reload mid-trip lands on the
    new planet instead of refunding the fuel. It wraps back to planet 0 after the last planet so the
    journey never dead-ends (the trip text then says "Hela galaxen utforskad!").
  - If the player pressed Avsluta during the trip, landing calls
    `startNewHangmanRound({ switchScreen: false })` — the round is prepared but the player is **not**
    yanked back from the exit-confirmation screen. Keep this guard if you touch the trip.
  - The overlay uses `inset: -14px`, not `0`: the keyboard's glow outlines and the heading's
    text-shadow poke a few px outside the screen's own box and showed through the edges otherwise.
- The "on a planet" vs. "in space" visual distinction (as requested) is done by toggling
  `#app.on-planet` and setting the `--planet-bg` CSS custom property to the current planet's gradient
  (`renderPlanetBackdrop()`/`renderSpaceBackdrop()`) — **not** by touching the shared `#starfield`
  canvas, which stays exactly as-is everywhere. Same CSS-custom-property lesson as the win line: JS
  sets the variable, the stylesheet rule reads it. That rule is
  `#app.on-planet[data-screen="screen-hangman-game"]` — `showScreen()` (script.js) writes the active
  screen id to `#app`'s `data-screen`, so the tint only shows while Hänga gubbe is actually on screen.
  (`.on-planet` alone leaked the tint onto the exit-confirm, goodbye and game-select screens when
  leaving via Avsluta.) `.on-planet` itself means "landed, not travelling" and is still managed only
  by hangman.js.
- A small always-visible status line (`#game-select-journey-status`) mirrors the current planet/fuel
  on the game-select screen, so the journey is visible even before opening Hänga gubbe.
- Each planet also gets a small silhouette **scene** (`SCENE_SHAPES`/`buildPlanetSceneSVG()` in
  `journey.js`, e.g. a fence+barn+trees for Djurplaneten, mountains+a volcano for Dinosaurieplaneten)
  rendered by `renderPlanetScene()` into `#hangman-planet-scene`, positioned **behind the hangman
  drawing itself** (`.hangman-drawing-wrap`, `position: absolute; inset: 0; z-index: -1`) — not as a
  strip at the bottom of the screen, which was tried first and mostly ended up hidden behind the
  keyboard. The scene's SVG viewBox (`0 0 200 220`) deliberately matches `.hangman-drawing-wrap`'s own
  `aspect-ratio: 200 / 220` so shapes scale proportionally instead of being stretched.
  `.hangman-drawing-wrap` needs `isolation: isolate` for this — a `position: relative` ancestor alone
  does **not** create a new stacking context, so a `z-index: -1` child without it can escape to a
  further-out ancestor's stacking context instead of staying behind just its intended siblings.

### The album (`album.js`)

A **shared** (not per-player, same "Rivalerna" rule as the journey above) collection of every word
John and Vera have discovered in Hänga gubbe — win or loss counts as "discovered", since the point is
what they've seen spelled out, not who guessed it. Reached from `screen-game-select`'s "📖 Rymdalbum"
button, its own screen `screen-album`, back to game-select via `Tillbaka`.

- `albumState` (`{ [planetId]: ["hund", ...] }`, lowercase words) persists to `localStorage`
  (`ALBUM_STORAGE_KEY = "rymdarkaden-album-v1"`) via the same try/catch load/save pattern as
  `journey.js`. **`loadAlbumState()` validates the shape of what it loads** (every value must be an
  array of strings, otherwise that planet's entry is dropped) — a plain `typeof === "object"` check
  isn't enough here, because `recordDiscoveredWord()` is called from inside `guessLetter()`'s win/loss
  branch; if it threw on malformed data, the round would never show its result. A parse/shape problem
  must only ever cost the album, never break the game it's called from.
- `recordDiscoveredWord(planetId, word)` is called once per completed round (win or loss) from
  `guessLetter()`, right next to where fuel is already awarded — no separate "did the round just end"
  check needed, and it's safe to call because `getCurrentPlanet()` at that point is still the planet
  the round was actually played on (`advanceToNextPlanet()` only runs later, from
  `launchToNextPlanet()`, never from `addFuel()`).
- Word lists do get edited (it's already happened once). `getDiscoveredWordsForPlanet(planet)` filters
  saved words against that planet's **current** `words` list before counting/displaying anything, so a
  word removed from a list later can't inflate the "N av M" count past M or keep a planet marked
  "visited" for a word that's no longer there.
- `getVisitedPlanetIds()` is the only planets the `◀`/`▶` arrows in `screen-album` can reach — a planet
  with zero discovered words is never shown, not even as "locked". `albumCurrentPlanetId` is reset to
  `null` when the album is opened (not just once ever) so it re-derives its default (the planet you're
  currently travelling to, if already visited, else the first visited one) even if the journey has
  moved on since the album was last open.
- A word longer than 8 characters gets `.album-card.wide` (`grid-column: span 2`) instead of letting
  `overflow-wrap: anywhere` break it mid-word — this is a reading-practice screen, so a word like
  "fjärrkontroll" splitting across two lines defeats the point.
- `screen-album` deliberately gets no planet color tint: the `#app.on-planet[data-screen=...]` rule
  (see above) only matches `data-screen="screen-hangman-game"`.

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
