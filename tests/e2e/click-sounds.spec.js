// Testar iteration 3: playClick() lades till på nästan alla
// navigeringsknappar i appen (tidigare spelade bara Hänga gubbes
// "Nytt ord"/"Byt spel" klickljud). Precis som i hangman-sound.spec.js
// och luffarschack-sound.spec.js går det inte att "höra" Web Audio
// API-ljud i Playwright, så vi apar in en räknare på window.playClick
// och verifierar att den räknas upp av rätt knapp — inte att tonen
// faktiskt låter.
//
// Täcker också iteration 3:s andra ändring: getAudioContext() i
// sound.js ska anropa ctx.resume() inte bara när AudioContext-state
// är "suspended" utan även "interrupted" (iOS Safaris eget state när
// fliken bakgrundas). Det testas separat, direkt mot funktionen via
// page.evaluate, genom att apa in ett fejkat AudioContext-state med
// Object.defineProperty (samma teknik som användes manuellt tidigare
// i den här sessionen för att felsöka buggen).
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

// Apar in en räknare på window.playClick. Delad helper så varje
// test-case slipper upprepa samma boilerplate.
async function mockClickSound(page) {
  await page.evaluate(() => {
    window.__clickCalls = 0;
    window.playClick = () => {
      window.__clickCalls++;
    };
  });
}

async function resetClickCount(page) {
  await page.evaluate(() => {
    window.__clickCalls = 0;
  });
}

async function getClickCount(page) {
  return page.evaluate(() => window.__clickCalls);
}

test.describe("Klickljud (playClick): grundnavigering", () => {
  test("spelas när man klickar sig förbi introskärmen", async ({ page }) => {
    await page.goto("/");
    await mockClickSound(page);

    await page.locator("#screen-intro").click();
    await expect(page.locator("#screen-game-select")).toHaveClass(/active/);
    expect(await getClickCount(page)).toBe(1);
  });

  test("spelas när man väljer Luffarschack (#select-tictactoe-btn)", async ({ page }) => {
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await mockClickSound(page);

    await page.locator("#select-tictactoe-btn").click();
    await expect(page.locator("#screen-welcome")).toHaveClass(/active/);
    expect(await getClickCount(page)).toBe(1);
  });

  test("spelas när man väljer Hänga gubbe (#select-hangman-btn)", async ({ page }) => {
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await mockClickSound(page);

    await page.locator("#select-hangman-btn").click();
    await expect(page.locator("#screen-hangman-game")).toHaveClass(/active/);
    expect(await getClickCount(page)).toBe(1);
  });

  test("spelas när man startar en ny Luffarschack-serie (#start-btn)", async ({ page }) => {
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await page.locator("#select-tictactoe-btn").click();
    await mockClickSound(page);

    await page.locator("#start-btn").click();
    await expect(page.locator("#screen-game")).toHaveClass(/active/);
    expect(await getClickCount(page)).toBe(1);
  });
});

