import { describe, it, expect } from "vitest";
import {
  projectEntryToInsertRow,
  projectRowToEntry,
  projectRowToTimelineNode,
} from "@/db/mappers";
import type { ProjectEntry } from "@/lib/content";
import type { ProjectRow } from "@/db/schema";

const webappEntry: ProjectEntry = {
  id: "demo",
  title: "Demo",
  slug: "demo",
  startDate: "2024-01-01",
  endDate: null,
  stack: ["Next.js"],
  languages: ["TypeScript"],
  summary: "A demo project.",
  githubUrl: "https://github.com/example/demo",
  preview: { previewType: "webapp", demoUrl: "https://example.com" },
  body: "<p>Demo body</p>",
};

const cliEntry: ProjectEntry = {
  id: "cli-tool",
  title: "CLI Tool",
  slug: "cli-tool",
  startDate: "2023-01-01",
  endDate: "2023-06-01",
  stack: ["Node.js"],
  languages: ["TypeScript"],
  summary: "A CLI tool.",
  githubUrl: "https://github.com/example/cli-tool",
  preview: { previewType: "cli", videoUrl: "https://example.com/cast.webm" },
  body: "<p>CLI body</p>",
};

function toRow(entry: ProjectEntry, status: ProjectRow["status"]): ProjectRow {
  const insert = projectEntryToInsertRow(entry, status);
  const now = new Date();
  return {
    ...insert,
    endDate: insert.endDate ?? null,
    mediaUrl: null,
    createdAt: now,
    updatedAt: now,
  } as ProjectRow;
}

describe("projectEntryToInsertRow", () => {
  it("maps a validated ProjectEntry to an insertable row, defaulting status to published", () => {
    const row = projectEntryToInsertRow(webappEntry);
    expect(row.status).toBe("published");
    expect(row.preview).toEqual(webappEntry.preview);
    expect(row.stack).toEqual(["Next.js"]);
    expect(row.endDate).toBeNull();
  });

  it("accepts an explicit draft status (used by GitHub ingestion)", () => {
    const row = projectEntryToInsertRow(webappEntry, "draft");
    expect(row.status).toBe("draft");
  });

  it("rejects an entry that fails project-schema validation", () => {
    const invalid = { ...webappEntry, githubUrl: "not-a-url" } as ProjectEntry;
    expect(() => projectEntryToInsertRow(invalid)).toThrow();
  });
});

describe("projectRowToEntry", () => {
  it("round-trips a webapp project through insert-row -> row -> entry", () => {
    const row = toRow(webappEntry, "published");
    const entry = projectRowToEntry(row);
    expect(entry).toEqual(webappEntry);
  });

  it("round-trips a cli project (endDate, non-webapp preview) losslessly", () => {
    const row = toRow(cliEntry, "published");
    const entry = projectRowToEntry(row);
    expect(entry).toEqual(cliEntry);
  });

  it("throws on a corrupt row instead of serving invalid data (e.g. bad preview jsonb)", () => {
    const row = toRow(webappEntry, "published");
    const corrupt: ProjectRow = {
      ...row,
      preview: { previewType: "webapp" } as ProjectRow["preview"],
    };
    expect(() => projectRowToEntry(corrupt)).toThrow();
  });
});

/**
 * A GitHub-ingested row: no `preview` jsonb. Defaults to a shape that stays
 * metadata-only (no `previewType`, no `demoUrl`); each test overrides the flat
 * fields to exercise the mapper's synthesis branch explicitly.
 */
