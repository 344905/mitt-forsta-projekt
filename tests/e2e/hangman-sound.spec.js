// Testar ljud-togglen (#sound-toggle-btn) och att rätt ljudfunktion
// spelas vid rätt/fel gissning och vinst i Hänga gubbe. Ljudet i sig
// (Web Audio API) går inte att "höra" i Playwright, så vi verifierar
// istället att rätt window-funktion (playCorrectGuess/playWrongGuess/
// playWin) faktiskt anropas, genom att apa in en räknare på dem innan
// en omgång körs.
const { test, expect } = require("@playwright/test");

// Stänger av service worker-registreringen i testerna. Appen laddar om
// sidan automatiskt när en ny service worker tar över (se script.js,
// "controllerchange") — det kan trigga mitt i ett page.evaluate() och
// spränga testet med "Execution context was destroyed". Vi testar inte
// service workern här, så vi slipper undan racet helt genom att göra
// navigator.serviceWorker.register till en no-op innan sidans egna
// scripts körs.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register = () => Promise.resolve({});
    }
  });
});

test.describe("Ljud-togglen (#sound-toggle-btn)", () => {
  test("är synlig uppe till vänster på introskärmen och överlappar inte #exit-btn", async ({ page }) => {
    await page.goto("/");
    const soundBtn = page.locator("#sound-toggle-btn");
    const exitBtn = page.locator("#exit-btn");
    await expect(soundBtn).toBeVisible();
    await expect(exitBtn).toBeVisible();

    const soundBox = await soundBtn.boundingBox();
    const exitBox = await exitBtn.boundingBox();
    expect(soundBox).not.toBeNull();
    expect(exitBox).not.toBeNull();

    // Positionerad uppe till vänster (inom en rimlig marginal från kanten).
    expect(soundBox.x).toBeLessThan(150);
    expect(soundBox.y).toBeLessThan(100);

    // Ska inte överlappa exit-knappen (som ligger uppe till höger).
    const overlaps =
      soundBox.x < exitBox.x + exitBox.width &&
      soundBox.x + soundBox.width > exitBox.x &&
      soundBox.y < exitBox.y + exitBox.height &&
      soundBox.y + soundBox.height > exitBox.y;
    expect(overlaps).toBe(false);
  });

  test("är synlig även inne i Hänga gubbe", async ({ page }) => {
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await page.locator("#select-hangman-btn").click();
    await expect(page.locator("#screen-hangman-game")).toHaveClass(/active/);
    await expect(page.locator("#sound-toggle-btn")).toBeVisible();
  });

  test("växlar aria-label och sparas i localStorage över en omladdning", async ({ page }) => {
    await page.goto("/");
    const soundBtn = page.locator("#sound-toggle-btn");

    // Utgångsläget är på (ingen sparad preferens ännu).
    await expect(soundBtn).toHaveAttribute("aria-label", "Stäng av ljud");
    let stored = await page.evaluate(() =>
      localStorage.getItem("rymdarkaden-sound-enabled")
    );
    expect(stored).toBeNull();

    await soundBtn.click();
    await expect(soundBtn).toHaveAttribute("aria-label", "Sätt på ljud");
    stored = await page.evaluate(() =>
      localStorage.getItem("rymdarkaden-sound-enabled")
    );
    expect(stored).toBe("off");

    await page.reload();
    await expect(page.locator("#sound-toggle-btn")).toHaveAttribute(
      "aria-label",
      "Sätt på ljud"
    );
    stored = await page.evaluate(() =>
      localStorage.getItem("rymdarkaden-sound-enabled")
    );
    expect(stored).toBe("off");

    // Växla tillbaka så vi inte läcker state mellan tester (varje test
    // får förvisso en egen browser-context i Playwright, men vi håller
    // det tydligt ändå).
    await page.locator("#sound-toggle-btn").click();
    await expect(page.locator("#sound-toggle-btn")).toHaveAttribute(
      "aria-label",
      "Stäng av ljud"
    );
  });
});

