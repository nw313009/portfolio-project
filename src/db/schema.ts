import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { Preview } from "@/lib/project-schema";

/**
 * `draft` projects are created by GitHub ingestion (Slice 4) before an admin
 * publishes them; `published` projects render on the public timeline.
 */
export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "published",
]);

/**
 * Mirrors the Zod `Project` shape (`src/lib/project-schema.ts`) plus a few
 * DB-only fields (`status`, `mediaUrl`, timestamps). `startDate`/`endDate`
 * are stored as plain ISO-date text (not a `date` column) so they round-trip
 * byte-for-byte with the Zod schema and keep the existing lexicographic sort
 * used in `src/lib/content.ts`.
 */
export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  stack: jsonb("stack").$type<string[]>().notNull(),
  languages: jsonb("languages").$type<string[]>().notNull(),
  summary: text("summary").notNull(),
  githubUrl: text("github_url").notNull(),
  preview: jsonb("preview").$type<Preview>().notNull(),
  body: text("body").notNull().default(""),
  status: projectStatusEnum("status").notNull().default("draft"),
  mediaUrl: text("media_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

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
