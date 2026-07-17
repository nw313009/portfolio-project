// Pre-flight for the `projects_single_preview_shape` CHECK constraint: counts
// any existing `projects` row that carries BOTH preview shapes (a `preview`
// jsonb AND a flat `demo_url`/`preview_type`). Postgres rejects ADD CONSTRAINT
// CHECK when existing data violates it, so this is the "verify before adding"
// gate the preview-rendering slice requires — run it per branch:
//
//   node scripts/verify-preview-shape.mjs         # DATABASE_URL (dev)
//   node scripts/verify-preview-shape.mjs test    # TEST_DATABASE_URL
//   DATABASE_URL=<main-url> node scripts/verify-preview-shape.mjs   # deploy-time main check (docs/DEPLOY.md)
//
// Read-only: it never writes, so it's safe to point at any branch, including main.
import { config as loadEnv } from "dotenv";
import { neon } from "@neondatabase/serverless";

loadEnv({ path: ".env.local", quiet: true });

const target = process.argv[2] === "test" ? "TEST_DATABASE_URL" : "DATABASE_URL";
const url = process.env[target];
if (!url) {
  console.error(`${target} is not set in .env.local.`);
  process.exit(1);
}

const sql = neon(url);
const rows = await sql`
  SELECT count(*)::int AS violations
  FROM projects
  WHERE NOT (preview IS NULL OR (demo_url IS NULL AND preview_type IS NULL))
`;
const violations = rows[0]?.violations ?? 0;
console.log(`[${target}] single-preview-shape violations: ${violations}`);
if (violations > 0) {
  console.error(
    "Existing rows carry BOTH shapes — do NOT add the CHECK until they're reconciled.",
  );
  process.exit(1);
}
console.log(`[${target}] OK — safe to add the CHECK constraint.`);
