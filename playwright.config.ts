import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Launch the production server as a direct `node` process (no pnpm/cmd
    // wrapper) so Playwright's force-kill reaches the real server on Windows and
    // teardown doesn't hang. Requires a prior `next build` (the Test Gate runs
    // `pnpm build` before `pnpm test:e2e`). Locally, an already-running server on
    // the same port is reused instead (see reuseExistingServer), keeping
    // slice-to-slice iteration fast.
    command: `node node_modules/next/dist/bin/next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
