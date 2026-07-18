import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

// src/lib -> ../.. -> repo root -> test/fixtures
const fixturesRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../test/fixtures",
);
const projectFixtureDir = path.join(fixturesRoot, "velite-invalid-content");
const skillFixtureDir = path.join(fixturesRoot, "velite-invalid-skill");

describe("velite build-time validation (integration, real pipeline)", () => {
  it("fails the actual Velite build when a project's preview violates the schema", () => {
    const result = spawnSync(process.execPath, ["run.mjs"], {
      cwd: projectFixtureDir,
      encoding: "utf-8",
    });

    // Either the caught rejection or Velite's own `process.exit(1)` under
    // `strict: true` should produce a non-zero exit - this is the assertion
    // that proves the safety net has no hole, not just that the schema
    // rejects a bad object in isolation.
    expect(result.status).not.toBe(0);
    expect(result.stdout ?? "").not.toContain("BUILD_SUCCEEDED");
  }, 30_000);

  it("fails the actual Velite build when a skill's frontmatter violates the schema", () => {
    const result = spawnSync(process.execPath, ["run.mjs"], {
      cwd: skillFixtureDir,
      encoding: "utf-8",
    });

    expect(result.status).not.toBe(0);
    expect(result.stdout ?? "").not.toContain("BUILD_SUCCEEDED");
  }, 30_000);
});
