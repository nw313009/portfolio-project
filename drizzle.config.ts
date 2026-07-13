import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit does not auto-load .env files.
loadEnv({ path: ".env.local", quiet: true });

/**
 * Migrations use the direct/unpooled connection (`DATABASE_URL_UNPOOLED`) —
 * DDL and drizzle-kit's own migration-tracking queries prefer a stable,
 * non-PgBouncer'd session, per Neon's guidance. Falls back to `DATABASE_URL`
 * so `db:migrate:test` (which only has a pooled `TEST_DATABASE_URL` to set)
 * still works.
 *
 * Per the Phase 2 infra decision: a disposable/reset `test` branch for
 * migrations + unit tests, a seeded `dev` branch for E2E, `main` = prod.
 * Never run drizzle-kit against prod from here.
 *
 * `db:generate` diffs the schema against local migration snapshots and needs
 * no live connection, so a missing url only fails loudly when a command that
 * actually connects (`db:migrate`, `studio`, ...) runs.
 */
const url =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DATABASE_URL ??
  "postgres://unset:unset@unset/unset";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
