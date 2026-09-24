// Ett minimalt rök-test som bevisar att Playwright-uppsättningen fungerar
// end-to-end (server startar, sidan laddar, man kan navigera). Riktiga
// testfall för respektive spel hör hemma i egna filer här i tests/e2e/,
// skrivna av qa-browser-agenten.
const { test, expect } = require("@playwright/test");

test("appen laddar och spelvalet går att nå", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#screen-intro")).toHaveClass(/active/);

  await page.locator("#screen-intro").click();
  await expect(page.locator("#screen-game-select")).toHaveClass(/active/);

  await page.locator("#select-hangman-btn").click();
  await expect(page.locator("#screen-hangman-game")).toHaveClass(/active/);
});