function ingestedRow(overrides: Partial<ProjectRow> = {}): ProjectRow {
  const now = new Date();
  return {
    id: "octocat-hello-world",
    slug: "octocat-hello-world",
    title: "Hello-World",
    startDate: "2011-01-26",
    endDate: null,
    stack: [],
    languages: ["TypeScript"],
    summary: "My first repository on GitHub!",
    githubUrl: "https://github.com/octocat/Hello-World",
    preview: null,
    body: "",
    status: "published",
    mediaUrl: null,
    githubOwner: "octocat",
    githubRepo: "Hello-World",
    primaryLanguage: "TypeScript",
    stars: 7,
    topics: ["demo"],
    githubCreatedAt: now,
    githubPushedAt: now,
    homepageUrl: null,
    metadataFetchedAt: now,
    demoUrl: null,
    previewType: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("projectRowToTimelineNode", () => {
  it("maps a flat ingested row with no preview shape to a metadata-only node", () => {
    const node = projectRowToTimelineNode(ingestedRow());
    expect(node.preview).toBeUndefined();
    expect(node.title).toBe("Hello-World");
    expect(node.summary).toBe("My first repository on GitHub!");
    expect(node.stack).toEqual([]);
    expect(node.githubUrl).toBe("https://github.com/octocat/Hello-World");
  });

  it("keeps the full preview for a seeded MDX row that has one", () => {
    const row = toRow(webappEntry, "published");
    const node = projectRowToTimelineNode(row);
    expect(node.preview).toEqual(webappEntry.preview);
  });

  it("SYNTHESIZES a webapp union from flat preview_type + demo_url", () => {
    const node = projectRowToTimelineNode(
      ingestedRow({ previewType: "webapp", demoUrl: "https://demo.example.com" }),
    );
    expect(node.preview).toEqual({
      previewType: "webapp",
      demoUrl: "https://demo.example.com",
    });
  });

  it("stays metadata-only for a non-webapp previewType, even with a flat demoUrl (only webapp is synthesizable)", () => {
    const node = projectRowToTimelineNode(
      ingestedRow({ previewType: "library", demoUrl: "https://demo.example.com" }),
    );
    expect(node.preview).toBeUndefined();
    // ...but the demo link is preserved as flat metadata.
    expect(node.demoUrl).toBe("https://demo.example.com");
  });

  it("stays metadata-only for previewType 'webapp' WITHOUT a demoUrl (nothing to synthesize)", () => {
    const node = projectRowToTimelineNode(
      ingestedRow({ previewType: "webapp", demoUrl: null }),
    );
    expect(node.preview).toBeUndefined();
    expect(node.demoUrl).toBeUndefined();
  });

  it("throws on a corrupt row (e.g. bad startDate) rather than serving it", () => {
    expect(() =>
      projectRowToTimelineNode(ingestedRow({ startDate: "not-a-date" })),
    ).toThrow();
  });

  it("carries a validated https demoUrl through for a metadata-only node", () => {
    const node = projectRowToTimelineNode(
      ingestedRow({ previewType: "library", demoUrl: "https://demo.example.com" }),
    );
    expect(node.demoUrl).toBe("https://demo.example.com");
  });

  it("carries the flat demoUrl alongside a synthesized webapp preview (same URL, both populated in-memory)", () => {
    const node = projectRowToTimelineNode(
      ingestedRow({ previewType: "webapp", demoUrl: "https://demo.example.com" }),
    );
    expect(node.demoUrl).toBe("https://demo.example.com");
    expect(node.preview).toEqual({
      previewType: "webapp",
      demoUrl: "https://demo.example.com",
    });
  });

  it("leaves demoUrl undefined when the column is absent", () => {
    const node = projectRowToTimelineNode(ingestedRow({ demoUrl: null }));
    expect(node.demoUrl).toBeUndefined();
  });

  it("throws instead of serving a non-https demoUrl (never loosen validation)", () => {
    expect(() =>
      projectRowToTimelineNode(
        ingestedRow({ previewType: "webapp", demoUrl: "http://insecure.example.com" }),
      ),
    ).toThrow();
  });

  it("throws instead of serving a malformed demoUrl", () => {
    expect(() =>
      projectRowToTimelineNode(
        ingestedRow({ previewType: "webapp", demoUrl: "not-a-url" }),
      ),
    ).toThrow();
  });
});
