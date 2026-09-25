// Testar rymdresan (journey.js): bränsle för varje avklarad omgång (vinst
// ELLER förlust), ordlistan som byts ut per planet, lyftet till nästa
// planet vid full tank, och att resan sparas i localStorage.
const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  // Samma no-op som övriga spec-filer — se hangman-sound.spec.js för
  // varför (undviker en omladdning mitt i ett page.evaluate()).
  await page.addInitScript(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register = () => Promise.resolve({});
    }
  });
});

// Gissar hela ordet rätt (vinst) eller tvingar fram 9 fel (förlust) via
// spellogiken direkt, precis som hangman-sound.spec.js gör.
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

test.describe("Rymdresan: bränsle och planetbyte", () => {
  test("spelval-skärmen visar startläget: Djurplaneten, 0/8 bränsle", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#game-select-journey-status")).toHaveText("🪐 Djurplaneten · 🚀 0/8");
  });

  test("en vinst ger 2 bränsle, en förlust ger 1 — aldrig 0", async ({ page }) => {
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await page.locator("#select-hangman-btn").click();

    await winRound(page);
    let fuel = await page.evaluate(() => journeyState.fuel);
    expect(fuel).toBe(2);

    await page.evaluate(() => startNewHangmanRound());
    await loseRound(page);
    fuel = await page.evaluate(() => journeyState.fuel);
    expect(fuel).toBe(3);
  });

  test("ordet kommer från den planet man befinner sig på", async ({ page }) => {
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await page.locator("#select-hangman-btn").click();

    const { word, planetWords } = await page.evaluate(() => ({
      word: hangmanState.word,
      planetWords: getCurrentPlanet().words.map((w) => w.toUpperCase()),
    }));
    expect(planetWords).toContain(word);
  });

  test("varje planet ritar en egen temascen bakom teckningen", async ({ page }) => {
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await page.locator("#select-hangman-btn").click();

    for (let i = 0; i < 12; i++) {
      await page.evaluate((planetIndex) => {
        journeyState.planetIndex = planetIndex;
        startNewHangmanRound();
      }, i);

      const scene = page.locator("#hangman-planet-scene svg");
      await expect(scene).toBeAttached();
      const shapeCount = await page.evaluate(
        () => document.querySelectorAll("#hangman-planet-scene svg > g > *").length
      );
      expect(shapeCount).toBeGreaterThan(0);
    }
  });

  test("full bränsletank byter \"Nytt ord\"-knappen mot en lyft-knapp, och lyftet tar med till nästa planet", async ({ page }) => {
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await page.locator("#select-hangman-btn").click();

    // Djurplaneten kräver 8 bränsle — 4 vinster (2 var) räcker exakt.
    for (let i = 0; i < 4; i++) {
      await winRound(page);
      if (i < 3) {
        await expect(page.locator("#hangman-again-btn")).toHaveText("Nytt ord");
        await page.evaluate(() => startNewHangmanRound());
      }
    }

    await expect(page.locator("#hangman-again-btn")).toHaveText("🚀 Lyft till nästa planet!");
    const fuelBefore = await page.evaluate(() => journeyState.fuel);
    expect(fuelBefore).toBe(8);

    await page.locator("#hangman-again-btn").click();
    // Under själva lyftet visas resegrafiken och planet-bakgrunden nollställs.
    await expect(page.locator("#hangman-launch-overlay")).not.toHaveClass(/hidden/);
    await expect(page.locator("#app")).not.toHaveClass(/on-planet/);
    await expect(page.locator("#launch-overlay-text")).toHaveText("🚀 På väg till Dinosaurieplaneten!");
    await expect(page.locator("#travel-scene .travel-rocket")).toBeAttached();
    await expect(page.locator("#travel-scene .travel-trail")).toBeAttached();
    await expect(page.locator("#travel-scene .travel-planet")).toHaveCount(2);
    // Avresan till höger, destinationen till vänster.
    await expect(page.locator("#travel-from-name")).toHaveText("Djurplaneten");
    await expect(page.locator("#travel-to-name")).toHaveText("Dinosaurieplaneten");

    // Utan att trycka: resan (~5 s) tar slut av sig själv och en ny
    // omgång startar på nästa planet.
    await expect(page.locator("#hangman-launch-overlay")).toHaveClass(/hidden/, { timeout: 8000 });
    const { planetIndex, planetName, fuel, word, planetWords } = await page.evaluate(() => ({
      planetIndex: journeyState.planetIndex,
      planetName: getCurrentPlanet().name,
      fuel: journeyState.fuel,
      word: hangmanState.word,
      planetWords: getCurrentPlanet().words.map((w) => w.toUpperCase()),
    }));
    expect(planetIndex).toBe(1);
    expect(planetName).toBe("Dinosaurieplaneten");
    expect(fuel).toBe(0);
    expect(planetWords).toContain(word);
    await expect(page.locator("#app")).toHaveClass(/on-planet/);
    await expect(page.locator("#hangman-planet-name")).toHaveText("🪐 Dinosaurieplaneten");
  });

  test("ett tryck på resegrafiken hoppar direkt till nästa planet", async ({ page }) => {
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await page.locator("#select-hangman-btn").click();
    await page.evaluate(() => { journeyState.fuel = 6; });
    await winRound(page);
    await page.locator("#hangman-again-btn").click();
    await expect(page.locator("#hangman-launch-overlay")).not.toHaveClass(/hidden/);

    await page.locator("#hangman-launch-overlay").click();
    // Långt kortare än resans 5 sekunder — ska vara borta direkt.
    await expect(page.locator("#hangman-launch-overlay")).toHaveClass(/hidden/, { timeout: 1000 });
    const { planetName, status } = await page.evaluate(() => ({
      planetName: getCurrentPlanet().name,
      status: hangmanState.status,
    }));
    expect(planetName).toBe("Dinosaurieplaneten");
    expect(status).toBe("playing");
  });

  test("trycker man Avsluta under resan drar landningen inte tillbaka en till spelet", async ({ page }) => {
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await page.locator("#select-hangman-btn").click();
    await page.evaluate(() => { journeyState.fuel = 6; });
    await winRound(page);
    await page.locator("#hangman-again-btn").click();
    await page.locator("#exit-btn").click();
    await expect(page.locator("#screen-exit-confirm")).toHaveClass(/active/);

    // Vänta ut hela resan — man ska stå kvar på Avsluta-frågan.
    await page.waitForTimeout(5600);
    await expect(page.locator("#screen-exit-confirm")).toHaveClass(/active/);

    // "Avbryt" tar tillbaka till en färdig ny omgång på nästa planet.
    await page.locator("#exit-cancel-btn").click();
    await expect(page.locator("#screen-hangman-game")).toHaveClass(/active/);
    await expect(page.locator("#hangman-launch-overlay")).toHaveClass(/hidden/);
    const status = await page.evaluate(() => hangmanState.status);
    expect(status).toBe("playing");
    await expect(page.locator("#hangman-planet-name")).toHaveText("🪐 Dinosaurieplaneten");
  });

  test("planetens färgton syns bara på Hänga gubbe-skärmen, inte kvar efter Avsluta", async ({ page }) => {
    const appBackgroundImage = () =>
      page.evaluate(() => getComputedStyle(document.getElementById("app")).backgroundImage);

    await page.goto("/");
    await page.locator("#screen-intro").click();
    await page.locator("#select-hangman-btn").click();
    // Planeternas ton är en gradient; standardpanelen är en enfärgad bakgrund.
    expect(await appBackgroundImage()).toContain("gradient");

    await page.locator("#exit-btn").click();
    await expect(page.locator("#screen-exit-confirm")).toHaveClass(/active/);
    expect(await appBackgroundImage()).toBe("none");

    // Avbryt → tillbaka på planeten, tonen ska komma tillbaka.
    await page.locator("#exit-cancel-btn").click();
    await expect(page.locator("#screen-hangman-game")).toHaveClass(/active/);
    expect(await appBackgroundImage()).toContain("gradient");

    // Avsluta på riktigt → avskedsskärmen och spelvalet ska vara utan ton.
    await page.locator("#exit-btn").click();
    await page.locator("#exit-confirm-btn").click();
    await expect(page.locator("#screen-goodbye")).toHaveClass(/active/);
    expect(await appBackgroundImage()).toBe("none");
    await page.locator("#goodbye-back-btn").click();
    await expect(page.locator("#screen-game-select")).toHaveClass(/active/);
    expect(await appBackgroundImage()).toBe("none");
  });

  test("resan sparas i localStorage och finns kvar efter en omladdning", async ({ page }) => {
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await page.locator("#select-hangman-btn").click();
    await winRound(page);

    let stored = await page.evaluate(() => JSON.parse(localStorage.getItem("rymdarkaden-journey-v1")));
    expect(stored.fuel).toBe(2);
    expect(stored.planetIndex).toBe(0);

    await page.reload();
    const stateAfterReload = await page.evaluate(() => journeyState);
    expect(stateAfterReload.fuel).toBe(2);
    expect(stateAfterReload.planetIndex).toBe(0);
  });

  test("Luffarschack påverkas inte av resan (ingen bränslemätare, ingen planet-bakgrund)", async ({ page }) => {
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await page.locator("#select-tictactoe-btn").click();
    await page.locator("#start-btn").click();
    await expect(page.locator("#screen-game")).toHaveClass(/active/);
    await expect(page.locator("#app")).not.toHaveClass(/on-planet/);
  });

  test("ingen horisontell overflow på Hänga gubbe-skärmen med bränslemätaren synlig, @ 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await page.locator("#select-hangman-btn").click();
    await expect(page.locator("#screen-hangman-game")).toHaveClass(/active/);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});
