// Testar Luffarschacks nya ljud (iteration 2, ovanpå Hänga gubbes befintliga
// ljud från iteration 1): playPlaceMark, playDragMove, playMatchWin och
// playSeriesWin. Precis som i hangman-sound.spec.js går det inte att "höra"
// Web Audio API-ljud i Playwright, så vi apar in en räknare (som en lista av
// {fn, player}-poster, i anropsordning) på ljudfunktionerna och driver spelet
// direkt via state/spellogik-funktionerna i script.js istället för via
// riktiga pekarhändelser, för deterministiska drag.
const { test, expect } = require("@playwright/test");

// Samma skäl som i hangman-sound.spec.js: stäng av service worker-
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

// Apar in räknare på de fyra Luffarschack-ljuden. Delad helper så varje
// test-case slipper upprepa samma boilerplate.
async function mockLuffarschackSounds(page) {
  await page.evaluate(() => {
    window.__soundCalls = [];
    window.playPlaceMark = (player) => window.__soundCalls.push({ fn: "playPlaceMark", player });
    window.playDragMove = (player) => window.__soundCalls.push({ fn: "playDragMove", player });
    window.playMatchWin = (player) => window.__soundCalls.push({ fn: "playMatchWin", player });
    window.playSeriesWin = (player) => window.__soundCalls.push({ fn: "playSeriesWin", player });
  });
}

// Navigerar fram till en nystartad Luffarschack-match (screen-game aktiv).
async function startLuffarschack(page) {
  await page.goto("/");
  await page.locator("#screen-intro").click();
  await page.locator("#select-tictactoe-btn").click();
  await expect(page.locator("#screen-welcome")).toHaveClass(/active/);
  await page.locator("#start-btn").click();
  await expect(page.locator("#screen-game")).toHaveClass(/active/);
}

test.describe("Luffarschack-ljud: placera brickor", () => {
  test("playPlaceMark anropas med rätt spelare för varje placering", async ({ page }) => {
    await startLuffarschack(page);
    await mockLuffarschackSounds(page);

    // Se till att vi vet vem som börjar, oavsett den slumpade nextStarter.
    await page.evaluate(() => {
      state.currentPlayer = "John";
    });

    await page.evaluate(() => placeMark(0)); // John
    await page.evaluate(() => placeMark(3)); // Vera

    const calls = await page.evaluate(() => window.__soundCalls);
    expect(calls).toEqual([
      { fn: "playPlaceMark", player: "John" },
      { fn: "playPlaceMark", player: "Vera" },
    ]);

    const board = await page.evaluate(() => state.board);
    expect(board[0]).toBe("John");
    expect(board[3]).toBe("Vera");
  });
});

test.describe("Luffarschack-ljud: dra-fas (ingen oavgjord-regel)", () => {
  test("playDragMove anropas istället för playPlaceMark när en spelare har 3 brickor ute", async ({ page }) => {
    await startLuffarschack(page);
    await mockLuffarschackSounds(page);

    await page.evaluate(() => {
      state.currentPlayer = "John";
    });

    // Bygger upp brädet så att John får 3 brickor ute ({0,1,8}) utan att
    // någon vinner på vägen (varken John eller Vera bildar en vinstlinje).
    // Turordningen alternerar automatiskt via finishTurn().
    await page.evaluate(() => {
      placeMark(0); // John
      placeMark(3); // Vera
      placeMark(1); // John
      placeMark(4); // Vera
      placeMark(8); // John -> John har nu 3 brickor ute ({0,1,8}), ingen vinst
      placeMark(6); // Vera -> Vera har nu 3 brickor ute ({3,4,6}), ingen vinst
    });

    // Nu är det Johns tur igen, och John måste dra istället för att placera.
    const currentPlayer = await page.evaluate(() => state.currentPlayer);
    expect(currentPlayer).toBe("John");
    const movePhase = await page.evaluate(() => isMovePhase(state.currentPlayer));
    expect(movePhase).toBe(true);

    const callsBeforeMove = await page.evaluate(() => window.__soundCalls.length);
    expect(callsBeforeMove).toBe(6); // 6 placeMark-anrop hittills, inga dragMove ännu

    // Drar en av Johns brickor (ruta 0) till en tom ruta (ruta 2) istället
    // för att placera en ny.
    await page.evaluate(() => movePiece(0, 2));

    const calls = await page.evaluate(() => window.__soundCalls);
    expect(calls.length).toBe(7);
    expect(calls[6]).toEqual({ fn: "playDragMove", player: "John" });

    // Inget nytt playPlaceMark-anrop tillkom för draget.
    const placeMarkCalls = calls.filter((c) => c.fn === "playPlaceMark");
    expect(placeMarkCalls.length).toBe(6);

    const board = await page.evaluate(() => state.board);
    expect(board[0]).toBeNull();
    expect(board[2]).toBe("John");
  });
});

