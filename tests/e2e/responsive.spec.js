// Regressionstest för layout-buggarna som beskrivs i CLAUDE.md under
// "Responsive layout gotchas" — horisontell overflow på smala/korta
// viewports (fast pixelbredd på brädet/tangentbordet, cirkulär
// storleksberoende mellan .board-wrap och .board, m.m.). De buggarna har
// tidigare bara upptäckts manuellt (genom att i en browser-flik ändra
// fönsterstorlek till 320px, ~412×915 och en bred desktop-vy och kolla
// document.documentElement.scrollWidth <= window.innerWidth för hand) —
// det här testet gör samma kontroll automatiskt, på tre skärmstorlekar,
// för varje skärm i båda spelen (inklusive resultatlägena som visas
// inline istället för på en egen skärm, se CLAUDE.md).
//
// Testar också att de två fast positionerade knapparna uppe i hörnen
// (#sound-toggle-btn uppe till vänster, #exit-btn uppe till höger) aldrig
// överlappar varandra på någon av storlekarna — samma bounding-box-teknik
// som redan används i hangman-sound.spec.js.
const { test, expect } = require("@playwright/test");

// Samma skäl som i övriga *-sound.spec.js-filer: stäng av service
// worker-registreringen så en automatisk omladdning ("controllerchange")
// inte kan spränga ett page.evaluate() mitt i testet med
// "Execution context was destroyed".
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register = () => Promise.resolve({});
    }
  });
});

const VIEWPORTS = [
  { name: "320x700 (minsta rimliga telefon)", width: 320, height: 700 },
  { name: "412x915 (OnePlus-liknande, målenheten)", width: 412, height: 915 },
  { name: "1400x900 (bred desktop)", width: 1400, height: 900 },
];

// Kollar att sidan inte kräver horisontell scroll, exakt så som
// CLAUDE.md beskriver den manuella kontrollen.
async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    overflow.scrollWidth,
    `document.documentElement.scrollWidth (${overflow.scrollWidth}) ska vara <= window.innerWidth (${overflow.innerWidth})`
  ).toBeLessThanOrEqual(overflow.innerWidth);
}

// Kollar att #sound-toggle-btn och #exit-btn aldrig överlappar varandra
// (samma bounding-box-teknik som i hangman-sound.spec.js).
async function expectSoundAndExitDontOverlap(page) {
  const soundBtn = page.locator("#sound-toggle-btn");
  const exitBtn = page.locator("#exit-btn");
  await expect(soundBtn).toBeVisible();
  await expect(exitBtn).toBeVisible();

  const soundBox = await soundBtn.boundingBox();
  const exitBox = await exitBtn.boundingBox();
  expect(soundBox).not.toBeNull();
  expect(exitBox).not.toBeNull();

  const overlaps =
    soundBox.x < exitBox.x + exitBox.width &&
    soundBox.x + soundBox.width > exitBox.x &&
    soundBox.y < exitBox.y + exitBox.height &&
    soundBox.y + soundBox.height > exitBox.y;
  expect(overlaps, "sound-toggle-btn och exit-btn ska inte överlappa").toBe(false);
}

// Gemensam koll som körs på varje skärm/storlek-kombination.
async function checkScreen(page, screenId) {
  await expect(page.locator(`#${screenId}`)).toHaveClass(/active/);
  await expectNoHorizontalOverflow(page);
  await expectSoundAndExitDontOverlap(page);
}

