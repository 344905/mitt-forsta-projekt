// Täcker det kända testgapet som beskrivs i CLAUDE.md ("Known gap"): alla
// andra spec-filer driver spellogiken genom att anropa interna JS-funktioner
// direkt via page.evaluate (placeMark(), guessLetter(), movePiece()) — det
// övar aldrig de RIKTIGA event-lyssnarna i script.js
// (handlePointerDown/handlePointerMove/handlePointerUp, kopplade via
// cell.addEventListener("pointerdown", ...) i buildBoardUI()) eller
// tangentbordsknapparna i hangman.js.
//
// Den här filen kör därför riktiga pekar-/touch-händelser istället:
//   1. locator.tap() på en bokstavsknapp i Hänga gubbe.
//   2. locator.tap() på en tom ruta under Luffarschacks placeringsfas.
//   3. En riktig sekvens av dispatchade PointerEvents (pointerType: "touch")
//      som efterliknar en faktisk dra-gest, för att öva
//      handlePointerDown/handlePointerMove/handlePointerUp,
//      setPointerCapture och cellIndexFromPoint på riktigt.
//   4. Samma sak men som två separata tryck-och-släpp-sekvenser (två-tryck-
//      läget/tillgänglighetsfallbacken), inte en sammanhängande dragrörelse.
//
// locator.tap() kräver hasTouch: true i kontexten (annars kastar Playwright
// ett fel), så alla test i den här filen hoppas helt över på chromium/webkit
// (som saknar touch) och körs bara på android-samsung/
// android-oneplus-liknande — se test.skip(...) nedan. Det matchar också vad
// filen faktiskt ska bevisa: att touch-flödet fungerar på riktiga
// mobilprofiler, inte att det går att tvinga fram touch-liknande events på
// en desktop-motor.
const { test, expect } = require("@playwright/test");

// Hela filen är touch-specifik: hoppa över den på projekt utan touch
// (chromium, webkit). isMobile speglar exakt hasTouch för de fyra
// projekten i playwright.config.js (båda Android-profilerna sätter
// isMobile: true och hasTouch: true, chromium/webkit sätter båda till
// false), så den fångar samma sak som ett direkt hasTouch-villkor hade
// gjort utan att behöva gräva i testInfo.project.use.
test.skip(({ isMobile }) => !isMobile, "kräver riktig touch (hasTouch) — körs bara på android-projekten");

// Samma skäl som i övriga spec-filer: stäng av service worker-
// registreringen så en automatisk omladdning ("controllerchange") inte kan
// spränga ett page.evaluate() mitt i testet med "Execution context was
// destroyed".
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register = () => Promise.resolve({});
    }
  });
});

// Navigerar fram till en nystartad Luffarschack-match (screen-game aktiv).
async function startLuffarschack(page) {
  await page.goto("/");
  await page.locator("#screen-intro").click();
  await page.locator("#select-tictactoe-btn").click();
  await expect(page.locator("#screen-welcome")).toHaveClass(/active/);
  await page.locator("#start-btn").click();
  await expect(page.locator("#screen-game")).toHaveClass(/active/);
}

// Bygger upp en bräd-position via state direkt (det är okej att sätta upp
// FÖRUTSÄTTNINGEN så — se uppdragsbeskrivningen: poängen med drag-/två-
// tryck-testerna är att öva själva pekarhanteringen när dra-fasen redan är
// nådd, inte att på nytt bevisa att placeringsfasen fungerar, det gör test 2
// redan med riktiga tap-händelser).
async function setupMovePhaseBoard(page, { board, currentPlayer }) {
  await page.evaluate(
    ({ board, currentPlayer }) => {
      state.board = board;
      state.currentPlayer = currentPlayer;
      state.selectedIndex = null;
      renderBoard();
      renderTurnIndicator();
    },
    { board, currentPlayer }
  );
}

// Apar in en räknare på playDragMove, precis som luffarschack-sound.spec.js
// gör för de andra ljudfunktionerna.
async function mockPlayDragMove(page) {
  await page.evaluate(() => {
    window.__dragMoveCalls = [];
    window.playDragMove = (player) => window.__dragMoveCalls.push(player);
  });
}

