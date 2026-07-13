// Runs drizzle-kit migrate against the disposable Neon `test` branch
// (TEST_DATABASE_URL), never the app's `dev`/`prod` DATABASE_URL. Used to
// verify migrations apply cleanly before/independent of seeding `dev`.
import { config as loadEnv } from "dotenv";
import { spawnSync } from "node:child_process";

loadEnv({ path: ".env.local", quiet: true });

if (!process.env.TEST_DATABASE_URL) {
  console.error(
    "TEST_DATABASE_URL is not set in .env.local — point it at a disposable Neon test branch.",
  );
  process.exit(1);
}

// `drizzle.config.ts` reloads `.env.local` itself via dotenv, which only
// skips vars already present in `process.env` — a *deleted* key looks unset
// to it and gets silently refilled from the file (the real dev-branch
// DATABASE_URL_UNPOOLED), redirecting the migration back to `dev`. Setting
// both keys explicitly to the test URL keeps dotenv's reload a no-op here.
const childEnv = {
  ...process.env,
  DATABASE_URL: process.env.TEST_DATABASE_URL,
  DATABASE_URL_UNPOOLED: process.env.TEST_DATABASE_URL,
};

const result = spawnSync("pnpm", ["exec", "drizzle-kit", "migrate"], {
  stdio: "inherit",
  shell: true,
  env: childEnv,
});

process.exit(result.status ?? 1);
