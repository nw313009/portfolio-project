import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { Preview } from "@/lib/project-schema";
import { PREVIEW_TYPES } from "@/lib/project-schema";

/**
 * `draft` projects are created by GitHub ingestion (Slice 4) before an admin
 * publishes them; `published` projects render on the public timeline.
 */
export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "published",
]);

/**
 * The preview surface a project declares. Same six values as the Zod
 * `PREVIEW_TYPES` discriminated union (`src/lib/project-schema.ts`) — the enum
 * reuses that single source of truth. Slice 4 ingestion persists the
 * admin-chosen `previewType` per project (rendering the surface itself lives
 * in the later frontend preview slice).
 */
export const previewTypeEnum = pgEnum("preview_type", PREVIEW_TYPES);

/**
 * Mirrors the Zod `Project` shape (`src/lib/project-schema.ts`) plus a few
 * DB-only fields (`status`, `mediaUrl`, timestamps). `startDate`/`endDate`
 * are stored as plain ISO-date text (not a `date` column) so they round-trip
 * byte-for-byte with the Zod schema and keep the existing lexicographic sort
 * used in `src/lib/content.ts`.
 *
 * Slice 4 (GitHub ingestion) adds the `github*` identity/metadata columns,
 * `demoUrl`, and `previewType`. They are all nullable because the pre-existing
 * Slice 2 seed rows (from MDX) never set them, and `preview` is now nullable
 * too: ingested rows persist `previewType`/`demoUrl` instead of a full
 * discriminated-union `preview` payload (which arrives with the later preview
 * slice), while the seeded MDX rows keep their `preview` jsonb.
 */
export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date"),
    stack: jsonb("stack").$type<string[]>().notNull(),
    languages: jsonb("languages").$type<string[]>().notNull(),
    summary: text("summary").notNull(),
    githubUrl: text("github_url").notNull(),
    preview: jsonb("preview").$type<Preview>(),
    body: text("body").notNull().default(""),
    status: projectStatusEnum("status").notNull().default("draft"),
    mediaUrl: text("media_url"),
    // --- Slice 4: GitHub repo identity + fetched metadata ---
    githubOwner: text("github_owner"),
    githubRepo: text("github_repo"),
    primaryLanguage: text("primary_language"),
    stars: integer("stars"),
    topics: jsonb("topics").$type<string[]>(),
    githubCreatedAt: timestamp("github_created_at", { withTimezone: true }),
    githubPushedAt: timestamp("github_pushed_at", { withTimezone: true }),
    homepageUrl: text("homepage_url"),
    metadataFetchedAt: timestamp("metadata_fetched_at", { withTimezone: true }),
    demoUrl: text("demo_url"),
    previewType: previewTypeEnum("preview_type"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // One project per GitHub repo. Both columns are nullable, and Postgres
    // treats NULLs as distinct, so the Slice 2 seed rows (owner/repo both
    // NULL) never collide — only two rows with the *same* non-null owner+repo
    // violate it, which is exactly the duplicate-ingestion case we reject.
    unique("projects_github_owner_repo_unique").on(
      table.githubOwner,
      table.githubRepo,
    ),
  ],
);

export const eventTypeEnum = pgEnum("event_type", [
  "view",
  "hover",
  "demo-open",
  "outbound-click",
]);

/**
 * Append-only. `projectId` deliberately has **no foreign key** so old rows
 * can be deleted/archived later (deferred backlog item, see
 * `docs/PROGRESS.md`) without a schema migration or FK-blocked delete. The
 * `ts` index and `(project_id, ts)` composite index keep it partition- and
 * archival-friendly: a future job can page through by time or by project+time.
 */
export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: text("project_id").notNull(),
    type: eventTypeEnum("type").notNull(),
    ts: timestamp("ts", { withTimezone: true }).defaultNow().notNull(),
    sessionId: text("session_id").notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
  },
  (table) => [
    index("events_ts_idx").on(table.ts),
    index("events_project_ts_idx").on(table.projectId, table.ts),
  ],
);

/** Append-only record of every admin write (who, what, when). */
export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  ts: timestamp("ts", { withTimezone: true }).defaultNow().notNull(),
});

export type ProjectRow = typeof projects.$inferSelect;
export type NewProjectRow = typeof projects.$inferInsert;
export type EventRow = typeof events.$inferSelect;
export type NewEventRow = typeof events.$inferInsert;
export type AuditLogRow = typeof auditLog.$inferSelect;
export type NewAuditLogRow = typeof auditLog.$inferInsert;
