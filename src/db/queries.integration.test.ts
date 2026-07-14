import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  appendEvent,
  deleteAuditLogById,
  deleteEventsByProjectId,
  deleteProject,
  getProjectById,
  getPublishedProjectEntries,
  getPublishedProjects,
  insertAuditLog,
  insertProject,
  upsertProject,
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

/**
 * Slice 2 read path: `upsertProject` (idempotent seed) and the public-facing
 * `getPublishedProjects`/`getPublishedProjectEntries` helpers the timeline
 * page reads from. Uses its own fixtures (unlikely-to-collide ids/slugs) so
 * it doesn't assume the disposable test branch starts empty.
 */
describe.skipIf(!hasDb)(
  "upsertProject / getPublishedProjects / getPublishedProjectEntries",
  () => {
    const olderId = `test-published-older-${randomUUID()}`;
    const newerId = `test-published-newer-${randomUUID()}`;
    const draftId = `test-draft-${randomUUID()}`;

    function fixtureEntry(id: string, startDate: string): ProjectEntry {
      return {
        id,
        title: `Slice 2 fixture ${id}`,
        slug: id,
        startDate,
        endDate: null,
        stack: ["Next.js"],
        languages: ["TypeScript"],
        summary: "A Slice 2 read-path fixture.",
        githubUrl: "https://github.com/example/slice-2-fixture",
        preview: { previewType: "webapp", demoUrl: "https://example.com" },
        body: "<p>Fixture body</p>",
      };
    }

    afterAll(async () => {
      await Promise.all(
        [olderId, newerId, draftId].map((id) => deleteProject(id)),
      );
    });

    it("upsertProject inserts, then updates the same row on a second call instead of duplicating it", async () => {
      const inserted = await upsertProject(
        projectEntryToInsertRow(fixtureEntry(olderId, "2020-01-01"), "published"),
      );
      expect(inserted.id).toBe(olderId);
      expect(inserted.status).toBe("published");

      const revised = {
        ...fixtureEntry(olderId, "2020-01-01"),
        title: "Updated title",
      };
      const updated = await upsertProject(
        projectEntryToInsertRow(revised, "published"),
      );
      expect(updated.id).toBe(olderId);
      expect(updated.title).toBe("Updated title");
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        inserted.updatedAt.getTime(),
      );

      const fetched = await getProjectById(olderId);
      expect(fetched?.title).toBe("Updated title");
    });

    it("getPublishedProjects excludes draft rows and orders published rows oldest startDate first", async () => {
      await upsertProject(
        projectEntryToInsertRow(fixtureEntry(newerId, "2025-01-01"), "published"),
      );
      await upsertProject(
        projectEntryToInsertRow(fixtureEntry(draftId, "2019-01-01"), "draft"),
      );

      const published = await getPublishedProjects();
      const ids = published.map((row) => row.id);

      expect(ids).toContain(olderId);
      expect(ids).toContain(newerId);
      expect(ids).not.toContain(draftId);
      expect(ids.indexOf(olderId)).toBeLessThan(ids.indexOf(newerId));
    });

    it("getPublishedProjectEntries maps published rows through projectRowToEntry", async () => {
      const entries = await getPublishedProjectEntries();
      const entry = entries.find((candidate) => candidate.id === olderId);
      expect(entry?.title).toBe("Updated title");
      expect(entry?.preview.previewType).toBe("webapp");
      expect(entries.some((candidate) => candidate.id === draftId)).toBe(false);
    });
  },
);