// Dispatchar en riktig sekvens av PointerEvents (pointerType: "touch") som
// efterliknar en sammanhängande dra-gest: pointerdown på källrutan,
// pointermove i några steg mot målrutan (dispatchat på brädet, precis som
// handlePointerDown:s boardEl.addEventListener("pointermove", ...) lyssnar
// på), och till sist pointerup på målrutan. Det här är INTE
// page.evaluate(() => movePiece(...)) — det är de riktiga DOM-händelserna
// som handlePointerDown/handlePointerMove/handlePointerUp i script.js
// faktiskt lyssnar på, så setPointerCapture och cellIndexFromPoint övas på
// riktigt.
async function dispatchRealDrag(page, fromIndex, toIndex) {
  await page.evaluate(
    ({ fromIndex, toIndex }) => {
      const board = document.getElementById("board");
      const fromCell = board.querySelector(`.cell[data-index="${fromIndex}"]`);
      const toCell = board.querySelector(`.cell[data-index="${toIndex}"]`);
      const fromRect = fromCell.getBoundingClientRect();
      const toRect = toCell.getBoundingClientRect();
      const from = { x: fromRect.left + fromRect.width / 2, y: fromRect.top + fromRect.height / 2 };
      const to = { x: toRect.left + toRect.width / 2, y: toRect.top + toRect.height / 2 };

      const base = {
        pointerId: 1,
        pointerType: "touch",
        isPrimary: true,
        button: 0,
        buttons: 1,
        bubbles: true,
        cancelable: true,
      };

      fromCell.dispatchEvent(
        new PointerEvent("pointerdown", { ...base, clientX: from.x, clientY: from.y })
      );

      // Flytta pekaren i några steg mot målet, som ett riktigt finger skulle
      // göra, istället för att hoppa direkt dit.
      const steps = 4;
      for (let i = 1; i <= steps; i++) {
        const x = from.x + (to.x - from.x) * (i / steps);
        const y = from.y + (to.y - from.y) * (i / steps);
        board.dispatchEvent(
          new PointerEvent("pointermove", { ...base, clientX: x, clientY: y })
        );
      }

      toCell.dispatchEvent(
        new PointerEvent("pointerup", { ...base, buttons: 0, clientX: to.x, clientY: to.y })
      );
    },
    { fromIndex, toIndex }
  );
}

// Dispatchar en enskild "tryck och släpp" (pointerdown + pointerup) på samma
// ruta, utan någon rörelse emellan — det två-tryck-fallbacken bygger på
// (tryck på egen bricka för att markera den, tryck på en tom ruta som mål).
async function dispatchRealTap(page, index) {
  await page.evaluate((index) => {
    const board = document.getElementById("board");
    const cell = board.querySelector(`.cell[data-index="${index}"]`);
    const rect = cell.getBoundingClientRect();
    const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

    const base = {
      pointerId: 1,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      buttons: 1,
      bubbles: true,
      cancelable: true,
    };

    cell.dispatchEvent(new PointerEvent("pointerdown", { ...base, clientX: point.x, clientY: point.y }));
    cell.dispatchEvent(new PointerEvent("pointerup", { ...base, buttons: 0, clientX: point.x, clientY: point.y }));
  }, index);
}

test.describe("Hänga gubbe: tap på tangentbordet (riktig touch)", () => {
  test("tap på en bokstavsknapp registrerar gissningen genom det riktiga click-flödet", async ({ page }) => {
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await page.locator("#select-hangman-btn").click();
    await expect(page.locator("#screen-hangman-game")).toHaveClass(/active/);

    const word = await page.evaluate(() => hangmanState.word);
    const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ".split("");
    const correctLetter = word[0];
    const wrongLetter = ALPHABET.find((l) => !word.includes(l));
    expect(wrongLetter).toBeTruthy();

    // Tap (riktig touch-dispatch, inte page.evaluate(() => guessLetter(...)))
    // på en bokstav som garanterat finns i ordet.
    await page.locator(`.hangman-key[data-letter="${correctLetter}"]`).tap();

    const guessedAfterCorrect = await page.evaluate(() => hangmanState.guessedLetters);
    expect(guessedAfterCorrect).toContain(correctLetter);
    await expect(page.locator("#hangman-word")).toContainText(correctLetter);

    // Tap på en bokstav som garanterat INTE finns i ordet -> wrongGuesses
    // ska öka, läst från DOM/state efteråt — inte genom att kalla
    // guessLetter() själva.
    const wrongBefore = await page.evaluate(() => hangmanState.wrongGuesses);
    await page.locator(`.hangman-key[data-letter="${wrongLetter}"]`).tap();

    const wrongAfter = await page.evaluate(() => hangmanState.wrongGuesses);
    expect(wrongAfter).toBe(wrongBefore + 1);
    const guessedAfterWrong = await page.evaluate(() => hangmanState.guessedLetters);
    expect(guessedAfterWrong).toContain(wrongLetter);
  });
});

