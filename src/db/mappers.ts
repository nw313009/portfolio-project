import { httpsUrlSchema, projectMetadataSchema, projectSchema } from "@/lib/project-schema";
import type { ProjectEntry, TimelineProject } from "@/lib/content";
import type { NewProjectRow, ProjectRow } from "@/db/schema";

export type ProjectStatus = ProjectRow["status"];

/**
 * DB row -> validated `ProjectEntry`. Re-parses through `projectSchema`
 * (the same schema Velite enforced at build time in Phase 1) so a corrupt or
 * hand-edited row fails loudly here instead of reaching the public timeline.
 * Requires a non-null `preview` — only rows that carry a full discriminated
 * union payload (the seeded MDX projects) round-trip through here.
 */
export function projectRowToEntry(row: ProjectRow): ProjectEntry {
  const project = projectSchema.parse({
    id: row.id,
    title: row.title,
    slug: row.slug,
    startDate: row.startDate,
    endDate: row.endDate,
    stack: row.stack,
    languages: row.languages,
    summary: row.summary,
    githubUrl: row.githubUrl,
    preview: row.preview,
  });
  return { ...project, body: row.body };
}

/**
 * DB row -> validated timeline node, and the SINGLE normalizer for the two
 * storage shapes (the preview-rendering slice's Option B). Both shapes go in,
 * one canonical representation comes out, and a corrupt row throws here instead
 * of reaching the timeline:
 *
 *  1. A row WITH a `preview` jsonb (hand-authored MDX content) → validated
 *     through the full `projectSchema`, union kept as-is.
 *  2. A flat GitHub-ingested row with `preview_type === "webapp"` AND a
 *     `demo_url` → a `webapp` union variant is SYNTHESIZED from those columns
 *     and re-validated through `projectSchema`. `webapp` is the only variant
 *     whose required field (a demo URL) exists in the flat columns — `cli`
 *     needs a cast/video, `service` a sample, `library` a snippet, `notebook`
 *     two URLs, `media` an image set — so it's the only one we can manufacture.
 *  3. Anything else → `projectMetadataSchema` (preview-less), `preview:
 *     undefined`. `undefined` MEANS "no preview surface"; we deliberately do
 *     NOT add a 7th "metadata" union variant to encode the absence of data.
 *
 * `demoUrl` (the flat `demo_url` column) is re-validated as https on every read
 * — never trust the stored string alone — so a plain-http/malformed row throws
 * here instead of rendering an unsafe link. It rides alongside the union as
 * project metadata (like `githubUrl`), NOT as part of the preview surface; the
 * renderer derives the single demo link from whichever shape holds the URL.
 */
export function projectRowToTimelineNode(row: ProjectRow): TimelineProject {
  const base = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    startDate: row.startDate,
    endDate: row.endDate,
    stack: row.stack,
    languages: row.languages,
    summary: row.summary,
    githubUrl: row.githubUrl,
  };
  const demoUrl = row.demoUrl != null ? httpsUrlSchema.parse(row.demoUrl) : undefined;

  // Shape 1 — rich MDX preview jsonb.
  if (row.preview != null) {
    const project = projectSchema.parse({ ...base, preview: row.preview });
    return { ...project, body: row.body, demoUrl };
  }

  // Shape 2 — flat webapp: synthesize a `webapp` union from the flat columns.
  if (row.previewType === "webapp" && demoUrl != null) {
    const project = projectSchema.parse({
      ...base,
      preview: { previewType: "webapp", demoUrl },
    });
    return { ...project, body: row.body, demoUrl };
  }

  // Shape 3 — metadata-only node (no preview surface).
  const metadata = projectMetadataSchema.parse(base);
  return { ...metadata, body: row.body, preview: undefined, demoUrl };
}

/**
 * Validated `ProjectEntry` -> insertable row. `status` defaults to
 * `"published"` (used by the Slice 2 seed of existing MDX content); GitHub
 * ingestion (Slice 4) explicitly passes `"draft"`.
 */
export function projectEntryToInsertRow(
  entry: ProjectEntry,
  status: ProjectStatus = "published",
): NewProjectRow {
  // `projectSchema` is a strict object and doesn't know about `body` (a
  // DB/MDX-only field), so validate just the `Project` portion of the entry.
  const { body, ...projectFields } = entry;
  const project = projectSchema.parse(projectFields);
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    startDate: project.startDate,
    endDate: project.endDate ?? null,
    stack: project.stack,
    languages: project.languages,
    summary: project.summary,
    githubUrl: project.githubUrl,
    preview: project.preview,
    body,
    status,
  };
}
