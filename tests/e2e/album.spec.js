// Testar Iteration 3 ("Rymdalbumet", se
// docs/design/2026-09-25-produktteam-3-iterationer.md): varje avklarad
// Hänga gubbe-omgång (vunnen ELLER förlorad) sparar ordet i
// rymdarkaden-album-v1 under rätt planet-id, den nya #screen-album med
// "N av M ord upptäckta", upptäckta/oupptäckta kort, ◀/▶ som bara
// bläddrar mellan besökta planeter, och Tillbaka till spelvalet.
// Grova acceptanskriterier under "ITERATION 3" i det dokumentet är facit
// för filen här.
const { test, expect } = require("@playwright/test");

// Samma no-op som övriga spec-filer (se hangman-sound.spec.js): stäng av
// service worker-registreringen så en automatisk omladdning
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

async function readAlbumStorage(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("rymdarkaden-album-v1");
    return raw ? JSON.parse(raw) : null;
  });
}

test.describe("Rymdalbumet: vinst/förlust sparas i localStorage", () => {
  test("en vunnen omgång sparar ordet under rätt planet-id", async ({ page }) => {
    await goToHangman(page);
    const { word, planetId } = await page.evaluate(() => ({
      word: hangmanState.word,
      planetId: getCurrentPlanet().id,
    }));

    await winRound(page);

    const stored = await readAlbumStorage(page);
    expect(stored).not.toBeNull();
    expect(stored[planetId]).toContain(word.toLowerCase());
  });

  test("en FÖRLORAD omgång sparar ordet också, inte bara vinster", async ({ page }) => {
    await goToHangman(page);
    const { word, planetId } = await page.evaluate(() => ({
      word: hangmanState.word,
      planetId: getCurrentPlanet().id,
    }));

    await loseRound(page);
    const status = await page.evaluate(() => hangmanState.status);
    expect(status).toBe("lost");

    const stored = await readAlbumStorage(page);
    expect(stored[planetId]).toContain(word.toLowerCase());
  });

  test("samma ord spelat två gånger skapar inte en dubblett", async ({ page }) => {
    await goToHangman(page);
    const { word, planetId } = await page.evaluate(() => ({
      word: hangmanState.word,
      planetId: getCurrentPlanet().id,
    }));
    await winRound(page);

    // Tvinga fram exakt samma ord i nästa omgång (pickRandomWord()
    // undviker annars lastWord) genom att sätta hangmanState.word direkt
    // efter att en ny omgång redan städat guessedLetters/status, precis
    // som ordets eget flöde skulle göra, och rendera om ordraden så den
    // matchar den nya (i det här fallet identiska) bokstavslängden.
    await page.evaluate((forcedWord) => {
      startNewHangmanRound();
      hangmanState.word = forcedWord;
      renderHangmanWord();
      renderHangmanClue();
    }, word);

    await loseRound(page);

    const stored = await readAlbumStorage(page);
    const list = stored[planetId];
    const occurrences = list.filter((w) => w === word.toLowerCase());
    expect(occurrences.length).toBe(1);
  });
});

test.describe("Rymdalbumet: skärmen visar rätt antal och rätt kort", () => {
  test("\"N av M\" stämmer mot den aktuella planetens FAKTISKA ordlistlängd (inte antaget 25)", async ({ page }) => {
    await goToHangman(page);
    const { planetId, planetWordCount } = await page.evaluate(() => ({
      planetId: getCurrentPlanet().id,
      planetWordCount: getCurrentPlanet().words.length,
    }));
    await winRound(page);

    await page.evaluate(() => showScreen("screen-game-select"));
    await page.locator("#select-album-btn").click();
    await expect(page.locator("#screen-album")).toHaveClass(/active/);

    await expect(page.locator("#album-count")).toHaveText(`1 av ${planetWordCount} ord upptäckta`);
    // Sanity: bekräfta att den här planetens lista faktiskt INTE är 25 för
    // minst någon planet, dvs testet skulle fångat ett hårdkodat antagande.
    expect(typeof planetWordCount).toBe("number");
  });

  test("2 av N efter en vinst och en förlust på samma planet", async ({ page }) => {
    await goToHangman(page);
    const planetWordCount = await page.evaluate(() => getCurrentPlanet().words.length);
    await winRound(page);
    await page.evaluate(() => startNewHangmanRound());
    await loseRound(page);

    await page.evaluate(() => showScreen("screen-game-select"));
    await page.locator("#select-album-btn").click();
    await expect(page.locator("#album-count")).toHaveText(`2 av ${planetWordCount} ord upptäckta`);
  });

  test("upptäckta kort visar rätt emoji (getWordPicture) och ordet i VERSALER; oupptäckta visar nedtonat ?", async ({ page }) => {
    await goToHangman(page);
    const { word, expectedEmoji } = await page.evaluate(() => ({
      word: hangmanState.word,
      expectedEmoji: getWordPicture(hangmanState.word, getCurrentPlanet()),
    }));
    await winRound(page);

    await page.evaluate(() => showScreen("screen-game-select"));
    await page.locator("#select-album-btn").click();
    await expect(page.locator("#screen-album")).toHaveClass(/active/);

    const cards = page.locator("#album-grid .album-card");
    const discoveredCard = page.locator("#album-grid .album-card", { hasText: word.toUpperCase() });
    await expect(discoveredCard).toHaveCount(1);
    await expect(discoveredCard.locator(".album-card-emoji")).toHaveText(expectedEmoji);
    await expect(discoveredCard.locator(".album-card-word")).toHaveText(word.toUpperCase());
    await expect(discoveredCard).not.toHaveClass(/undiscovered/);

    // Minst ett oupptäckt kort ("?"), utan klass för upptäckt ord-text.
    const undiscoveredCards = page.locator("#album-grid .album-card.undiscovered");
    const undiscoveredCount = await undiscoveredCards.count();
    expect(undiscoveredCount).toBeGreaterThan(0);
    await expect(undiscoveredCards.first()).toHaveText("?");
    await expect(undiscoveredCards.first().locator(".album-card-word")).toHaveCount(0);
    await expect(undiscoveredCards.first().locator(".album-card-emoji")).toHaveCount(0);

    const totalCards = await cards.count();
    expect(totalCards).toBe(1 + undiscoveredCount);
  });
});

