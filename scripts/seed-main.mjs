// Seeds the PRODUCTION `main` Neon branch using the named `DATABASE_URL_MAIN`
// from .env.local and the SAME idempotent seed logic as dev/test (`db:seed` ->
// scripts/seed-projects.ts, upsert-by-id) — no duplicated logic, just
// redirected via env, and no hand-pasted connection string. Deploy-time only,
// for a CONTENT change; a schema-only deploy needs `db:migrate:main`, not this.
import { config as loadEnv } from "dotenv";
import { spawnSync } from "node:child_process";

loadEnv({ path: ".env.local", quiet: true });

const url = process.env.DATABASE_URL_MAIN;
if (!url) {
  console.error(
    "DATABASE_URL_MAIN is not set in .env.local — add the main branch's pooled connection string.",
  );
  process.exit(1);
}

let host;
try {
  host = new URL(url).host;
} catch {
  console.error("DATABASE_URL_MAIN is not a valid URL.");
  process.exit(1);
}
console.log(`>>> Seeding the PRODUCTION main branch — host: ${host}`);

// `scripts/seed-projects.ts` (via `db:seed`, so its `predb:seed` Velite hook
// still fires) reads DATABASE_URL and re-runs dotenv, a no-op here since it's
// already set below — redirecting the EXISTING seed onto main without code changes.
const childEnv = {
  ...process.env,
  DATABASE_URL: url,
};

const result = spawnSync("pnpm", ["run", "db:seed"], {
  stdio: "inherit",
  shell: true,
  env: childEnv,
});

process.exit(result.status ?? 1);
