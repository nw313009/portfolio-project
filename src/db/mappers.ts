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
 * DB row -> validated timeline node for the public page. A row WITH a `preview`
 * jsonb (seeded MDX content) is validated through the full `projectSchema` and
 * keeps its preview. A row WITHOUT one (GitHub-ingested, Slice 4) is validated
 * through the preview-less `projectMetadataSchema` and renders metadata-only.
 * Either way a corrupt row throws here instead of reaching the timeline.
 *
 * `demoUrl` (the flat `demo_url` column) is independent of `preview` and is
 * re-validated as https on every read — never trust the stored string alone —
 * so a row hand-edited to a plain-http (or otherwise malformed) URL throws
 * here instead of rendering an unsafe outbound link.
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

  if (row.preview != null) {
    const project = projectSchema.parse({ ...base, preview: row.preview });
    return { ...project, body: row.body, demoUrl };
  }

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
