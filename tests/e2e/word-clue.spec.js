// Testar Iteration 1 ("Bildledtråd och tydligt facit", se
// docs/design/2026-09-25-produktteam-3-iterationer.md): bildkortet
// (#hangman-clue) bredvid galgteckningen, facit som fylls i på plats vid
// förlust (.hangman-letter.missed) istället för bara understreck, och den
// nya mikrocopyn ("Ni klarade det! 🚀+2" / "Nästan! Så stavas det. 🚀+1").
// De 11 punkterna under "Acceptanskriterier (Playwright)" i det dokumentet
// är facit för den här filen — varje test/grupp nedan pekar på vilket/
// vilka nummer den täcker.
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

// Samma winRound/loseRound-mönster som journey.spec.js/hangman-sound.spec.js.
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

test.describe("1. Datakomplett: PLANETS.icon och getWordPicture()", () => {
  test("varje planet har en icke-tom icon, och getWordPicture() returnerar en icke-tom sträng för varje ord på den planeten", async ({ page }) => {
    await page.goto("/");
    const results = await page.evaluate(() => {
      return PLANETS.map((planet) => ({
        id: planet.id,
        icon: planet.icon,
        words: planet.words.map((w) => ({ word: w, picture: getWordPicture(w, planet) })),
      }));
    });

    for (const planet of results) {
      expect(planet.icon, `planet ${planet.id} saknar icon`).toBeTruthy();
      expect(typeof planet.icon).toBe("string");
      for (const { word, picture } of planet.words) {
        expect(picture, `getWordPicture(${word}, ${planet.id}) var tom`).toBeTruthy();
        expect(typeof picture).toBe("string");
      }
    }
  });
});

test.describe("2. Inga felstavade nycklar i WORD_PICTURES", () => {
  test("varje nyckel i WORD_PICTURES finns som ord på minst en planet", async ({ page }) => {
    await page.goto("/");
    const { pictureKeys, allWords } = await page.evaluate(() => ({
      pictureKeys: Object.keys(WORD_PICTURES),
      allWords: PLANETS.flatMap((p) => p.words.map((w) => w.toLowerCase())),
    }));

    const wordSet = new Set(allWords);
    const orphanKeys = pictureKeys.filter((key) => !wordSet.has(key));
    expect(orphanKeys, "dessa WORD_PICTURES-nycklar matchar inget ord på någon planet").toEqual([]);
  });
});

test.describe("3+4. Bildkortet visas och följer det aktuella ordet", () => {
  test("efter #select-hangman-btn är #hangman-clue synligt och stämmer med startordet", async ({ page }) => {
    await goToHangman(page);

    const clue = page.locator("#hangman-clue");
    await expect(clue).toBeVisible();

    const { clueText, expected } = await page.evaluate(() => ({
      clueText: document.getElementById("hangman-clue").textContent,
      expected: getWordPicture(hangmanState.word, getCurrentPlanet()),
    }));
    expect(clueText).toBe(expected);
    expect(clueText.length).toBeGreaterThan(0);
  });

  test("bildkortet byts ut till det nya ordets bild efter startNewHangmanRound()", async ({ page }) => {
    await goToHangman(page);

    // Kör flera nya omgångar (ordet slumpas) och kontrollera varje gång
    // att kortet matchar det NYA ordet, inte det gamla.
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => startNewHangmanRound());
      const { clueText, expected } = await page.evaluate(() => ({
        clueText: document.getElementById("hangman-clue").textContent,
        expected: getWordPicture(hangmanState.word, getCurrentPlanet()),
      }));
      expect(clueText).toBe(expected);
    }
  });

  test("bildkortet ändras inte under själva omgången (samma bild kvar efter en gissning)", async ({ page }) => {
    await goToHangman(page);
    const before = await page.evaluate(() => document.getElementById("hangman-clue").textContent);

    await page.evaluate(() => {
      const word = hangmanState.word;
      const firstLetter = word[0];
      guessLetter(firstLetter);
    });

    const after = await page.evaluate(() => document.getElementById("hangman-clue").textContent);
    expect(after).toBe(before);
  });

  test("fallback till planetens symbol för ord utan egen bild i WORD_PICTURES", async ({ page }) => {
    await goToHangman(page);
    // "rast" (Skolplaneten) saknar med flit en egen bild, se journey.js.
    const { picture, icon } = await page.evaluate(() => {
      const planet = PLANETS.find((p) => p.id === "skola");
      return { picture: getWordPicture("rast", planet), icon: planet.icon };
    });
    expect(picture).toBe(icon);
  });
});

