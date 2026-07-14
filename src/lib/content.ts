import { projects as generatedProjects } from "../../.velite";
import type { Preview, Project } from "@/lib/project-schema";

/** A validated project plus its compiled MDX body string. */
export type ProjectEntry = Project & { body: string };

/**
 * A timeline node as the public page consumes it. Same as `ProjectEntry` but
 * `preview` is optional: GitHub-ingested projects (Slice 4) render as
 * metadata-only nodes with no preview surface yet, so their `preview` is
 * absent. The seeded MDX projects still carry their full discriminated-union
 * `preview`. Rendering the surface for either lives in the later preview slice.
 *
 * `demoUrl` is the flat, validated-https link a GitHub-ingested project
 * persists directly (independent of `preview` — MDX rows never set it, so
 * they're unaffected). It's a plain outbound link, not a preview surface.
 */
export type TimelineProject = Omit<ProjectEntry, "preview"> & {
  preview?: Preview;
  demoUrl?: string;
};

/**
 * All projects, oldest first - the timeline renders the oldest project at the
 * top. ISO date strings sort correctly lexicographically.
 */
export const projects: ProjectEntry[] = [...generatedProjects].sort((a, b) =>
  a.startDate.localeCompare(b.startDate),
);

export function getProjectBySlug(slug: string): ProjectEntry | undefined {
  return projects.find((project) => project.slug === slug);
}
