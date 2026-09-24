// @ts-check
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // WebKit = Safaris motor. Lades till efter att en iOS Safari-specifik
    // AudioContext-bugg ("interrupted"-state) upptäcktes genom manuell
    // kodgranskning, inte av testsviten — WebKit-körningar ger oss en chans
    // att fånga liknande motor-specifika buggar automatiskt i framtiden.
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    // Riktiga Android-enhetsprofiler (äkta touch-events, mobil Chrome/
    // Samsung Internet-liknande user-agent) — inte bara en smal
    // skrivbords-vy. Ingen exakt "OnePlus"-profil finns i Playwright;
    // Pixel 8 delar OnePlus 12:s 412px-bredd (samma tal vi använt som
    // OnePlus-proxy i responsive.spec.js sedan tidigare), och Galaxy S24
    // är en äkta Samsung-profil.
    { name: "android-samsung", use: { ...devices["Galaxy S24"] } },
    { name: "android-oneplus-liknande", use: { ...devices["Pixel 8"] } },
  ],
  // Startar den vanliga lokala servern (samma "npm start" man kör för hand)
  // automatiskt innan testerna kör, och stänger av den efteråt.
  webServer: {
    command: "npm start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