test.describe("5. Facit vid förlust: inga kvarvarande understreck, rätt antal .missed", () => {
  test("efter en förlust finns ingen '_' kvar, och antalet .missed matchar de ogissade bokstäverna", async ({ page }) => {
    await goToHangman(page);
    await loseRound(page);

    await expect(page.locator("#screen-hangman-game")).toHaveClass(/active/);
    const status = await page.evaluate(() => hangmanState.status);
    expect(status).toBe("lost");

    const underscoreCount = await page.locator("#hangman-word .hangman-letter", { hasText: "_" }).count();
    expect(underscoreCount).toBe(0);

    const { missedCount, expectedMissedCount, letters } = await page.evaluate(() => {
      const letters = hangmanState.word.split("");
      const expectedMissedCount = letters.filter((l) => !hangmanState.guessedLetters.includes(l)).length;
      const missedCount = document.querySelectorAll("#hangman-word .hangman-letter.missed").length;
      return { missedCount, expectedMissedCount, letters };
    });
    expect(letters.length).toBeGreaterThan(0);
    expect(missedCount).toBe(expectedMissedCount);

    // Var och en av de ogissade bokstäverna har rätt text (facit), inte tomt.
    const missedTexts = await page.locator("#hangman-word .hangman-letter.missed").allTextContents();
    for (const t of missedTexts) {
      expect(t).not.toBe("");
      expect(t).not.toBe("_");
    }

    // Bokstäver man själv hittade behåller sin .revealed-stil (inte .missed).
    const revealedCount = await page.locator("#hangman-word .hangman-letter.revealed").count();
    expect(revealedCount + missedCount).toBe(letters.length);
  });
});

test.describe("6. Ingen .missed vid vinst", () => {
  test("efter en vinst finns inga .missed-bokstäver, alla är .revealed", async ({ page }) => {
    await goToHangman(page);
    await winRound(page);

    const status = await page.evaluate(() => hangmanState.status);
    expect(status).toBe("won");

    const missedCount = await page.locator("#hangman-word .hangman-letter.missed").count();
    expect(missedCount).toBe(0);

    const { letterCount, revealedCount } = await page.evaluate(() => ({
      letterCount: hangmanState.word.length,
      revealedCount: document.querySelectorAll("#hangman-word .hangman-letter.revealed").length,
    }));
    expect(revealedCount).toBe(letterCount);
  });
});

test.describe("7. Mikrocopy vid vinst/förlust", () => {
  test("vinst: #hangman-result-text innehåller 'Ni klarade det!' och '🚀+2'", async ({ page }) => {
    await goToHangman(page);
    await winRound(page);
    const text = await page.locator("#hangman-result-text").textContent();
    expect(text).toContain("Ni klarade det!");
    expect(text).toContain("🚀+2");

    const fuelPerWin = await page.evaluate(() => FUEL_PER_WIN);
    expect(fuelPerWin).toBe(2);
  });

  test("förlust: #hangman-result-text innehåller 'Nästan!' och '🚀+1'", async ({ page }) => {
    await goToHangman(page);
    await loseRound(page);
    const text = await page.locator("#hangman-result-text").textContent();
    expect(text).toContain("Nästan!");
    expect(text).toContain("🚀+1");

    const fuelPerLoss = await page.evaluate(() => FUEL_PER_LOSS);
    expect(fuelPerLoss).toBe(1);

    // Det gamla, mer negativa "Gubben hann hänga"-copyt ska vara borta.
    expect(text).not.toContain("Gubben hann hänga");
  });
});

test.describe("8. Inline-regeln vid både vinst och förlust", () => {
  for (const outcome of ["vinst", "förlust"]) {
    test(`vid ${outcome} förblir #hangman-word, #hangman-clue, .hangman-drawing-wrap och #hangman-keyboard synliga, och screen-hangman-game är kvar aktiv`, async ({ page }) => {
      await goToHangman(page);
      if (outcome === "vinst") {
        await winRound(page);
      } else {
        await loseRound(page);
      }

      await expect(page.locator("#hangman-word")).toBeVisible();
      await expect(page.locator("#hangman-clue")).toBeVisible();
      await expect(page.locator(".hangman-drawing-wrap")).toBeVisible();
      await expect(page.locator("#hangman-keyboard")).toBeVisible();
      await expect(page.locator("#screen-hangman-game")).toHaveClass(/active/);
      await expect(page.locator("#hangman-result")).not.toHaveClass(/hidden/);
    });
  }
});

