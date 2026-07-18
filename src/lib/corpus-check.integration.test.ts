import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

// src/lib -> ../.. -> repo root -> scripts/corpus-check.mjs
const scriptPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../scripts/corpus-check.mjs",
);

const tempRoots: string[] = [];

function makeCorpus(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "corpus-check-"));
  tempRoots.push(root);
  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = path.join(root, relativePath);
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents, "utf-8");
  }
  return root;
}

function runGuard(root: string) {
  return spawnSync(process.execPath, [scriptPath], {
    env: { ...process.env, CORPUS_CHECK_ROOT: root },
    encoding: "utf-8",
  });
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe("corpus:check placeholder guard (embed boundary, real script)", () => {
  it("passes when no corpus file carries the placeholder marker", () => {
    const root = makeCorpus({
      "src/content/about/index.mdx": "---\nname: Real\n---\n\nReviewed bio.\n",
      "src/content/skills/react.mdx": "---\nslug: react\n---\n\nReviewed prose.\n",
    });

    const result = runGuard(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/no "@placeholder" markers/i);
  }, 30_000);

  it("hard-fails and names every file still carrying the marker (case-insensitive)", () => {
    const root = makeCorpus({
      "src/content/about/index.mdx": "---\nname: Real\n---\n\nReviewed bio.\n",
      "src/content/skills/react.mdx":
        "---\nslug: react\n---\n\nDraft.\n\n{/* @placeholder review before embed */}\n",
      "src/content/skills/typescript.mdx":
        "---\nslug: typescript\n---\n\nDraft.\n\n{/* @PlaceHolder case-insensitive */}\n",
    });

    const result = runGuard(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("2 corpus file(s)");
    expect(result.stderr).toContain("skills/react.mdx");
    expect(result.stderr).toContain("skills/typescript.mdx");
    expect(result.stderr).not.toContain("about/index.mdx");
  }, 30_000);

  it("ignores non-mdx files so unrelated notes never trip the guard", () => {
    const root = makeCorpus({
      "src/content/about/notes.txt": "{/* @placeholder */}\n",
    });

    const result = runGuard(root);

    expect(result.status).toBe(0);
  }, 30_000);
});
