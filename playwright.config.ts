import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for E2E tests.
 * 
 * Run all tests: npm run test:e2e
 * Run chromium only: npx playwright test --project=chromium
 * 
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
  ],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  // Only run chromium by default for faster local testing
  // CI can override with --project=firefox,webkit if needed
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Optional: uncomment to run on more browsers
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },
  ],
  // Web server configuration
  // Set PLAYWRIGHT_START_SERVER=1 to auto-start the dev server
  webServer: process.env.PLAYWRIGHT_START_SERVER
    ? {
      command: "npm run dev",
      url: process.env.BASE_URL || "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120 * 1000,
    }
    : undefined,
});
