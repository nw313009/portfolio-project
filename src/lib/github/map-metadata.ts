import type { PreviewType } from "@/lib/project-schema";
import type { NewProjectRow } from "@/db/schema";
import type { GithubRepoMetadata } from "./fetch-repo";

/**
 * Admin-supplied portion of an ingestion request (already Zod-validated by the
 * server action). All overrides are optional; when absent we fall back to the
 * fetched GitHub metadata.
 */
export interface IngestionInput {
  owner: string;
  repo: string;
  previewType: PreviewType;
  /** Validated https URL, stored (never fetched), or null. */
  demoUrl: string | null;
  titleOverride: string | null;
  summaryOverride: string | null;
  /** ISO date (YYYY-MM-DD) override for the timeline-ordering date, or null. */
  startDateOverride: string | null;
}

/** kebab-case a string to satisfy the project `slug` regex. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Fetched GitHub metadata + admin overrides -> an insertable DRAFT project row.
 *
 * - `status` is always `draft` — publishing is a separate admin action.
 * - `preview` is `null`: ingested rows persist `previewType`/`demoUrl` columns,
 *   not a discriminated-union preview payload (rendered in the later slice).
 * - The timeline-ordering date (`startDate`) defaults to GitHub `created_at`
 *   (date portion) and is admin-editable via `startDateOverride`.
 * - `githubUrl` is the canonical repo URL, rebuilt from owner/repo (not the
 *   pasted string).
 */
export function mapMetadataToProjectRow(
  metadata: GithubRepoMetadata,
  input: IngestionInput,
): NewProjectRow {
  const { owner, repo } = input;
  const slug = slugify(`${owner}-${repo}`);
  const startDate = input.startDateOverride ?? metadata.createdAt.slice(0, 10);

  return {
    id: slug,
    slug,
    title: input.titleOverride ?? metadata.name,
    startDate,
    endDate: null,
    stack: [],
    languages: metadata.primaryLanguage ? [metadata.primaryLanguage] : [],
    summary: input.summaryOverride ?? metadata.description ?? metadata.fullName,
    githubUrl: `https://github.com/${owner}/${repo}`,
    preview: null,
    status: "draft",
    githubOwner: owner,
    githubRepo: repo,
    primaryLanguage: metadata.primaryLanguage,
    stars: metadata.stars,
    topics: metadata.topics,
    githubCreatedAt: new Date(metadata.createdAt),
    githubPushedAt: metadata.pushedAt ? new Date(metadata.pushedAt) : null,
    homepageUrl: metadata.homepage,
    metadataFetchedAt: new Date(),
    demoUrl: input.demoUrl,
    previewType: input.previewType,
  };
}
