import { describe, expect, it } from "vitest";
import { mapMetadataToProjectRow, slugify } from "./map-metadata";
import type { IngestionInput } from "./map-metadata";
import type { GithubRepoMetadata } from "./fetch-repo";

const metadata: GithubRepoMetadata = {
  fullName: "octocat/Hello-World",
  name: "Hello-World",
  description: "My first repository on GitHub!",
  primaryLanguage: "TypeScript",
  stars: 123,
  topics: ["demo", "example"],
  createdAt: "2011-01-26T19:01:12Z",
  pushedAt: "2023-06-01T12:00:00Z",
  homepage: "https://octocat.example.com",
  htmlUrl: "https://github.com/octocat/Hello-World",
  isPrivate: false,
};

const baseInput: IngestionInput = {
  owner: "octocat",
  repo: "Hello-World",
  previewType: "webapp",
  demoUrl: null,
  titleOverride: null,
  summaryOverride: null,
  startDateOverride: null,
};

describe("slugify", () => {
  it("kebab-cases owner-repo and strips junk", () => {
    expect(slugify("octocat-Hello-World")).toBe("octocat-hello-world");
    expect(slugify("My Repo.js")).toBe("my-repo-js");
  });
});

describe("mapMetadataToProjectRow", () => {
  it("maps metadata to a DRAFT row with no preview payload", () => {
    const row = mapMetadataToProjectRow(metadata, baseInput);
    expect(row.status).toBe("draft");
    expect(row.preview).toBeNull();
    expect(row.previewType).toBe("webapp");
  });

  it("persists GitHub identity + metadata columns", () => {
    const row = mapMetadataToProjectRow(metadata, baseInput);
    expect(row.githubOwner).toBe("octocat");
    expect(row.githubRepo).toBe("Hello-World");
    expect(row.githubUrl).toBe("https://github.com/octocat/Hello-World");
    expect(row.primaryLanguage).toBe("TypeScript");
    expect(row.languages).toEqual(["TypeScript"]);
    expect(row.stars).toBe(123);
    expect(row.topics).toEqual(["demo", "example"]);
    expect(row.homepageUrl).toBe("https://octocat.example.com");
    expect(row.githubCreatedAt).toBeInstanceOf(Date);
    expect(row.githubPushedAt).toBeInstanceOf(Date);
    expect(row.metadataFetchedAt).toBeInstanceOf(Date);
  });

  it("defaults the timeline date to GitHub created_at (date portion)", () => {
    const row = mapMetadataToProjectRow(metadata, baseInput);
    expect(row.startDate).toBe("2011-01-26");
  });

  it("honors a startDate override", () => {
    const row = mapMetadataToProjectRow(metadata, {
      ...baseInput,
      startDateOverride: "2024-03-15",
    });
    expect(row.startDate).toBe("2024-03-15");
  });

  it("uses repo name/description by default and overrides when provided", () => {
    const defaults = mapMetadataToProjectRow(metadata, baseInput);
    expect(defaults.title).toBe("Hello-World");
    expect(defaults.summary).toBe("My first repository on GitHub!");

    const overridden = mapMetadataToProjectRow(metadata, {
      ...baseInput,
      titleOverride: "Custom Title",
      summaryOverride: "Custom summary",
    });
    expect(overridden.title).toBe("Custom Title");
    expect(overridden.summary).toBe("Custom summary");
  });

  it("falls back to fullName when there is no description", () => {
    const row = mapMetadataToProjectRow(
      { ...metadata, description: null },
      baseInput,
    );
    expect(row.summary).toBe("octocat/Hello-World");
  });

  it("stores a provided demoUrl and empty language list when unknown", () => {
    const row = mapMetadataToProjectRow(
      { ...metadata, primaryLanguage: null },
      { ...baseInput, demoUrl: "https://demo.example.com" },
    );
    expect(row.demoUrl).toBe("https://demo.example.com");
    expect(row.languages).toEqual([]);
    expect(row.primaryLanguage).toBeNull();
  });

  it("derives a kebab-case slug and id from owner-repo", () => {
    const row = mapMetadataToProjectRow(metadata, baseInput);
    expect(row.slug).toBe("octocat-hello-world");
    expect(row.id).toBe("octocat-hello-world");
  });
});
