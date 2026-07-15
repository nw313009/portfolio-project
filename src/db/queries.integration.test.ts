import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  DuplicateProjectError,
  appendEvent,
  createProjectWithAudit,
  deleteAuditLogById,
  deleteEventsByProjectId,
  deleteProject,
  getEventAggregates,
  getProjectById,
  getPublishedProjectEntries,
  getPublishedProjects,
  insertAuditLog,
  insertProject,
  projectExists,
  recordEvent,
  setProjectStatusWithAudit,
  upsertProject,
} from "@/db/queries";
import { db } from "@/db/client";
import { auditLog } from "@/db/schema";
import { projectEntryToInsertRow } from "@/db/mappers";
import type { ProjectEntry } from "@/lib/content";
import type { NewProjectRow } from "@/db/schema";

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
      expect(entry?.preview?.previewType).toBe("webapp");
      expect(entries.some((candidate) => candidate.id === draftId)).toBe(false);
    });
  },
);

/**
 * Slice 4 ingestion end-to-end against the real Neon `test` branch: an ingested
 * DRAFT is hidden from the public timeline until published, both writes are
 * audit-logged in their transaction, and re-ingesting the same repo is rejected
 * by the UNIQUE(github_owner, github_repo) constraint.
 */
describe.skipIf(!hasDb)("createProjectWithAudit / setProjectStatusWithAudit", () => {
  const ingestedId = `test-ingested-${randomUUID()}`;
  const owner = `example-${randomUUID().slice(0, 8)}`;

  const row: NewProjectRow = {
    id: ingestedId,
    slug: ingestedId,
    title: "Ingested Draft",
    startDate: "2015-05-05",
    endDate: null,
    stack: [],
    languages: ["Go"],
    summary: "An ingested draft project.",
    githubUrl: `https://github.com/${owner}/ingested`,
    preview: null,
    status: "draft",
    githubOwner: owner,
    githubRepo: "ingested",
    primaryLanguage: "Go",
    stars: 1,
    topics: ["cli"],
    githubCreatedAt: new Date("2015-05-05T00:00:00Z"),
    githubPushedAt: null,
    homepageUrl: null,
    metadataFetchedAt: new Date(),
    demoUrl: "https://demo.example.com",
    previewType: "webapp",
  };

  afterAll(async () => {
    await db.delete(auditLog).where(eq(auditLog.targetId, ingestedId));
    await deleteProject(ingestedId);
  });

  it("creates a DRAFT that is hidden from the public timeline, then appears once published (as a metadata-only node)", async () => {
    await createProjectWithAudit(row, "admin@example.com");

    const beforePublish = await getPublishedProjectEntries();
    expect(beforePublish.some((entry) => entry.id === ingestedId)).toBe(false);

    await setProjectStatusWithAudit(ingestedId, "published", "admin@example.com");

    const afterPublish = await getPublishedProjectEntries();
    const node = afterPublish.find((entry) => entry.id === ingestedId);
    expect(node).toBeDefined();
    expect(node?.title).toBe("Ingested Draft");
    // Metadata-only: no preview surface persisted for ingested rows this slice.
    expect(node?.preview).toBeUndefined();
  });

  it("wrote audit_log rows for the create and the publish (same actor)", async () => {
    const audits = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.targetId, ingestedId));
    const actions = audits.map((a) => a.action);
    expect(actions).toContain("project.create");
    expect(actions).toContain("project.publish");
    expect(audits.every((a) => a.actor === "admin@example.com")).toBe(true);
  });

  it("rejects re-ingesting the same repo (unique owner/repo) with DuplicateProjectError", async () => {
    const duplicate: NewProjectRow = {
      ...row,
      id: `${ingestedId}-dup`,
      slug: `${ingestedId}-dup`,
    };
    await expect(
      createProjectWithAudit(duplicate, "admin@example.com"),
    ).rejects.toBeInstanceOf(DuplicateProjectError);
  });
});

/**
 * Slice 5 events + aggregates against the real Neon `test` branch: writes go
 * through the Pool writer (`recordEvent`), reads through the aggregate helper
 * (`getEventAggregates`), and `projectExists` gates the public write path.
 * The per-project counts are asserted exactly for this fixture's own id;
 * table-wide sums (`totalEvents`, `sessions`, `recentCount`) are asserted as
 * lower bounds so the test doesn't assume the branch starts empty.
 */
describe.skipIf(!hasDb)("recordEvent / getEventAggregates / projectExists", () => {
  const eventProjectId = `test-events-${randomUUID()}`;
  const sessionA = randomUUID();
  const sessionB = randomUUID();

  const projectRow: NewProjectRow = {
    id: eventProjectId,
    slug: eventProjectId,
    title: "Events Fixture",
    startDate: "2018-03-03",
    endDate: null,
    stack: [],
    languages: ["TypeScript"],
    summary: "A fixture project for event aggregation.",
    githubUrl: "https://github.com/example/events-fixture",
    preview: { previewType: "webapp", demoUrl: "https://example.com" },
    status: "published",
  };

  afterAll(async () => {
    await deleteEventsByProjectId(eventProjectId);
    await deleteProject(eventProjectId);
  });

  it("projectExists reflects insertion", async () => {
    expect(await projectExists(eventProjectId)).toBe(false);
    await insertProject(projectRow);
    expect(await projectExists(eventProjectId)).toBe(true);
  });

  it("records events via the Pool writer with a server-derived timestamp", async () => {
    // 3 views + 2 preview-opens (hover) + 1 demo-open, across two sessions.
    await recordEvent({ projectId: eventProjectId, type: "view", sessionId: sessionA });
    await recordEvent({ projectId: eventProjectId, type: "view", sessionId: sessionA });
    await recordEvent({ projectId: eventProjectId, type: "view", sessionId: sessionB });
    await recordEvent({ projectId: eventProjectId, type: "hover", sessionId: sessionA });
    await recordEvent({ projectId: eventProjectId, type: "hover", sessionId: sessionB });
    await recordEvent({ projectId: eventProjectId, type: "demo-open", sessionId: sessionB });

    const aggregates = await getEventAggregates();
    const mine = aggregates.perProject.find((p) => p.projectId === eventProjectId);
    expect(mine).toEqual({
      projectId: eventProjectId,
      view: 3,
      hover: 2,
      demoOpen: 1,
      total: 6,
    });

    // Table-wide sums include at least this fixture's contribution.
    expect(aggregates.totalEvents).toBeGreaterThanOrEqual(6);
    expect(aggregates.recentCount).toBeGreaterThanOrEqual(6);
    expect(aggregates.sessions).toBeGreaterThanOrEqual(2);
    expect(aggregates.totalsByType.view).toBeGreaterThanOrEqual(3);
  });
});
