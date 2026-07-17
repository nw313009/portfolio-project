// Runs drizzle-kit migrate against the PRODUCTION `main` Neon branch, using the
// named `DATABASE_URL_MAIN_UNPOOLED` from .env.local — so the main connection
// string is NEVER hand-pasted into a shell (that's how it leaked once, and how
// it silently hit dev twice). Deploy-time only; see docs/DEPLOY.md.
//
// Echoes the target host before migrating: if it isn't the prod endpoint, STOP.
import { config as loadEnv } from "dotenv";
import { spawnSync } from "node:child_process";

loadEnv({ path: ".env.local", quiet: true });

const url = process.env.DATABASE_URL_MAIN_UNPOOLED;
if (!url) {
  console.error(
    "DATABASE_URL_MAIN_UNPOOLED is not set in .env.local — add the main branch's UNPOOLED (non-pooler) connection string.",
  );
  process.exit(1);
}

let host;
try {
  host = new URL(url).host;
} catch {
  console.error("DATABASE_URL_MAIN_UNPOOLED is not a valid URL.");
  process.exit(1);
}
console.log(`>>> Migrating the PRODUCTION main branch — host: ${host}`);

// `drizzle.config.ts` prefers DATABASE_URL_UNPOOLED and re-loads .env.local via
// dotenv, which only fills UNSET vars. Setting BOTH keys to the main unpooled
// string keeps that reload a no-op and prevents a silent redirect to dev's
// DATABASE_URL_UNPOOLED (the Slice 1 gotcha + the 2026-07-17 wrong-branch miss).
const childEnv = {
  ...process.env,
  DATABASE_URL: url,
  DATABASE_URL_UNPOOLED: url,
};

const result = spawnSync("pnpm", ["exec", "drizzle-kit", "migrate"], {
  stdio: "inherit",
  shell: true,
  env: childEnv,
});

process.exit(result.status ?? 1);
