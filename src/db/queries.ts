import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLog, events, projects } from "@/db/schema";
import type {
  AuditLogRow,
  EventRow,
  NewAuditLogRow,
  NewEventRow,
  NewProjectRow,
  ProjectRow,
} from "@/db/schema";
import { projectRowToEntry } from "@/db/mappers";
import type { ProjectEntry } from "@/lib/content";

export async function insertProject(row: NewProjectRow): Promise<ProjectRow> {
  const [inserted] = await db.insert(projects).values(row).returning();
  return inserted;
}

/**
 * Insert-or-update by `id`. Used by the Slice 2 seed script so re-running it
 * against already-seeded content updates the existing row (title, preview,
 * status, ...) instead of failing on the unique `id`/`slug` or duplicating
 * rows. `updatedAt` is refreshed on every upsert using the database's own
 * clock (`now()`), matching `createdAt`/`updatedAt`'s `defaultNow()` on
 * insert — the two remain comparable instead of mixing a Node.js
 * (`new Date()`) and a Postgres clock, which can disagree by seconds.
 * `createdAt` is left alone (only set on the initial insert).
 */
export async function upsertProject(row: NewProjectRow): Promise<ProjectRow> {
  const [upserted] = await db
    .insert(projects)
    .values(row)
    .onConflictDoUpdate({
      target: projects.id,
      set: {
        slug: row.slug,
        title: row.title,
        startDate: row.startDate,
        endDate: row.endDate,
        stack: row.stack,
        languages: row.languages,
        summary: row.summary,
        githubUrl: row.githubUrl,
        preview: row.preview,
        body: row.body,
        status: row.status,
        mediaUrl: row.mediaUrl,
        updatedAt: sql`now()`,
      },
    })
    .returning();
  return upserted;
}

/**
 * Public read path (Slice 2): only `published` rows, oldest `startDate`
 * first — same ordering the Phase 1 timeline used from MDX
 * (`src/lib/content.ts`'s `localeCompare` sort on ISO date strings).
 */
export async function getPublishedProjects(): Promise<ProjectRow[]> {
  return db
    .select()
    .from(projects)
    .where(eq(projects.status, "published"))
    .orderBy(asc(projects.startDate));
}

/**
 * `getPublishedProjects` rows mapped through `projectRowToEntry`, which
 * re-validates each row against `projectSchema` — a corrupt row throws here
 * instead of reaching the public timeline. This is the single call the
 * public page (`src/app/page.tsx`) uses.
 */
export async function getPublishedProjectEntries(): Promise<ProjectEntry[]> {
  const rows = await getPublishedProjects();
  return rows.map(projectRowToEntry);
}

export async function getProjectById(
  id: string,
): Promise<ProjectRow | undefined> {
  const [row] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  return row;
}

export async function deleteProject(id: string): Promise<void> {
  await db.delete(projects).where(eq(projects.id, id));
}

export async function appendEvent(row: NewEventRow): Promise<EventRow> {
  const [inserted] = await db.insert(events).values(row).returning();
  return inserted;
}

export async function deleteEventsByProjectId(
  projectId: string,
): Promise<void> {
  await db.delete(events).where(eq(events.projectId, projectId));
}

export async function insertAuditLog(
  row: NewAuditLogRow,
): Promise<AuditLogRow> {
  const [inserted] = await db.insert(auditLog).values(row).returning();
  return inserted;
}

export async function deleteAuditLogById(id: string): Promise<void> {
  await db.delete(auditLog).where(eq(auditLog.id, id));
}
