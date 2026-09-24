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
  ],
  // Startar den vanliga lokala servern (samma "npm start" man kör för hand)
  // automatiskt innan testerna kör, och stänger av den efteråt.
  webServer: {
    command: "npm start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
