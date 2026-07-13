import { describe, it, expect } from "vitest";
import { projectEntryToInsertRow, projectRowToEntry } from "@/db/mappers";
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