test.describe("Klickljud (playClick): Byt spel-knappar", () => {
  test("welcome-switch-btn spelar klickljud och går till spelvalet", async ({ page }) => {
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await page.locator("#select-tictactoe-btn").click();
    await mockClickSound(page);

    await page.locator("#welcome-switch-btn").click();
    await expect(page.locator("#screen-game-select")).toHaveClass(/active/);
    expect(await getClickCount(page)).toBe(1);
  });

  test("round-switch-btn spelar klickljud och går till spelvalet", async ({ page }) => {
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await page.locator("#select-tictactoe-btn").click();
    await page.locator("#start-btn").click();
    await expect(page.locator("#screen-game")).toHaveClass(/active/);

    // Se till att vi vet vem som börjar, och avgör en match snabbt så
    // round-result (och round-switch-btn) blir synlig.
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

    await mockClickSound(page);
    await page.locator("#round-switch-btn").click();
    await expect(page.locator("#screen-game-select")).toHaveClass(/active/);
    expect(await getClickCount(page)).toBe(1);
  });

  test("play-again-switch-btn spelar klickljud och går till spelvalet", async ({ page }) => {
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await page.locator("#select-tictactoe-btn").click();
    await page.locator("#start-btn").click();

    // Vinn hela serien direkt (3 matchvinster i rad) för att nå
    // screen-series-winner, sedan continue-btn -> screen-play-again.
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
    await expect(page.locator("#screen-play-again")).toHaveClass(/active/);

    await mockClickSound(page);
    await page.locator("#play-again-switch-btn").click();
    await expect(page.locator("#screen-game-select")).toHaveClass(/active/);
    expect(await getClickCount(page)).toBe(1);
  });

  test("goodbye-back-btn spelar klickljud och går till spelvalet", async ({ page }) => {
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await page.locator("#exit-btn").click();
    await expect(page.locator("#screen-exit-confirm")).toHaveClass(/active/);
    await page.locator("#exit-confirm-btn").click();
    await expect(page.locator("#screen-goodbye")).toHaveClass(/active/);

    await mockClickSound(page);
    await page.locator("#goodbye-back-btn").click();
    await expect(page.locator("#screen-game-select")).toHaveClass(/active/);
    expect(await getClickCount(page)).toBe(1);
  });
});

test.describe("Klickljud (playClick): nästa match-knappen", () => {
  test("spelas när man går vidare till nästa match (serien inte avgjord än)", async ({ page }) => {
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await page.locator("#select-tictactoe-btn").click();
    await page.locator("#start-btn").click();

    // John vinner en match, men har bara 1 av 3 vinster totalt — serien
    // är alltså inte avgjord och next-round-btn ska ta oss till en ny
    // match (inte screen-series-winner).
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
    const scores = await page.evaluate(() => state.scores);
    expect(scores.John).toBe(1);

    await mockClickSound(page);
    await page.locator("#next-round-btn").click();

    await expect(page.locator("#screen-game")).toHaveClass(/active/);
    await expect(page.locator("#screen-series-winner")).not.toHaveClass(/active/);
    expect(await getClickCount(page)).toBe(1);
  });

  test("spelas INTE när next-round-btn istället avgör hela serien", async ({ page }) => {
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
    const scores = await page.evaluate(() => state.scores);
    expect(scores.John).toBe(3);

    await mockClickSound(page);
    await page.locator("#next-round-btn").click();

    // Den här grenen spelar playSeriesWin, inte playClick (se
    // luffarschack-sound.spec.js för att playSeriesWin faktiskt anropas).
    await expect(page.locator("#screen-series-winner")).toHaveClass(/active/);
    expect(await getClickCount(page)).toBe(0);
  });
});

test.describe("Klickljud (playClick): efter serievinst", () => {
  async function reachSeriesWinnerScreen(page) {
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
  }

  test("continue-btn spelar klickljud och går till screen-play-again", async ({ page }) => {
    await reachSeriesWinnerScreen(page);

    await mockClickSound(page);
    await page.locator("#continue-btn").click();
    await expect(page.locator("#screen-play-again")).toHaveClass(/active/);
    expect(await getClickCount(page)).toBe(1);
  });

  test("play-again-btn spelar klickljud och startar en ny serie", async ({ page }) => {
    await reachSeriesWinnerScreen(page);
    await page.locator("#continue-btn").click();
    await expect(page.locator("#screen-play-again")).toHaveClass(/active/);

    await mockClickSound(page);
    await page.locator("#play-again-btn").click();
    await expect(page.locator("#screen-game")).toHaveClass(/active/);
    expect(await getClickCount(page)).toBe(1);

    const scores = await page.evaluate(() => state.scores);
    expect(scores.John).toBe(0);
    expect(scores.Vera).toBe(0);
  });
});