test.describe("Luffarschack-ljud: matchvinst", () => {
  test("playMatchWin anropas med vinnarens namn när en match avgörs", async ({ page }) => {
    await startLuffarschack(page);
    await mockLuffarschackSounds(page);

    await page.evaluate(() => {
      state.currentPlayer = "John";
    });

    // John vinner på översta raden (0,1,2), Vera placerar två icke-vinnande
    // brickor emellan.
    await page.evaluate(() => {
      placeMark(0); // John
      placeMark(3); // Vera
      placeMark(1); // John
      placeMark(4); // Vera
      placeMark(2); // John -> vinstlinje [0,1,2]
    });

    const calls = await page.evaluate(() => window.__soundCalls);
    const matchWinCalls = calls.filter((c) => c.fn === "playMatchWin");
    expect(matchWinCalls).toEqual([{ fn: "playMatchWin", player: "John" }]);

    const scores = await page.evaluate(() => state.scores);
    expect(scores.John).toBe(1);

    await expect(page.locator("#round-result")).not.toHaveClass(/hidden/);
    await expect(page.locator("#round-result-text")).toContainText("John vann match");
  });
});

test.describe("Luffarschack-ljud: serievinst", () => {
  test("playSeriesWin anropas med vinnarens namn efter playMatchWin, inte istället för det", async ({ page }) => {
    await startLuffarschack(page);
    await mockLuffarschackSounds(page);

    // Simulerar att John redan vunnit 2 av de tidigare matcherna i serien
    // (samma manuella teknik som använts tidigare i den här sessionen för
    // att sätta upp state.scores direkt, istället för att spela ut 2 hela
    // matcher i onödan).
    await page.evaluate(() => {
      state.scores = { John: 2, Vera: 0 };
      state.currentPlayer = "John";
    });

    // John vinner den tredje (avgörande) matchen på översta raden.
    await page.evaluate(() => {
      placeMark(0); // John
      placeMark(3); // Vera
      placeMark(1); // John
      placeMark(4); // Vera
      placeMark(2); // John -> vinstlinje [0,1,2], John når 3 matchvinster
    });

    let calls = await page.evaluate(() => window.__soundCalls);
    expect(calls.filter((c) => c.fn === "playMatchWin")).toEqual([
      { fn: "playMatchWin", player: "John" },
    ]);
    expect(calls.filter((c) => c.fn === "playSeriesWin")).toEqual([]);

    const scores = await page.evaluate(() => state.scores);
    expect(scores.John).toBe(3);

    // "Nästa match"-knappen avgör nu istället att hela serien är vunnen.
    await page.locator("#next-round-btn").click();
    await expect(page.locator("#screen-series-winner")).toHaveClass(/active/);

    calls = await page.evaluate(() => window.__soundCalls);

    // Båda ljuden ska ha spelats exakt en gång var, och playSeriesWin ska
    // ha kommit efter playMatchWin i anropsordningen — inte ersatt det.
    const matchWinCalls = calls.filter((c) => c.fn === "playMatchWin");
    const seriesWinCalls = calls.filter((c) => c.fn === "playSeriesWin");
    expect(matchWinCalls).toEqual([{ fn: "playMatchWin", player: "John" }]);
    expect(seriesWinCalls).toEqual([{ fn: "playSeriesWin", player: "John" }]);

    const matchWinIndex = calls.findIndex((c) => c.fn === "playMatchWin");
    const seriesWinIndex = calls.findIndex((c) => c.fn === "playSeriesWin");
    expect(matchWinIndex).toBeGreaterThanOrEqual(0);
    expect(seriesWinIndex).toBeGreaterThan(matchWinIndex);

    await expect(page.locator("#winner-banner")).toContainText("Grattis John");
  });
});
