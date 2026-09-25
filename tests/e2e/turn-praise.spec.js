// Testar Iteration 2 ("Din tur, och bra jobbat!", se
// docs/design/2026-09-25-produktteam-3-iterationer.md, avsnitt "ITERATION 2",
// och ljudspecen docs/design/2026-09-25-ljud-tur-berom.md): turmärket (J/V)
// i #hangman-turn-indicator, tangentbordets john/vera-glöd, berömbubblan vid
// rätt/fel gissning (med en ⭐ per förekomst av bokstaven) och den nya
// playCorrectGuess(count)-signaturen. De grova acceptanskriterierna under
// "ITERATION 2" i det dokumentet är facit för den här filen.
const { test, expect } = require("@playwright/test");

// Samma no-op som övriga spec-filer (se hangman-sound.spec.js/word-clue.spec.js):
// stäng av service worker-registreringen så en automatisk omladdning
// ("controllerchange") inte spränger ett page.evaluate() mitt i testet.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register = () => Promise.resolve({});
    }
  });
});

// Samma winRound/loseRound-mönster som journey.spec.js/word-clue.spec.js.
async function winRound(page) {
  await page.evaluate(() => {
    const word = hangmanState.word;
    for (const letter of new Set(word.split(""))) {
      if (!hangmanState.guessedLetters.includes(letter)) guessLetter(letter);
    }
  });
}

async function loseRound(page) {
  await page.evaluate(() => {
    const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ".split("");
    const wrongLetters = ALPHABET.filter((l) => !hangmanState.word.includes(l)).slice(0, 9);
    for (const letter of wrongLetters) {
      if (hangmanState.status === "playing") guessLetter(letter);
    }
  });
}

async function goToHangman(page) {
  await page.goto("/");
  await page.locator("#screen-intro").click();
  await page.locator("#select-hangman-btn").click();
  await expect(page.locator("#screen-hangman-game")).toHaveClass(/active/);
}

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    overflow.scrollWidth,
    `scrollWidth (${overflow.scrollWidth}) ska vara <= innerWidth (${overflow.innerWidth})`
  ).toBeLessThanOrEqual(overflow.innerWidth);
}

// Läser av turmärket + tangentbordets klass och jämför med hangmanState.currentPlayer.
async function readTurnState(page) {
  return page.evaluate(() => {
    const badge = document.querySelector("#hangman-turn-indicator .turn-badge");
    const keyboard = document.getElementById("hangman-keyboard");
    return {
      currentPlayer: hangmanState.currentPlayer,
      badgeText: badge ? badge.textContent : null,
      badgeIsJohn: badge ? badge.classList.contains("john") : false,
      badgeIsVera: badge ? badge.classList.contains("vera") : false,
      keyboardIsJohn: keyboard.classList.contains("john"),
      keyboardIsVera: keyboard.classList.contains("vera"),
    };
  });
}

async function expectTurnStateMatchesCurrentPlayer(page) {
  const s = await readTurnState(page);
  if (s.currentPlayer === "John") {
    expect(s.badgeText).toBe("J");
    expect(s.badgeIsJohn).toBe(true);
    expect(s.badgeIsVera).toBe(false);
    expect(s.keyboardIsJohn).toBe(true);
    expect(s.keyboardIsVera).toBe(false);
  } else {
    expect(s.badgeText).toBe("V");
    expect(s.badgeIsVera).toBe(true);
    expect(s.badgeIsJohn).toBe(false);
    expect(s.keyboardIsVera).toBe(true);
    expect(s.keyboardIsJohn).toBe(false);
  }
}

// Tvingar fram ordet BANAN (samma exempel som designdokumentet använder:
// "A i BANAN → ⭐⭐") via hangmanState direkt, precis som word-clue.spec.js
// gör med FJÄRRKONTROLL för sina egna längd-tester. BANAN finns i journey.js
// på Matplaneten, men vi sätter ordet direkt så testet inte är beroende av
// vilken planet man råkar stå på.
async function forceWordBanan(page) {
  await page.evaluate(() => {
    hangmanState.word = "BANAN";
    hangmanState.guessedLetters = [];
    hangmanState.wrongGuesses = 0;
    hangmanState.status = "playing";
    hangmanState.currentPlayer = "Vera";
    renderHangmanWord();
    renderHangmanClue();
    renderHangmanDrawing();
    renderHangmanKeyboard();
    renderHangmanTurnIndicator();
  });
}

