import { z } from "zod";

/**
 * The kinds of preview a project can declare. The timeline renders a different
 * primitive per type (Slice 5); only `webapp` ever becomes a live iframe.
 */
export const PREVIEW_TYPES = [
  "webapp",
  "cli",
  "service",
  "library",
  "notebook",
  "media",
] as const;

export type PreviewType = (typeof PREVIEW_TYPES)[number];

/**
 * Local asset paths (e.g. "/previews/foo.png") and remote URLs are both allowed
 * for media fields, so they are plain non-empty strings. Fields that must point
 * at an external site (demo, repo, notebook, OpenAPI) use `z.url()`.
 */
const assetPath = z.string().min(1);

/**
 * A URL that must use https. Used for the top-level `demoUrl` a GitHub-ingested
 * project persists (`src/db/schema.ts`'s `demo_url` column) — it's pasted and
 * stored, never fetched, and the public read path re-validates it on the way
 * out so a corrupt/loosened row can't surface a plaintext link.
 */
export const httpsUrlSchema = z.url().refine((value) => value.startsWith("https://"), {
  message: "URL must use https.",
});

/**
 * Every variant below uses `z.strictObject` (not the default `z.object`, which
 * silently *strips* unknown keys) so cross-variant leakage is a hard parse
 * error, not a silent drop. A `cli` entry that also sets `demoUrl` - the
 * `webapp` field - fails validation instead of quietly losing the extra key.
 */
const webappPreview = z.strictObject({
  previewType: z.literal("webapp"),
  demoUrl: z.url(),
  poster: assetPath.optional(),
});

const cliPreview = z.strictObject({
  previewType: z.literal("cli"),
  castUrl: z.url().optional(),
  videoUrl: z.url().optional(),
  poster: assetPath.optional(),
});

const servicePreview = z.strictObject({
  previewType: z.literal("service"),
  openApiUrl: z.url().optional(),
  sample: z.string().min(1),
});

const libraryPreview = z.strictObject({
  previewType: z.literal("library"),
  codeSnippet: z.string().min(1),
  language: z.string().min(1).optional(),
});

const notebookPreview = z.strictObject({
  previewType: z.literal("notebook"),
  outputImageUrl: assetPath,
  notebookUrl: z.url(),
});

const mediaPreview = z.strictObject({
  previewType: z.literal("media"),
  images: z.array(assetPath).min(1),
});

export const previewSchema = z.discriminatedUnion("previewType", [
  webappPreview,
  cliPreview,
  servicePreview,
  libraryPreview,
  notebookPreview,
  mediaPreview,
]);

export type Preview = z.infer<typeof previewSchema>;

export const projectBase = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case"),
  /** ISO date (YYYY-MM-DD). */
  startDate: z.iso.date(),
  /** ISO date, or null/omitted for an ongoing project. */
  endDate: z.iso.date().nullable().optional(),
  stack: z.array(z.string().min(1)),
  languages: z.array(z.string().min(1)),
  summary: z.string().min(1),
  githubUrl: z.url(),
  preview: previewSchema,
});

/**
 * A project WITHOUT a `preview` payload — the shape of a GitHub-ingested
 * timeline node (Slice 4). Ingested rows persist `previewType`/`demoUrl` as
 * columns but no discriminated-union `preview` jsonb, so the public read path
 * validates them through this preview-less schema and renders a metadata-only
 * card (the preview surface itself arrives in the later preview slice). The
 * `endDate >= startDate` invariant is kept.
 */
export const projectMetadataSchema = projectBase
  .omit({ preview: true })
  .refine(
    (project) =>
      project.endDate == null || project.endDate >= project.startDate,
    { message: "endDate must be on or after startDate", path: ["endDate"] },
  );

export type ProjectMetadata = z.infer<typeof projectMetadataSchema>;

export const projectSchema = projectBase
  .refine(
    (project) =>
      project.preview.previewType !== "cli" ||
      Boolean(project.preview.castUrl ?? project.preview.videoUrl),
    { message: "cli preview requires a castUrl or videoUrl", path: ["preview"] },
  )
  .refine(
    (project) =>
      project.endDate == null || project.endDate >= project.startDate,
    { message: "endDate must be on or after startDate", path: ["endDate"] },
  );

export type Project = z.infer<typeof projectSchema>;
