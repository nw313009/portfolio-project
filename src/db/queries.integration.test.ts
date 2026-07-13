import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  appendEvent,
  deleteAuditLogById,
  deleteEventsByProjectId,
  deleteProject,
  getProjectById,
  insertAuditLog,
  insertProject,
} from "@/db/queries";
import { projectEntryToInsertRow } from "@/db/mappers";
import type { ProjectEntry } from "@/lib/content";

/**
 * Runs only against a real Neon connection. Prefers `TEST_DATABASE_URL` (the
 * disposable/reset Neon `test` branch — see docs/PROGRESS.md), copying it
 * onto `DATABASE_URL` so the shared `db` client (`@/db/client`, otherwise
 * driven by `DATABASE_URL`) targets the test branch for this file only,
 * never the `dev`/prod branch.
 *
 * Falls back to `DATABASE_URL` itself only if `TEST_DATABASE_URL` isn't set
 * locally. Skipped entirely when neither is set, so `pnpm test` stays green
 * without live credentials.
 */
const hasDb = Boolean(process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL);
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

describe.skipIf(!hasDb)("Drizzle schema/queries against a real Neon branch", () => {
  const projectId = `test-project-${randomUUID()}`;
  const auditLogIds: string[] = [];

  const entry: ProjectEntry = {
    id: projectId,
    title: "Integration Test Project",
    slug: `test-project-${randomUUID()}`,
    startDate: "2024-01-01",
    endDate: null,
    stack: ["Next.js"],
    languages: ["TypeScript"],
    summary: "A project inserted by an integration test.",
    githubUrl: "https://github.com/example/integration-test",
    preview: { previewType: "webapp", demoUrl: "https://example.com" },
    body: "<p>Integration test body</p>",
  };

  afterAll(async () => {
    await deleteEventsByProjectId(projectId);
    await Promise.all(auditLogIds.map((id) => deleteAuditLogById(id)));
    await deleteProject(projectId);
  });

  it("inserts and selects a project", async () => {
    const inserted = await insertProject(projectEntryToInsertRow(entry, "draft"));
    expect(inserted.id).toBe(projectId);
    expect(inserted.status).toBe("draft");
    expect(inserted.preview).toEqual(entry.preview);

    const fetched = await getProjectById(projectId);
    expect(fetched?.title).toBe(entry.title);
  });

  it("appends an append-only event with no foreign key to projects", async () => {
    const event = await appendEvent({
      projectId,
      type: "view",
      sessionId: "session-abc",
      meta: { source: "integration-test" },
    });
    expect(event.projectId).toBe(projectId);
    expect(event.type).toBe("view");
    expect(event.ts).toBeInstanceOf(Date);
  });

  it("appends an event for a projectId that was never inserted (proves no FK constraint blocks archival/deletion)", async () => {
    const orphanProjectId = `deleted-project-${randomUUID()}`;
    const event = await appendEvent({
      projectId: orphanProjectId,
      type: "hover",
      sessionId: "session-xyz",
    });
    expect(event.projectId).toBe(orphanProjectId);
    await deleteEventsByProjectId(orphanProjectId);
  });

  it("inserts an audit_log row for a write", async () => {
    const row = await insertAuditLog({
      actor: "admin@example.com",
      action: "project.create",
      targetType: "project",
      targetId: projectId,
      meta: { status: "draft" },
    });
    auditLogIds.push(row.id);
    expect(row.actor).toBe("admin@example.com");
    expect(row.ts).toBeInstanceOf(Date);
  });
});
