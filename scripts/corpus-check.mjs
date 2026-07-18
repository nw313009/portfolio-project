// Corpus placeholder guard (Phase 3 pre-flight, embed-boundary — NOT build-time).
//
// Why not a build guard: placeholder corpus copy is LEGITIMATE pre-launch (the
// site is under construction) and self-correcting (Writam sees rendered pages).
// The harm we guard against is specific — the AI guide reciting placeholder
// prose to a recruiter WITH citations — and that happens at embed/serve, not at
// build. So this check does NOT run in `next build`; it runs on demand
// (`pnpm corpus:check`) and, in Phase 3 Slice 1, the indexer calls the same
// logic and HARD-FAILS on any chunk whose source file still carries the marker.
//
// The marker: an MDX JSX comment `{/* @placeholder ... */}` — invisible in the
// rendered page, detectable in the raw source. When Writam writes and reviews
// an entry's real copy, he deletes the marker; only then may it be embedded.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const MARKER = "@placeholder";

// scripts/ -> repo root. Overridable via CORPUS_CHECK_ROOT so the guard can be
// exercised against a fixture corpus in tests without touching the real one.
const repoRoot =
  process.env.CORPUS_CHECK_ROOT ??
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Corpus authored as MDX that the Phase 3 agent will embed. */
const CORPUS_DIRS = ["src/content/about", "src/content/skills"];

function collectCorpusFiles() {
  const files = [];
  for (const dir of CORPUS_DIRS) {
    const absoluteDir = path.join(repoRoot, dir);
    if (!existsSync(absoluteDir)) continue;
    for (const entry of readdirSync(absoluteDir, { recursive: true })) {
      const relativeEntry = entry.toString();
      if (relativeEntry.endsWith(".mdx")) {
        files.push(path.join(dir, relativeEntry).split(path.sep).join("/"));
      }
    }
  }
  return files.sort();
}

function findMarkerLines(contents) {
  return contents
    .split(/\r?\n/)
    .map((line, index) => ({ line: index + 1, text: line }))
    .filter((entry) => entry.text.toLowerCase().includes(MARKER));
}

const files = collectCorpusFiles();
const offenders = [];

for (const relativePath of files) {
  const contents = readFileSync(path.join(repoRoot, relativePath), "utf-8");
  const hits = findMarkerLines(contents);
  if (hits.length > 0) offenders.push({ relativePath, hits });
}

if (offenders.length === 0) {
  console.log(
    `corpus:check — ${files.length} corpus file(s) scanned, no "${MARKER}" markers. Ready to embed.`,
  );
  process.exit(0);
}

console.error(
  `corpus:check FAILED — ${offenders.length} corpus file(s) still carry the "${MARKER}" marker.\n` +
    "These are unreviewed placeholder corpus and MUST NOT be embedded by the Phase 3 indexer.\n" +
    "Write the real copy, review it, then delete the marker comment:\n",
);
for (const { relativePath, hits } of offenders) {
  for (const hit of hits) {
    console.error(`  ${relativePath}:${hit.line}: ${hit.text.trim()}`);
  }
}
process.exit(1);
