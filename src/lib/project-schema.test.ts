import { describe, it, expect } from "vitest";
import { projectSchema } from "@/lib/project-schema";

const validWebapp = {
  id: "demo",
  title: "Demo",
  slug: "demo",
  startDate: "2024-01-01",
  stack: ["Next.js"],
  languages: ["TypeScript"],
  summary: "A demo project.",
  githubUrl: "https://github.com/example/demo",
  preview: {
    previewType: "webapp",
    demoUrl: "https://example.com",
  },
};

describe("projectSchema - happy path", () => {
  it("accepts a minimal valid webapp project", () => {
    expect(projectSchema.safeParse(validWebapp).success).toBe(true);
  });
});

describe("projectSchema - negative cases (must fail loudly)", () => {
  it("rejects a webapp preview missing the required demoUrl", () => {
    const result = projectSchema.safeParse({
      ...validWebapp,
      preview: { previewType: "webapp" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a cli preview that leaks a webapp-only field (demoUrl)", () => {
    const result = projectSchema.safeParse({
      ...validWebapp,
      preview: {
        previewType: "cli",
        videoUrl: "https://example.com/cast.webm",
        demoUrl: "https://example.com", // belongs to `webapp`, not `cli`
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a cli preview with neither castUrl nor videoUrl", () => {
    const result = projectSchema.safeParse({
      ...validWebapp,
      preview: { previewType: "cli" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown previewType discriminator", () => {
    const result = projectSchema.safeParse({
      ...validWebapp,
      preview: { previewType: "sandbox", demoUrl: "https://example.com" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-URL demoUrl", () => {
    const result = projectSchema.safeParse({
      ...validWebapp,
      preview: { previewType: "webapp", demoUrl: "not-a-url" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an endDate before startDate", () => {
    const result = projectSchema.safeParse({
      ...validWebapp,
      startDate: "2024-06-01",
      endDate: "2024-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unrecognized top-level field", () => {
    const result = projectSchema.safeParse({
      ...validWebapp,
      demoUrl: "https://example.com", // top-level leak of a preview-only field
    });
    expect(result.success).toBe(false);
  });
});