test.describe("Klickljud (playClick): avsluta-flödet", () => {
  test("exit-btn spelar klickljud och visar bekräftelseskärmen", async ({ page }) => {
    await page.goto("/");
    await mockClickSound(page);

    await page.locator("#exit-btn").click();
    await expect(page.locator("#screen-exit-confirm")).toHaveClass(/active/);
    expect(await getClickCount(page)).toBe(1);
  });

  test("exit-cancel-btn spelar klickljud och återgår till skärmen man kom från", async ({ page }) => {
    await page.goto("/");
    await page.locator("#screen-intro").click();
    await page.locator("#select-hangman-btn").click();
    await expect(page.locator("#screen-hangman-game")).toHaveClass(/active/);

    await page.locator("#exit-btn").click();
    await expect(page.locator("#screen-exit-confirm")).toHaveClass(/active/);

    await mockClickSound(page);
    await page.locator("#exit-cancel-btn").click();
    await expect(page.locator("#screen-hangman-game")).toHaveClass(/active/);
    expect(await getClickCount(page)).toBe(1);
  });

  test("exit-confirm-btn spelar klickljud och leder till avskedsskärmen", async ({ page }) => {
    await page.goto("/");
    await page.locator("#exit-btn").click();
    await expect(page.locator("#screen-exit-confirm")).toHaveClass(/active/);

    await mockClickSound(page);
    await page.locator("#exit-confirm-btn").click();
    await expect(page.locator("#screen-goodbye")).toHaveClass(/active/);
    expect(await getClickCount(page)).toBe(1);
  });
});

// --- getAudioContext() och "interrupted"-state (iOS Safari) ---
//
// iOS Safari kan sätta AudioContext.state till "interrupted" (istället
// för "suspended") när fliken bakgrundas, t.ex. vid ett samtal eller
// appväxling. Buggen i iteration 3 var att koden bara kollade
// "=== suspended", vilket lämnade ljudet permanent tyst efter en sådan
// avbrytning. Fixen bytte till "!== running". Vi testar detta direkt
// mot getAudioContext() i sound.js, utan att gå via UI, genom att apa
// in ett riktigt AudioContext-objekt vars .state är låst till
// "interrupted" och räkna .resume()-anrop.
test.describe("getAudioContext(): iOS Safaris 'interrupted'-state", () => {
  test("ctx.resume() anropas när state är 'interrupted', inte bara 'suspended'", async ({ page }) => {
    await page.goto("/");

    const result = await page.evaluate(() => {
      // Skapa en riktig AudioContext (så getAudioContext() får ett
      // objekt med en riktig .resume()-metod att anropa), men lås dess
      // .state till "interrupted" och räkna anrop till .resume().
      const RealAudioContext = window.AudioContext || window.webkitAudioContext;
      const realCtx = new RealAudioContext();

      let resumeCalls = 0;
      const originalResume = realCtx.resume.bind(realCtx);
      realCtx.resume = () => {
        resumeCalls++;
        return originalResume();
      };

      Object.defineProperty(realCtx, "state", {
        get: () => "interrupted",
      });

      // Tvinga in vår preparerade context i sound.js interna audioCtx-
      // variabel genom att köra om samma skapande-logik: eftersom
      // audioCtx är en modul-privat variabel (inte på window) kan vi
      // inte sätta den direkt utifrån, så vi patchar istället den
      // globala AudioContext-konstruktorn till att returnera vår
      // preparerade instans nästa gång getAudioContext() skapar en ny
      // context, och nollställer soundEnabled/anropar en playX-funktion
      // som går via getAudioContext() för att trigga den koden.
      window.AudioContext = function () {
        return realCtx;
      };
      window.webkitAudioContext = window.AudioContext;

      // playClick() (den riktiga, odummade versionen finns kvar på
      // window eftersom inget test i den här filen kör i samma
      // page-instans) går via playTone() -> getAudioContext(), vilket
      // är den enda vägen in i funktionen (den är inte global själv).
      window.playClick();

      return { resumeCalls, state: realCtx.state };
    });

    expect(result.state).toBe("interrupted");
    expect(result.resumeCalls).toBeGreaterThanOrEqual(1);
  });
});
