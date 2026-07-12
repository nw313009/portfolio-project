import { projects as generatedProjects } from "../../.velite";
import type { Project } from "@/lib/project-schema";

/** A validated project plus its compiled MDX body string. */
export type ProjectEntry = Project & { body: string };

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