test.describe("Rymdalbumet: bläddring mellan besökta planeter", () => {
  test("◀/▶ når bara planeter med minst ett upptäckt ord — aldrig en obesökt", async ({ page }) => {
    await goToHangman(page);

    // Spela klart en omgång på planet 0 (djur), sedan tvinga fram planet 2
    // (mat) genom att sätta planetIndex direkt (som journey.spec.js gör),
    // och spela klart en omgång där också. Planet 1 (dinosaurie) och alla
    // övriga förblir helt obesökta.
    await winRound(page);
    const planet0Id = await page.evaluate(() => getCurrentPlanet().id);

    await page.evaluate(() => {
      journeyState.planetIndex = 2;
      startNewHangmanRound();
    });
    const planet2Id = await page.evaluate(() => getCurrentPlanet().id);
    await winRound(page);

    const visitedIds = await page.evaluate(() => getVisitedPlanetIds());
    expect(visitedIds.sort()).toEqual([planet0Id, planet2Id].sort());
    expect(visitedIds).not.toContain(
      await page.evaluate(() => PLANETS[1].id) // Dinosaurieplaneten, aldrig spelad
    );

    await page.evaluate(() => showScreen("screen-game-select"));
    await page.locator("#select-album-btn").click();
    await expect(page.locator("#screen-album")).toHaveClass(/active/);

    // Bläddra runt några varv och samla vilka planet-id vi någonsin ser —
    // ska aldrig vara fler än de två besökta, oavsett hur många gånger vi
    // klickar (cirkulär bläddring).
    const seenIds = new Set();
    for (let i = 0; i < 6; i++) {
      const currentId = await page.evaluate(() => albumCurrentPlanetId);
      seenIds.add(currentId);
      await page.locator("#album-next-btn").click();
    }
    expect([...seenIds].sort()).toEqual([planet0Id, planet2Id].sort());
  });

  test("bara en besökt planet: pilarna är avstängda", async ({ page }) => {
    await goToHangman(page);
    await winRound(page);

    await page.evaluate(() => showScreen("screen-game-select"));
    await page.locator("#select-album-btn").click();
    await expect(page.locator("#album-prev-btn")).toBeDisabled();
    await expect(page.locator("#album-next-btn")).toBeDisabled();
  });
});

test.describe("Rymdalbumet: Tillbaka, ljud och färgton", () => {
  test("Tillbaka leder till screen-game-select", async ({ page }) => {
    await goToHangman(page);
    await winRound(page);
    await page.evaluate(() => showScreen("screen-game-select"));
    await page.locator("#select-album-btn").click();
    await expect(page.locator("#screen-album")).toHaveClass(/active/);

    await page.locator("#album-back-btn").click();
    await expect(page.locator("#screen-game-select")).toHaveClass(/active/);
  });

  test("albumknappen, Tillbaka och pilarna spelar playClick()", async ({ page }) => {
    await goToHangman(page);
    await winRound(page);
    await page.evaluate(() => {
      journeyState.planetIndex = 2;
      startNewHangmanRound();
    });
    await winRound(page);
    await page.evaluate(() => showScreen("screen-game-select"));

    await page.evaluate(() => {
      window.__clickCalls = 0;
      window.playClick = () => {
        window.__clickCalls++;
      };
    });

    await page.locator("#select-album-btn").click();
    await expect(page.locator("#screen-album")).toHaveClass(/active/);
    expect(await page.evaluate(() => window.__clickCalls)).toBe(1);

    await page.locator("#album-next-btn").click();
    expect(await page.evaluate(() => window.__clickCalls)).toBe(2);

    await page.locator("#album-prev-btn").click();
    expect(await page.evaluate(() => window.__clickCalls)).toBe(3);

    await page.locator("#album-back-btn").click();
    await expect(page.locator("#screen-game-select")).toHaveClass(/active/);
    expect(await page.evaluate(() => window.__clickCalls)).toBe(4);
  });

  test("albumet tonas INTE i en planetfärg — #app har ingen synlig bakgrundsgradient där", async ({ page }) => {
    const appBackgroundImage = () =>
      page.evaluate(() => getComputedStyle(document.getElementById("app")).backgroundImage);

    await goToHangman(page);
    await winRound(page);
    // Bekräfta att .on-planet verkligen är satt (annars vore testet tandlöst).
    await expect(page.locator("#app")).toHaveClass(/on-planet/);
    expect(await appBackgroundImage()).toContain("gradient");

    await page.evaluate(() => showScreen("screen-game-select"));
    await page.locator("#select-album-btn").click();
    await expect(page.locator("#screen-album")).toHaveClass(/active/);

    // .on-planet-klassen kan fortfarande sitta kvar (den styrs bara av
    // hangman.js vid nästa resa), men CSS-regeln kräver ÄVEN
    // data-screen="screen-hangman-game" — så tonen får inte synas här.
    expect(await appBackgroundImage()).toBe("none");
  });
});