test.describe("Luffarschack: tap för att placera en bricka (riktig touch)", () => {
  test("tap på en tom ruta under placeringsfasen lägger faktiskt ut en bricka", async ({ page }) => {
    await startLuffarschack(page);

    const currentPlayer = await page.evaluate(() => state.currentPlayer);
    const emptyIndex = 0;

    // Riktig touch-tap (Playwright dispatchar äkta touch-händelser via
    // hasTouch-kontexten) på en tom ruta — inte page.evaluate(() =>
    // placeMark(...)).
    await page.locator(`.cell[data-index="${emptyIndex}"]`).tap();

    const board = await page.evaluate(() => state.board);
    expect(board[emptyIndex]).toBe(currentPlayer);
    await expect(page.locator(`.cell[data-index="${emptyIndex}"]`)).toHaveText(
      currentPlayer === "John" ? "X" : "O"
    );
  });
});

test.describe("Luffarschack: riktig dra-gest i dra-fasen (det egentliga gapet)", () => {
  test("en sammanhängande pointerdown/pointermove/pointerup-sekvens flyttar faktiskt en bricka", async ({ page }) => {
    await startLuffarschack(page);

    // John har redan 3 brickor ute ({0,1,8}) -> dra-fas. Vera har 2 ({3,4}),
    // ingen av spelarna har vunnit. Ruta 2 är tom och blir målet för draget.
    await setupMovePhaseBoard(page, {
      board: ["John", "John", null, "Vera", "Vera", null, null, null, "John"],
      currentPlayer: "John",
    });
    expect(await page.evaluate(() => isMovePhase(state.currentPlayer))).toBe(true);

    await mockPlayDragMove(page);

    await dispatchRealDrag(page, 0, 2);

    const board = await page.evaluate(() => state.board);
    expect(board[0]).toBeNull();
    expect(board[2]).toBe("John");
    // Brickan som INTE flyttades ska fortfarande stå kvar.
    expect(board[8]).toBe("John");

    const dragCalls = await page.evaluate(() => window.__dragMoveCalls);
    expect(dragCalls).toEqual(["John"]);

    await expect(page.locator('.cell[data-index="2"]')).toHaveText("X");
    await expect(page.locator('.cell[data-index="0"]')).toHaveText("");
  });
});

test.describe("Luffarschack: två-tryck-fallback med riktiga events", () => {
  test("tryck på egen bricka, sedan tryck på tom ruta, flyttar brickan utan sammanhängande drag", async ({ page }) => {
    await startLuffarschack(page);

    await setupMovePhaseBoard(page, {
      board: ["John", "John", null, "Vera", "Vera", null, null, null, "John"],
      currentPlayer: "John",
    });
    expect(await page.evaluate(() => isMovePhase(state.currentPlayer))).toBe(true);

    await mockPlayDragMove(page);

    // Steg 1: tryck (pointerdown+pointerup, ingen rörelse) på en egen
    // bricka -> ska bara MARKERA den (state.selectedIndex), inte flytta den.
    await dispatchRealTap(page, 0);

    let selected = await page.evaluate(() => state.selectedIndex);
    expect(selected).toBe(0);
    let board = await page.evaluate(() => state.board);
    expect(board[0]).toBe("John"); // fortfarande kvar, inget drag skedde

    // Steg 2: en helt separat tryck-sekvens på en tom ruta -> ska nu
    // tolkas som destinationen och faktiskt flytta brickan dit.
    await dispatchRealTap(page, 2);

    board = await page.evaluate(() => state.board);
    expect(board[0]).toBeNull();
    expect(board[2]).toBe("John");
    expect(board[8]).toBe("John");

    selected = await page.evaluate(() => state.selectedIndex);
    expect(selected).toBeNull();

    const dragCalls = await page.evaluate(() => window.__dragMoveCalls);
    expect(dragCalls).toEqual(["John"]);

    await expect(page.locator('.cell[data-index="2"]')).toHaveText("X");
    await expect(page.locator('.cell[data-index="0"]')).toHaveText("");
  });
});