test.describe("Turmärke (J/V) matchar currentPlayer", () => {
  test("vid omgångens start", async ({ page }) => {
    await goToHangman(page);
    await expectTurnStateMatchesCurrentPlayer(page);
  });

  test("efter flera tur-växlingar mitt i omgången (blandade rätt/fel gissningar)", async ({ page }) => {
    await goToHangman(page);
    // Tvinga ett ord med minst 4 unika bokstäver, så vi kan gissa flera
    // icke-avgörande bokstäver i rad och se turen växla varje gång.
    await page.evaluate(() => {
      hangmanState.word = "GITARR";
      hangmanState.guessedLetters = [];
      hangmanState.wrongGuesses = 0;
      hangmanState.status = "playing";
      hangmanState.currentPlayer = "John";
      renderHangmanWord();
      renderHangmanDrawing();
      renderHangmanKeyboard();
      renderHangmanTurnIndicator();
    });

    await expectTurnStateMatchesCurrentPlayer(page);

    // En rätt gissning (G), en fel gissning (Q, finns inte i GITARR) — turen
    // ska växla i båda fallen (co-op: se CLAUDE.md "alternating regardless
    // of whether the guess was right or wrong").
    for (const letter of ["G", "Q", "I"]) {
      await page.evaluate((l) => guessLetter(l), letter);
      const status = await page.evaluate(() => hangmanState.status);
      expect(status, "omgången ska fortfarande pågå för dessa gissningar").toBe("playing");
      await expectTurnStateMatchesCurrentPlayer(page);
    }
  });
});

test.describe("Berömbubbla vid rätt gissning", () => {
  test("visas med gissarens namn/klass och en ⭐ per förekomst (A i BANAN → ⭐⭐)", async ({ page }) => {
    await goToHangman(page);
    await forceWordBanan(page);

    await page.evaluate(() => guessLetter("A"));

    const bubble = page.locator(".praise-bubble");
    await expect(bubble).toBeVisible();
    await expect(bubble).toHaveClass(/vera/);

    const text = await bubble.locator(".praise-bubble-text").textContent();
    expect(text).toContain("Vera");

    const stars = await bubble.locator(".praise-bubble-stars").textContent();
    expect(stars).toBe("⭐⭐");
  });

  test("en bokstav som bara förekommer en gång ger exakt en ⭐", async ({ page }) => {
    await goToHangman(page);
    await forceWordBanan(page);

    // B förekommer bara en gång i BANAN.
    await page.evaluate(() => guessLetter("B"));

    const stars = await page.locator(".praise-bubble .praise-bubble-stars").textContent();
    expect(stars).toBe("⭐");
  });

  test("bubblan är dold igen efter ca 1,2–2 s", async ({ page }) => {
    await goToHangman(page);
    await forceWordBanan(page);

    await page.evaluate(() => guessLetter("B"));
    await expect(page.locator(".praise-bubble")).toBeVisible();
    await expect(page.locator(".praise-bubble")).toHaveCount(0, { timeout: 2000 });
  });
});

test.describe("Berömbubbla vid fel gissning", () => {
  test("'Bra försök!' i gissarens färg, helt utan stjärnor", async ({ page }) => {
    await goToHangman(page);
    await forceWordBanan(page);

    // X finns inte i BANAN.
    await page.evaluate(() => guessLetter("X"));

    const bubble = page.locator(".praise-bubble");
    await expect(bubble).toBeVisible();
    await expect(bubble).toHaveClass(/vera/);

    const text = await bubble.locator(".praise-bubble-text").textContent();
    expect(text).toBe("Bra försök!");

    const starsCount = await bubble.locator(".praise-bubble-stars").count();
    expect(starsCount).toBe(0);
  });
});