test.describe("9. Ingen horisontell overflow @ 320x700 och 412x915, inkl. det längsta ordet", () => {
  const VIEWPORTS = [
    { name: "320x700", width: 320, height: 700 },
    { name: "412x915 (OnePlus-liknande)", width: 412, height: 915 },
  ];

  async function expectClueAndDrawingDontOverlap(page) {
    const clueBox = await page.locator("#hangman-clue").boundingBox();
    const drawingBox = await page.locator(".hangman-drawing-wrap").boundingBox();
    expect(clueBox).not.toBeNull();
    expect(drawingBox).not.toBeNull();

    const overlaps =
      clueBox.x < drawingBox.x + drawingBox.width &&
      clueBox.x + clueBox.width > drawingBox.x &&
      clueBox.y < drawingBox.y + drawingBox.height &&
      clueBox.y + clueBox.height > drawingBox.y;
    expect(overlaps, "#hangman-clue och .hangman-drawing-wrap ska inte överlappa").toBe(false);
  }

  for (const viewport of VIEWPORTS) {
    test.describe(`@ ${viewport.name}`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test("under spel: ingen horisontell overflow, kortet och teckningen överlappar inte", async ({ page }) => {
        await goToHangman(page);
        await expectNoHorizontalOverflow(page);
        await expectClueAndDrawingDontOverlap(page);
      });

      test("med resultatet synligt (vinst): ingen horisontell overflow", async ({ page }) => {
        await goToHangman(page);
        await winRound(page);
        await expectNoHorizontalOverflow(page);
        await expectClueAndDrawingDontOverlap(page);
      });

      test("med resultatet synligt (förlust): ingen horisontell overflow", async ({ page }) => {
        await goToHangman(page);
        await loseRound(page);
        await expectNoHorizontalOverflow(page);
        await expectClueAndDrawingDontOverlap(page);
      });

      test("tvingat fram det längsta ordet (FJÄRRKONTROLL): ingen horisontell overflow, varken under spel eller med förlustfacit synligt", async ({ page }) => {
        await goToHangman(page);
        await page.evaluate(() => {
          hangmanState.word = "FJÄRRKONTROLL";
          renderHangmanWord();
          renderHangmanClue();
        });
        await expectNoHorizontalOverflow(page);
        await expectClueAndDrawingDontOverlap(page);

        // Samma långa ord, men nu med förlustfacit ifyllt i ordraden
        // (det maximala antalet tecken som ska synas samtidigt).
        await page.evaluate(() => {
          hangmanState.status = "lost";
          hangmanState.guessedLetters = ["F", "K"]; // några få rätt, resten facit
          renderHangmanWord();
        });
        await expectNoHorizontalOverflow(page);
        await expectClueAndDrawingDontOverlap(page);

        const missedCount = await page.locator("#hangman-word .hangman-letter.missed").count();
        expect(missedCount).toBeGreaterThan(0);
      });
    });
  }
});

test.describe("10. Ingen ny vertikal scroll på Hänga gubbe-skärmen @ 412x915 med resultatet synligt", () => {
  test.use({ viewport: { width: 412, height: 915 } });

  test("main.scrollHeight överskrider inte fönstrets höjd (ingen vertikal scrollbar krävs)", async ({ page }) => {
    await goToHangman(page);
    await winRound(page);
    await expect(page.locator("#hangman-result")).not.toHaveClass(/hidden/);

    // Ingen vertikal overflow på hela dokumentet: precis som den
    // horisontella kontrollen i CLAUDE.md/responsive.spec.js, men för höjd.
    // Skärmen är byggd för att aldrig kräva scroll (flex-layout, gap, inga
    // fasta höjder) — så scrollHeight ska inte överskrida innerHeight.
    const { scrollHeight, innerHeight } = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }));
    expect(
      scrollHeight,
      `scrollHeight (${scrollHeight}) ska inte överskrida innerHeight (${innerHeight}) — resultatet med bildkortet ska rymmas utan ny vertikal scroll`
    ).toBeLessThanOrEqual(innerHeight);
  });

  test("main.scrollHeight överskrider inte fönstrets höjd med förlustfacit synligt", async ({ page }) => {
    await goToHangman(page);
    await loseRound(page);
    await expect(page.locator("#hangman-result")).not.toHaveClass(/hidden/);

    const { scrollHeight, innerHeight } = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }));
    expect(
      scrollHeight,
      `scrollHeight (${scrollHeight}) ska inte överskrida innerHeight (${innerHeight}) med förlustfacit synligt`
    ).toBeLessThanOrEqual(innerHeight);
  });
});