test.describe("Ljud under en omgång Hänga gubbe", () => {
  test("playCorrectGuess, playWrongGuess och playWin anropas vid rätt/fel/vinst", async ({ page }) => {
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await page.locator("#select-hangman-btn").click();
    await expect(page.locator("#screen-hangman-game")).toHaveClass(/active/);

    // Apa in räknare på ljudfunktionerna. De är globala funktioner på
    // window (inget modulsystem i appen), så vi kan bara skriva över dem
    // direkt i sidans context.
    await page.evaluate(() => {
      window.__soundCalls = { correct: 0, wrong: 0, win: 0, lose: 0 };
      window.playCorrectGuess = () => window.__soundCalls.correct++;
      window.playWrongGuess = () => window.__soundCalls.wrong++;
      window.playWin = () => window.__soundCalls.win++;
      window.playLose = () => window.__soundCalls.lose++;
    });

    // Starta en ny omgång direkt via spellogiken (istället för att klicka
    // sig fram) så vi styr precis vilka bokstäver som gissas.
    await page.evaluate(() => {
      startNewHangmanRound();
    });

    const word = await page.evaluate(() => hangmanState.word);
    expect(word.length).toBeGreaterThan(0);

    // En bokstav som garanterat INTE finns i ordet, för en säker felgissning.
    const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ".split("");
    const wrongLetter = ALPHABET.find((l) => !word.includes(l));
    expect(wrongLetter).toBeTruthy();

    // 1) En felgissning ska trigga playWrongGuess.
    await page.evaluate((letter) => guessLetter(letter), wrongLetter);
    let calls = await page.evaluate(() => window.__soundCalls);
    expect(calls.wrong).toBe(1);
    expect(calls.correct).toBe(0);
    expect(calls.win).toBe(0);

    // 2) Gissa resten av bokstäverna i ordet i tur och ordning. Alla utom
    // den sista ska trigga playCorrectGuess (den sista triggar playWin
    // istället, se guessLetter() i hangman.js).
    const uniqueLetters = [...new Set(word.split(""))];
    for (let i = 0; i < uniqueLetters.length; i++) {
      const letter = uniqueLetters[i];
      const isLast = i === uniqueLetters.length - 1;

      await page.evaluate((l) => guessLetter(l), letter);

      const status = await page.evaluate(() => hangmanState.status);
      calls = await page.evaluate(() => window.__soundCalls);

      if (isLast) {
        expect(status).toBe("won");
        expect(calls.win).toBe(1);
      } else {
        expect(calls.correct).toBeGreaterThan(0);
      }
    }

    // Facit: exakt en felgissning, exakt en vinst, och en korrekt gissning
    // för varje unik bokstav utom den sista (som räknas som vinst-ljud,
    // inte "correct guess"-ljud — se kommentaren i hangman.js).
    calls = await page.evaluate(() => window.__soundCalls);
    expect(calls.wrong).toBe(1);
    expect(calls.win).toBe(1);
    expect(calls.correct).toBe(uniqueLetters.length - 1);
    expect(calls.lose).toBe(0);

    // Resultatet ska visas inline, inte på en ny skärm.
    await expect(page.locator("#hangman-result")).not.toHaveClass(/hidden/);
    await expect(page.locator("#screen-hangman-game")).toHaveClass(/active/);
  });

  test("playLose anropas när man förlorar (9 felgissningar)", async ({ page }) => {
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await page.locator("#select-hangman-btn").click();

    await page.evaluate(() => {
      window.__soundCalls = { correct: 0, wrong: 0, win: 0, lose: 0 };
      window.playCorrectGuess = () => window.__soundCalls.correct++;
      window.playWrongGuess = () => window.__soundCalls.wrong++;
      window.playWin = () => window.__soundCalls.win++;
      window.playLose = () => window.__soundCalls.lose++;
    });

    await page.evaluate(() => {
      startNewHangmanRound();
    });

    const word = await page.evaluate(() => hangmanState.word);
    const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ".split("");
    const wrongLetters = ALPHABET.filter((l) => !word.includes(l)).slice(0, 9);
    expect(wrongLetters.length).toBe(9);

    for (const letter of wrongLetters) {
      await page.evaluate((l) => guessLetter(l), letter);
    }

    const status = await page.evaluate(() => hangmanState.status);
    expect(status).toBe("lost");

    const calls = await page.evaluate(() => window.__soundCalls);
    expect(calls.wrong).toBe(8);
    expect(calls.lose).toBe(1);
    expect(calls.win).toBe(0);
    expect(calls.correct).toBe(0);

    await expect(page.locator("#hangman-result")).not.toHaveClass(/hidden/);
  });
});