test.describe("Ingen bubbla på den gissning som avgör omgången", () => {
  test("vinst: ingen bubbla på den sista, avgörande rätta bokstaven", async ({ page }) => {
    await goToHangman(page);
    await forceWordBanan(page);

    // Gissa alla unika bokstäver utom en — en bubbla ska synas här.
    const uniqueLetters = [...new Set("BANAN".split(""))]; // ["B", "A", "N"]
    for (let i = 0; i < uniqueLetters.length - 1; i++) {
      await page.evaluate((l) => guessLetter(l), uniqueLetters[i]);
      await expect(page.locator(".praise-bubble")).toBeVisible();
      // Ta bort den direkt igen (istället för att vänta ut 1,2 s) så nästa
      // varv i loopen kan kolla på ett rent utgångsläge.
      await page.evaluate(() => document.querySelector(".praise-bubble")?.remove());
    }

    const statusBeforeLast = await page.evaluate(() => hangmanState.status);
    expect(statusBeforeLast).toBe("playing");

    const lastLetter = uniqueLetters[uniqueLetters.length - 1];
    await page.evaluate((l) => guessLetter(l), lastLetter);

    const status = await page.evaluate(() => hangmanState.status);
    expect(status).toBe("won");
    // Ingen bubbla ska ha lagts till för den avgörande gissningen — vinst-
    // mikrocopyn/resultatet tar över istället (se guessLetter() i hangman.js).
    const bubbleCount = await page.locator(".praise-bubble").count();
    expect(bubbleCount).toBe(0);
    await expect(page.locator("#hangman-result")).not.toHaveClass(/hidden/);
  });

  test("förlust: ingen bubbla på den 9:e, avgörande fel bokstaven", async ({ page }) => {
    await goToHangman(page);
    await forceWordBanan(page);

    const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ".split("");
    const wrongLetters = ALPHABET.filter((l) => !"BANAN".includes(l)).slice(0, 9);
    expect(wrongLetters.length).toBe(9);

    for (let i = 0; i < 8; i++) {
      await page.evaluate((l) => guessLetter(l), wrongLetters[i]);
      await expect(page.locator(".praise-bubble")).toBeVisible();
      await page.evaluate(() => document.querySelector(".praise-bubble")?.remove());
    }

    const statusBeforeLast = await page.evaluate(() => hangmanState.status);
    expect(statusBeforeLast).toBe("playing");

    await page.evaluate((l) => guessLetter(l), wrongLetters[8]);

    const status = await page.evaluate(() => hangmanState.status);
    expect(status).toBe("lost");
    const bubbleCount = await page.locator(".praise-bubble").count();
    expect(bubbleCount).toBe(0);
    await expect(page.locator("#hangman-result")).not.toHaveClass(/hidden/);
  });
});

test.describe("playCorrectGuess(count) anropas med rätt antal förekomster", () => {
  test("spy: playCorrectGuess får antalet förekomster av den gissade bokstaven som argument", async ({ page }) => {
    await goToHangman(page);
    await forceWordBanan(page);

    await page.evaluate(() => {
      window.__correctCalls = [];
      window.__wrongCalls = 0;
      window.playCorrectGuess = (count) => window.__correctCalls.push(count);
      window.playWrongGuess = () => window.__wrongCalls++;
    });

    // A förekommer 2 gånger i BANAN.
    await page.evaluate(() => guessLetter("A"));
    let calls = await page.evaluate(() => window.__correctCalls);
    expect(calls).toEqual([2]);

    // N förekommer 2 gånger i BANAN också.
    await page.evaluate(() => guessLetter("N"));
    calls = await page.evaluate(() => window.__correctCalls);
    expect(calls).toEqual([2, 2]);

    // X finns inte i BANAN — ska trigga playWrongGuess, inte playCorrectGuess.
    await page.evaluate(() => guessLetter("X"));
    calls = await page.evaluate(() => window.__correctCalls);
    const wrongCalls = await page.evaluate(() => window.__wrongCalls);
    expect(calls).toEqual([2, 2]);
    expect(wrongCalls).toBe(1);

    // B förekommer bara 1 gång — sista, avgörande bokstaven (vinst). Den
    // räknas som playWin(), inte playCorrectGuess() (se hangman-sound.spec.js),
    // så listan ska inte växa här.
    await page.evaluate(() => guessLetter("B"));
    const status = await page.evaluate(() => hangmanState.status);
    expect(status).toBe("won");
    calls = await page.evaluate(() => window.__correctCalls);
    expect(calls).toEqual([2, 2]);
  });

  test("en ensam bokstav (förekommer 1 gång) ger playCorrectGuess(1)", async ({ page }) => {
    await goToHangman(page);
    await forceWordBanan(page);

    await page.evaluate(() => {
      window.__correctCalls = [];
      window.playCorrectGuess = (count) => window.__correctCalls.push(count);
    });

    // B förekommer bara en gång i BANAN, och är inte den avgörande
    // bokstaven eftersom A och N återstår.
    await page.evaluate(() => guessLetter("B"));
    const calls = await page.evaluate(() => window.__correctCalls);
    expect(calls).toEqual([1]);
  });
});

