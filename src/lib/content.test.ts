import { describe, it, expect } from "vitest";
import { projects } from "@/lib/content";
import { projectSchema, PREVIEW_TYPES } from "@/lib/project-schema";

describe("project content", () => {
  it("loads all four sample projects", () => {
    expect(projects).toHaveLength(4);
  });

  it("validates every project against the canonical Zod schema", () => {
    for (const { body, ...data } of projects) {
      const result = projectSchema.safeParse(data);
      if (!result.success) {
        throw new Error(
          `${data.slug} failed validation: ${JSON.stringify(result.error.issues, null, 2)}`,
        );
      }
      expect(result.success).toBe(true);
      expect(typeof body).toBe("string");
    }
  });

  it("is ordered oldest-first by startDate", () => {
    const dates = projects.map((project) => project.startDate);
    const ascending = [...dates].sort((a, b) => a.localeCompare(b));
    expect(dates).toEqual(ascending);
  });

  it("spans at least three distinct preview types", () => {
    const types = new Set(projects.map((project) => project.preview.previewType));
    expect(types.size).toBeGreaterThanOrEqual(3);
    for (const type of types) {
      expect(PREVIEW_TYPES).toContain(type);
    }
  });

  it("includes a webapp project with a demo URL", () => {
    const webapp = projects.find(
      (project) => project.preview.previewType === "webapp",
    );
    expect(webapp).toBeDefined();
    if (webapp?.preview.previewType === "webapp") {
      expect(webapp.preview.demoUrl).toMatch(/^https?:\/\//);
    }
  });
});
