import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { config as loadEnv } from "dotenv";

// Vitest doesn't load Next.js's .env files on its own; this makes
// `.env.local` (DATABASE_URL, TEST_DATABASE_URL, ...) visible to
// `process.env` here, same as `next dev`/`next build` would.
loadEnv({ path: ".env.local", quiet: true });

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    // Test files run in a worker pool that does NOT inherit this config
    // module's `process.env` mutations from `loadEnvConfig` above, so the
    // relevant vars must be forwarded explicitly via `test.env`.
    env: {
      DATABASE_URL: process.env.DATABASE_URL,
      TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
    },
  },
});
