import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { txDb } from "@/db/tx-client";
import { auditLog, events, projects } from "@/db/schema";
import type {
  AuditLogRow,
  EventRow,
  NewAuditLogRow,
  NewEventRow,
  NewProjectRow,
  ProjectRow,
} from "@/db/schema";
import { projectRowToTimelineNode } from "@/db/mappers";
import type { TimelineProject } from "@/lib/content";

/** Raised when a repo is ingested twice (violates a UNIQUE constraint). */
export class DuplicateProjectError extends Error {
  constructor(message = "That repository has already been added.") {
    super(message);
    this.name = "DuplicateProjectError";
  }
}

/** Raised when a publish/unpublish targets a project id that doesn't exist. */
export class ProjectNotFoundError extends Error {
  constructor(id: string) {
    super(`Project "${id}" was not found.`);
    this.name = "ProjectNotFoundError";
  }
}

/**
 * Postgres unique-violation SQLSTATE (`23505`). Drizzle wraps driver errors in
 * a `DrizzleQueryError`, so the pg error (with `.code`) is usually on `.cause`
 * — walk the cause chain rather than only inspecting the top-level error.
 */
function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current != null && depth < 5; depth += 1) {
    if (
      typeof current === "object" &&
      "code" in current &&
      (current as { code?: string }).code === "23505"
    ) {
      return true;
    }
    current =
      typeof current === "object" && "cause" in current
        ? (current as { cause?: unknown }).cause
        : undefined;
  }
  return false;
}

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
 * `getPublishedProjects` rows mapped through `projectRowToTimelineNode`, which
 * re-validates each row (full `projectSchema` for MDX rows with a `preview`,
 * preview-less `projectMetadataSchema` for GitHub-ingested rows) — a corrupt
 * row throws here instead of reaching the public timeline. This is the single
 * call the public page (`src/app/page.tsx`) uses.
 */
export async function getPublishedProjectEntries(): Promise<TimelineProject[]> {
  const rows = await getPublishedProjects();
  return rows.map(projectRowToTimelineNode);
}

/**
 * Admin list: every project (draft + published), oldest `startDate` first.
 * Read path, so it uses the `neon-http` client (`db`), not the Pool writer.
 */
export async function getAllProjects(): Promise<ProjectRow[]> {
  return db.select().from(projects).orderBy(asc(projects.startDate));
}

/**
 * Slice 4 ATOMIC WRITE (Pool/transaction): insert the project row AND its
 * `audit_log` entry in ONE transaction via the `neon-serverless` Pool writer
 * (`txDb`). Either both land or neither does — a GitHub/validation failure
 * upstream never reaches here, and a DB failure rolls back with no partial
 * write. A UNIQUE violation (same repo already ingested, or a slug/id clash)
 * is surfaced as `DuplicateProjectError` for a clear caller-facing message.
 */
export async function createProjectWithAudit(
  row: NewProjectRow,
  actorEmail: string,
): Promise<ProjectRow> {
  try {
    return await txDb.transaction(async (tx) => {
      const [inserted] = await tx.insert(projects).values(row).returning();
      await tx.insert(auditLog).values({
        actor: actorEmail,
        action: "project.create",
        targetType: "project",
        targetId: inserted.id,
        meta: {
          githubOwner: row.githubOwner ?? null,
          githubRepo: row.githubRepo ?? null,
          previewType: row.previewType ?? null,
          status: inserted.status,
        },
      });
      return inserted;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new DuplicateProjectError();
    }
    throw error;
  }
}

/**
 * Slice 4 ATOMIC WRITE (Pool/transaction): flip a project's `status` AND write
 * an `audit_log` entry in one transaction. Throws `ProjectNotFoundError` (which
 * rolls the transaction back) when the id doesn't exist, so no orphan audit row
 * is written.
 */
export async function setProjectStatusWithAudit(
  id: string,
  status: ProjectRow["status"],
  actorEmail: string,
): Promise<ProjectRow> {
  return txDb.transaction(async (tx) => {
    const [updated] = await tx
      .update(projects)
      .set({ status, updatedAt: sql`now()` })
      .where(eq(projects.id, id))
      .returning();

    if (!updated) {
      throw new ProjectNotFoundError(id);
    }

    await tx.insert(auditLog).values({
      actor: actorEmail,
      action: status === "published" ? "project.publish" : "project.unpublish",
      targetType: "project",
      targetId: id,
      meta: { status },
    });

    return updated;
  });
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
