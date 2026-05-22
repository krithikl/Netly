import { defineConfig, devices } from "@playwright/test";

const port = 3000;
const managesOwnServer = process.env.NETLY_PLAYWRIGHT_MANAGED_SERVER !== "0";

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry"
  },
  webServer: managesOwnServer
    ? {
        command: "npm run dev",
        url: `http://localhost:${port}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
      }
    : undefined,
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1100 }
      }
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 412, height: 915 }
      }
    }
  ]
});
