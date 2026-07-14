// Seeds the `projects` table from the typed MDX content (Velite output) so
// the public timeline (Slice 2) can read from Postgres instead of MDX at
// request time. Safe to re-run: each project is upserted by `id`
// (`upsertProject`), so re-seeding after editing an MDX file updates the
// existing row instead of erroring or duplicating it.
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set in .env.local — point it at the Neon dev branch before seeding.",
  );
  process.exit(1);
}

async function main() {
  // Imported inside `main` (after the env-var guard above and its
  // `process.exit`) rather than as static top-level imports, so a missing
  // `DATABASE_URL` is reported by the guard's clear message instead of a
  // stack trace from `@/db/env` while the module graph loads.
  const { projects } = await import("@/lib/content");
  const { projectEntryToInsertRow } = await import("@/db/mappers");
  const { upsertProject } = await import("@/db/queries");

  let count = 0;
  for (const entry of projects) {
    await upsertProject(projectEntryToInsertRow(entry, "published"));
    count += 1;
  }
  console.log(`Seeded ${count} published project(s) into the projects table.`);
}

main().catch((error: unknown) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