test.describe("Ingen räknare per barn någonstans", () => {
  test("efter flera blandade omgångar (vinst/förlust, båda spelarna) finns ingen per-barn-räknare i DOM eller localStorage", async ({ page }) => {
    await goToHangman(page);

    await winRound(page);
    await page.evaluate(() => startNewHangmanRound());
    await loseRound(page);
    await page.evaluate(() => startNewHangmanRound());
    await winRound(page);
    await page.evaluate(() => startNewHangmanRound());
    await loseRound(page);

    // 1) hangmanState självt har inga fält som ser ut som en räknare per
    // spelare (t.ex. johnCorrect/veraWrong/johnScore etc).
    const stateKeys = await page.evaluate(() => Object.keys(hangmanState));
    const suspiciousStateKeys = stateKeys.filter((k) => /john|vera/i.test(k));
    expect(suspiciousStateKeys, "hangmanState ska inte ha per-spelare-fält").toEqual([]);

    // 2) Ingen synlig text i Hänga gubbe-skärmen ser ut som en räknare,
    // t.ex. "John: 3" eller "Vera (2)".
    const hangmanScreenText = await page.locator("#screen-hangman-game").innerText();
    expect(hangmanScreenText).not.toMatch(/John\s*[:(]\s*\d/);
    expect(hangmanScreenText).not.toMatch(/Vera\s*[:(]\s*\d/);

    // 3) Ingen ny localStorage-nyckel med John/Vera i namnet eller innehållet
    // — bara de kända nycklarna (ljud, resa) ska finnas.
    const storageEntries = await page.evaluate(() =>
      Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)])
    );
    for (const [key, value] of storageEntries) {
      expect(key, `localStorage-nyckeln "${key}" nämner en spelare`).not.toMatch(/john|vera/i);
      if (value) {
        expect(value, `localStorage-värdet för "${key}" nämner en spelare`).not.toMatch(/john|vera/i);
      }
    }
  });
});

test.describe("Ingen horisontell overflow @ 320x700/412x915 med bubblan synlig", () => {
  const VIEWPORTS = [
    { name: "320x700", width: 320, height: 700 },
    { name: "412x915 (OnePlus-liknande)", width: 412, height: 915 },
  ];

  for (const viewport of VIEWPORTS) {
    test(`@ ${viewport.name}: ingen scroll med berömbubblan synlig`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await goToHangman(page);
      await forceWordBanan(page);

      // A i BANAN ger den bredaste bubblan (två stjärnor) — testar
      // värsta fallet för bredd.
      await page.evaluate(() => guessLetter("A"));
      await expect(page.locator(".praise-bubble")).toBeVisible();
      await expectNoHorizontalOverflow(page);

      // Bubblan påverkar inte scrollHeight heller (samma princip som
      // word-clue.spec.js punkt 10, fast för bubblan istället för facit).
      const { scrollHeight, innerHeight } = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        innerHeight: window.innerHeight,
      }));
      expect(scrollHeight).toBeLessThanOrEqual(innerHeight);
    });
  }
});

