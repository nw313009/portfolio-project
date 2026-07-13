import { eq } from "drizzle-orm";
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

export async function insertProject(row: NewProjectRow): Promise<ProjectRow> {
  const [inserted] = await db.insert(projects).values(row).returning();
  return inserted;
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