test.describe("Extra: felaktig/oväntad input runt bildkortet och facit", () => {
  test("bildkortet går inte att trycka på (ingen klick-hanterare, ingen state-förändring)", async ({ page }) => {
    await goToHangman(page);
    const before = await page.evaluate(() => document.getElementById("hangman-clue").textContent);

    // role="img" -> inget klickbart element, men testa ändå att ett
    // klick inte råkar trigga något (t.ex. via en bubblande hanterare).
    await page.locator("#hangman-clue").click({ force: true });
    await page.locator("#hangman-clue").dblclick({ force: true });

    const after = await page.evaluate(() => document.getElementById("hangman-clue").textContent);
    expect(after).toBe(before);
    const status = await page.evaluate(() => hangmanState.status);
    expect(status).toBe("playing");
  });

  test("dubbelklick på en redan gissad/låst bokstavstangent gissar inte om", async ({ page }) => {
    await goToHangman(page);
    const word = await page.evaluate(() => hangmanState.word);
    const firstLetter = word[0];

    await page.evaluate((l) => guessLetter(l), firstLetter);
    let guessedCount = await page.evaluate(
      (l) => hangmanState.guessedLetters.filter((g) => g === l).length,
      firstLetter
    );
    expect(guessedCount).toBe(1);

    // Dubbelklick på tangentbordet efter att bokstaven redan är gissad.
    const key = page.locator(`.hangman-key[data-letter="${firstLetter}"]`);
    await key.dblclick({ force: true });

    guessedCount = await page.evaluate(
      (l) => hangmanState.guessedLetters.filter((g) => g === l).length,
      firstLetter
    );
    expect(guessedCount).toBe(1);
  });

  test("klick på tangentbordet efter vinst (låst bräde) ändrar inte facit/resultatet", async ({ page }) => {
    await goToHangman(page);
    await winRound(page);

    const before = await page.evaluate(() => ({
      status: hangmanState.status,
      guessed: [...hangmanState.guessedLetters],
      resultText: document.getElementById("hangman-result-text").textContent,
    }));

    // Alla tangenter ska vara disabled efter vinst (se renderHangmanKeyboard()).
    const anyEnabled = await page.evaluate(
      () => Array.from(document.querySelectorAll(".hangman-key")).some((k) => !k.disabled)
    );
    expect(anyEnabled).toBe(false);

    // Ett klick på en (disabled) tangent, och en direkt guessLetter()-anrop
    // (spellogiken ska själv ignorera icke-"playing"-status).
    await page.evaluate(() => guessLetter("A"));

    const after = await page.evaluate(() => ({
      status: hangmanState.status,
      guessed: [...hangmanState.guessedLetters],
      resultText: document.getElementById("hangman-result-text").textContent,
    }));
    expect(after.status).toBe(before.status);
    expect(after.guessed).toEqual(before.guessed);
    expect(after.resultText).toBe(before.resultText);
  });

  test("Cmd/Ctrl-tangentbordsgenvägar räknas inte som bokstavsgissningar (bildkortet/facit påverkas inte)", async ({ page }) => {
    await goToHangman(page);
    const guessedBefore = await page.evaluate(() => [...hangmanState.guessedLetters]);

    // Simulerar samma guard som CLAUDE.md beskriver för det fysiska
    // tangentbordet: Ctrl/Cmd-kombinationer ska ignoreras, inte räknas
    // som en gissning av bokstaven.
    await page.keyboard.down("Control");
    await page.keyboard.press("F");
    await page.keyboard.up("Control");

    await page.keyboard.down("Meta");
    await page.keyboard.press("R");
    await page.keyboard.up("Meta");

    const guessedAfter = await page.evaluate(() => [...hangmanState.guessedLetters]);
    expect(guessedAfter).toEqual(guessedBefore);
  });

  test("övergångsläge: precis efter en vinst men innan man tryckt vidare visar bildkort + facit korrekt tillsammans", async ({ page }) => {
    await goToHangman(page);
    await winRound(page);

    // "Nytt ord"-knappen syns, men vi trycker inte på den än — kortet och
    // ordet ska stå kvar orörda i detta mellanläge.
    await expect(page.locator("#hangman-again-btn")).toBeVisible();
    const clueText = await page.evaluate(() => document.getElementById("hangman-clue").textContent);
    expect(clueText.length).toBeGreaterThan(0);

    const missedCount = await page.locator("#hangman-word .hangman-letter.missed").count();
    expect(missedCount).toBe(0);
  });
});
