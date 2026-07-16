// Seeds the disposable Neon TEST branch (TEST_DATABASE_URL) using the SAME
// idempotent seed logic as `dev` (`pnpm db:seed` -> scripts/seed-projects.ts,
// upsert-by-id) — no duplicated seed logic, just redirected via env. This
// gives e2e a known, reproducible project set instead of coupling acceptance
// tests to whatever happens to be sitting in the mutable `dev` branch. Never
// touches `dev` or `main`.
import { config as loadEnv } from "dotenv";
import { spawnSync } from "node:child_process";

loadEnv({ path: ".env.local", quiet: true });

if (!process.env.TEST_DATABASE_URL) {
  console.error(
    "TEST_DATABASE_URL is not set in .env.local — point it at a disposable Neon test branch.",
  );
  process.exit(1);
}

// `scripts/seed-projects.ts` (run via the `db:seed` script, so its
// `predb:seed` Velite hook still fires) reads `DATABASE_URL` and re-runs its
// own dotenv load, which is a no-op here since `DATABASE_URL` is already set
// below — that's what redirects the EXISTING seed script onto the test
// branch without touching its code.
const childEnv = {
  ...process.env,
  DATABASE_URL: process.env.TEST_DATABASE_URL,
};

const result = spawnSync("pnpm", ["run", "db:seed"], {
  stdio: "inherit",
  shell: true,
  env: childEnv,
});

process.exit(result.status ?? 1);