for (const viewport of VIEWPORTS) {
  test.describe(`Responsiv layout @ ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("screen-game-select: ingen horisontell overflow, knapparna överlappar inte", async ({
      page,
    }) => {
      await page.goto("/");
      await page.locator("#screen-intro").click();
      await checkScreen(page, "screen-game-select");
    });

    test("screen-welcome (Luffarschack): ingen horisontell overflow, knapparna överlappar inte", async ({
      page,
    }) => {
      await page.goto("/");
      await page.locator("#screen-intro").click();
      await page.locator("#select-tictactoe-btn").click();
      await checkScreen(page, "screen-welcome");
    });

    test("screen-game (Luffarschack, matchresultat synligt): ingen horisontell overflow, knapparna överlappar inte", async ({
      page,
    }) => {
      await page.goto("/");
      await page.locator("#screen-intro").click();
      await page.locator("#select-tictactoe-btn").click();
      await page.locator("#start-btn").click();
      await expect(page.locator("#screen-game")).toHaveClass(/active/);

      // Driv fram ett matchresultat direkt via state/spellogik (samma
      // teknik som i luffarschack-sound.spec.js) istället för att lita
      // på slumpad nextStarter.
      await page.evaluate(() => {
        state.currentPlayer = "John";
      });
      await page.evaluate(() => {
        placeMark(0); // John
        placeMark(3); // Vera
        placeMark(1); // John
        placeMark(4); // Vera
        placeMark(2); // John -> vinstlinje [0,1,2]
      });
      await expect(page.locator("#round-result")).not.toHaveClass(/hidden/);

      await checkScreen(page, "screen-game");
    });

    test("screen-hangman-game (resultat synligt): ingen horisontell overflow, knapparna överlappar inte", async ({
      page,
    }) => {
      await page.goto("/");
      await page.locator("#screen-intro").click();
      await page.locator("#select-hangman-btn").click();
      await expect(page.locator("#screen-hangman-game")).toHaveClass(/active/);

      // Driv fram en vinst direkt via spellogiken (samma teknik som i
      // hangman-sound.spec.js) för att nå det inline resultatläget.
      await page.evaluate(() => {
        startNewHangmanRound();
      });
      const word = await page.evaluate(() => hangmanState.word);
      const uniqueLetters = [...new Set(word.split(""))];
      for (const letter of uniqueLetters) {
        await page.evaluate((l) => guessLetter(l), letter);
      }
      const status = await page.evaluate(() => hangmanState.status);
      expect(status).toBe("won");
      await expect(page.locator("#hangman-result")).not.toHaveClass(/hidden/);

      await checkScreen(page, "screen-hangman-game");
    });

    test("screen-series-winner: ingen horisontell overflow, knapparna överlappar inte", async ({
      page,
    }) => {
      await page.goto("/");
      await page.locator("#screen-intro").click();
      await page.locator("#select-tictactoe-btn").click();
      await page.locator("#start-btn").click();

      // Vinn hela serien direkt (John har redan 2 av 3 matchvinster,
      // vinner den tredje och avgörande matchen).
      await page.evaluate(() => {
        state.currentPlayer = "John";
        state.scores = { John: 2, Vera: 0 };
      });
      await page.evaluate(() => {
        placeMark(0); // John
        placeMark(3); // Vera
        placeMark(1); // John
        placeMark(4); // Vera
        placeMark(2); // John -> vinstlinje [0,1,2], John når 3 matchvinster
      });
      await page.locator("#next-round-btn").click();
      await checkScreen(page, "screen-series-winner");
    });

    test("screen-play-again: ingen horisontell overflow, knapparna överlappar inte", async ({
      page,
    }) => {
      await page.goto("/");
      await page.locator("#screen-intro").click();
      await page.locator("#select-tictactoe-btn").click();
      await page.locator("#start-btn").click();

      await page.evaluate(() => {
        state.currentPlayer = "John";
        state.scores = { John: 2, Vera: 0 };
      });
      await page.evaluate(() => {
        placeMark(0); // John
        placeMark(3); // Vera
        placeMark(1); // John
        placeMark(4); // Vera
        placeMark(2); // John -> vinstlinje [0,1,2], John når 3 matchvinster
      });
      await page.locator("#next-round-btn").click();
      await expect(page.locator("#screen-series-winner")).toHaveClass(/active/);
      await page.locator("#continue-btn").click();

      await checkScreen(page, "screen-play-again");
    });
  });
}