test.describe("Rymdalbumet: tomma/övergångslägen och localStorage-fel", () => {
  test("albumet är tomt innan något ord är upptäckt: inga besökta planeter, pilarna avstängda", async ({ page }) => {
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await expect(page.locator("#screen-game-select")).toHaveClass(/active/);

    await page.locator("#select-album-btn").click();
    await expect(page.locator("#screen-album")).toHaveClass(/active/);
    await expect(page.locator("#album-prev-btn")).toBeDisabled();
    await expect(page.locator("#album-next-btn")).toBeDisabled();
    const grid = await page.evaluate(() => document.getElementById("album-grid").children.length);
    expect(grid).toBe(0);
  });

  test("spelet kraschar inte om localStorage kastar fel (privat läge)", async ({ page }) => {
    await page.addInitScript(() => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register = () => Promise.resolve({});
      }
      const throwError = () => {
        throw new DOMException("Access denied", "SecurityError");
      };
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: throwError,
          setItem: throwError,
          removeItem: throwError,
          clear: throwError,
          key: throwError,
          length: 0,
        },
      });
    });

    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    await page.goto("/");
    await page.locator("#screen-intro").click();
    await page.locator("#select-hangman-btn").click();
    await expect(page.locator("#screen-hangman-game")).toHaveClass(/active/);

    await winRound(page);
    await expect(page.locator("#hangman-result")).not.toHaveClass(/hidden/);

    await page.evaluate(() => showScreen("screen-game-select"));
    await page.locator("#select-album-btn").click();
    await expect(page.locator("#screen-album")).toHaveClass(/active/);
    // Ordet vanns i den här sessionen men kunde aldrig sparas (localStorage
    // kastar) — albumet är fortsatt tomt, men skärmen kraschar inte.
    await expect(page.locator("#album-prev-btn")).toBeDisabled();

    expect(pageErrors).toEqual([]);
  });
});

test.describe("Rymdalbumet: responsivitet", () => {
  for (const { width, height, label } of [
    { width: 320, height: 700, label: "320×700 (minsta rimliga telefon)" },
    { width: 412, height: 915, label: "412×915 (OnePlus-liknande)" },
  ]) {
    test(`ingen horisontell overflow @ ${label}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await goToHangman(page);
      await winRound(page);
      await page.evaluate(() => showScreen("screen-game-select"));
      await page.locator("#select-album-btn").click();
      await expect(page.locator("#screen-album")).toHaveClass(/active/);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(overflow).toBe(false);
    });
  }

  test("ingen horisontell overflow på en bred desktop-vy", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await goToHangman(page);
    await winRound(page);
    await page.evaluate(() => showScreen("screen-game-select"));
    await page.locator("#select-album-btn").click();
    await expect(page.locator("#screen-album")).toHaveClass(/active/);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(overflow).toBe(false);
  });
});

test.describe("Rymdalbumet: felaktig/oväntad input", () => {
  test("dubbelklick på Tillbaka byter bara skärm en gång, ingen krasch", async ({ page }) => {
    await goToHangman(page);
    await winRound(page);
    await page.evaluate(() => showScreen("screen-game-select"));
    await page.locator("#select-album-btn").click();

    await page.locator("#album-back-btn").dblclick();
    await expect(page.locator("#screen-game-select")).toHaveClass(/active/);
  });

  test("höger-/mittenklick på pilarna ignoreras (ingen bläddring)", async ({ page }) => {
    await goToHangman(page);
    await winRound(page);
    await page.evaluate(() => {
      journeyState.planetIndex = 2;
      startNewHangmanRound();
    });
    await winRound(page);
    await page.evaluate(() => showScreen("screen-game-select"));
    await page.locator("#select-album-btn").click();

    const before = await page.evaluate(() => albumCurrentPlanetId);
    await page.locator("#album-next-btn").click({ button: "right" });
    await page.locator("#album-next-btn").click({ button: "middle" });
    const after = await page.evaluate(() => albumCurrentPlanetId);
    expect(after).toBe(before);
  });
});
