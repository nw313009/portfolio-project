// Runs the FULL e2e pipeline against an isolated, deterministically-seeded
// Neon TEST branch — never `dev`, never `main`.
//
// Why a rebuild is required (not just a different webServer env): `/` is
// ISR-prerendered at `next build` time (see the `export const revalidate`
// in src/app/page.tsx), so whatever `DATABASE_URL` is active DURING
// `next build` is what gets baked into the page Playwright's `next start`
// then serves. Acceptance tests were previously coupled to whatever
// happened to be sitting in the mutable `dev` branch (e.g. the
// Slice-4-ingested "Ticket Service" that broke a Phase 1 e2e assertion)
// because `pnpm build` always read `.env.local`'s dev `DATABASE_URL`. This
// script migrates + seeds the disposable `test` branch, then rebuilds
// SPECIFICALLY for e2e against it, so the suite runs against a known,
// reproducible state without ever touching dev data. The regular
// `pnpm build` (used by the rest of the Test Gate, local iteration, and the
// Vercel deploy) is untouched and still targets dev.
import { config as loadEnv } from "dotenv";
import { spawnSync } from "node:child_process";

loadEnv({ path: ".env.local", quiet: true });

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
if (!TEST_DATABASE_URL) {
  console.error(
    "TEST_DATABASE_URL is not set in .env.local — point it at a disposable Neon test branch.",
  );
  process.exit(1);
}

// Force every child below onto the test branch. Setting BOTH `DATABASE_URL`
// and `DATABASE_URL_UNPOOLED` keeps drizzle.config.ts's own dotenv reload a
// no-op — it only backfills vars that are still unset, so a missing
// `DATABASE_URL_UNPOOLED` would otherwise be silently refilled from
// `.env.local` with dev's value (the Slice 1 gotcha logged in PROGRESS.md).
const testEnv = {
  ...process.env,
  DATABASE_URL: TEST_DATABASE_URL,
  DATABASE_URL_UNPOOLED: TEST_DATABASE_URL,
  // Keeps installed browsers inside node_modules (persists across sessions)
  // rather than a machine-global cache dir.
  PLAYWRIGHT_BROWSERS_PATH: "0",
};

function run(label, command, args) {
  console.log(`\n[e2e] ${label}...`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: true, env: testEnv });
  if (result.status !== 0) {
    console.error(`[e2e] "${label}" failed (exit ${result.status}).`);
    process.exit(result.status ?? 1);
  }
}

run("migrating the test branch", "pnpm", ["run", "db:migrate:test"]);
run("seeding the test branch (idempotent)", "pnpm", ["run", "db:seed:test"]);
run("building against the seeded test branch", "pnpm", ["run", "build"]);
run("running Playwright", "pnpm", ["exec", "playwright", "test"]);