test.describe("Spot check: tidigare iterationers funktioner rörs inte", () => {
  test("bildkort, facit vid förlust och tangentbordsglöd fungerar fortfarande tillsammans med turmärke/bubbla", async ({ page }) => {
    await goToHangman(page);
    const clueBefore = await page.evaluate(() => document.getElementById("hangman-clue").textContent);
    expect(clueBefore.length).toBeGreaterThan(0);

    await loseRound(page);
    const status = await page.evaluate(() => hangmanState.status);
    expect(status).toBe("lost");

    const missedCount = await page.locator("#hangman-word .hangman-letter.missed").count();
    expect(missedCount).toBeGreaterThan(0);
    const text = await page.locator("#hangman-result-text").textContent();
    expect(text).toContain("Nästan!");

    // Klue oförändrat, tangentbord/ord fortfarande synliga inline.
    const clueAfter = await page.evaluate(() => document.getElementById("hangman-clue").textContent);
    expect(clueAfter).toBe(clueBefore);
    await expect(page.locator("#hangman-keyboard")).toBeVisible();
    await expect(page.locator("#screen-hangman-game")).toHaveClass(/active/);
  });

  test("skakningen (.shake) triggas fortfarande på en fel gissning", async ({ page }) => {
    await goToHangman(page);
    const word = await page.evaluate(() => hangmanState.word);
    const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ".split("");
    const wrongLetter = ALPHABET.find((l) => !word.includes(l));

    await page.evaluate((l) => guessLetter(l), wrongLetter);
    await expect(page.locator(".hangman-drawing-wrap")).toHaveClass(/shake/);
  });

  test("gnistskuren (sparkBurst) triggas fortfarande vid vinst", async ({ page }) => {
    await goToHangman(page);
    await page.evaluate(() => {
      window.__sparkBurstCalls = 0;
      const original = window.sparkBurst;
      window.sparkBurst = (...args) => {
        window.__sparkBurstCalls++;
        return original(...args);
      };
    });

    await winRound(page);
    const calls = await page.evaluate(() => window.__sparkBurstCalls);
    expect(calls).toBeGreaterThan(0);
  });
});

test.describe("Extra: felaktig/oväntad input runt turmärke/bubbla", () => {
  test("dubbelklick på en tangent ger fortfarande bara en bubbla/en gissning", async ({ page }) => {
    await goToHangman(page);
    const word = await page.evaluate(() => hangmanState.word);
    const firstLetter = word[0];

    const key = page.locator(`.hangman-key[data-letter="${firstLetter}"]`);
    await key.dblclick({ force: true });

    const guessedCount = await page.evaluate(
      (l) => hangmanState.guessedLetters.filter((g) => g === l).length,
      firstLetter
    );
    expect(guessedCount).toBe(1);

    const bubbleCount = await page.locator(".praise-bubble").count();
    expect(bubbleCount).toBeLessThanOrEqual(1);
  });

  test("Cmd/Ctrl-genvägar räknas inte som gissningar och skapar ingen bubbla", async ({ page }) => {
    await goToHangman(page);
    const guessedBefore = await page.evaluate(() => [...hangmanState.guessedLetters]);

    await page.keyboard.down("Control");
    await page.keyboard.press("F");
    await page.keyboard.up("Control");

    await page.keyboard.down("Meta");
    await page.keyboard.press("R");
    await page.keyboard.up("Meta");

    const guessedAfter = await page.evaluate(() => [...hangmanState.guessedLetters]);
    expect(guessedAfter).toEqual(guessedBefore);
    const bubbleCount = await page.locator(".praise-bubble").count();
    expect(bubbleCount).toBe(0);
  });

  test("klick på tangentbordet efter vinst (låst) skapar ingen ny bubbla", async ({ page }) => {
    await goToHangman(page);
    await winRound(page);
    // Vänta ut ev. kvarvarande bubbla från den sista icke-avgörande gissningen.
    await page.waitForTimeout(1300);

    await page.evaluate(() => guessLetter("A"));
    const bubbleCount = await page.locator(".praise-bubble").count();
    expect(bubbleCount).toBe(0);
  });

  test("övergångsläge: precis efter en vinst men innan man tryckt vidare finns ingen kvardröjande bubbla efter dess 1,2 s", async ({ page }) => {
    await goToHangman(page);
    await winRound(page);
    await expect(page.locator("#hangman-again-btn")).toBeVisible();
    await expect(page.locator(".praise-bubble")).toHaveCount(0, { timeout: 2000 });
  });
});
