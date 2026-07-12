import { defineConfig, s } from "velite";
import { z } from "zod";
import { projectSchema } from "./src/lib/project-schema";

/**
 * Velite reads the MDX frontmatter loosely here (it only needs to know which
 * keys to keep and how to compile the MDX body). The canonical Zod schema in
 * `src/lib/project-schema.ts` is the single source of truth: the transform
 * re-parses every entry through it and reports failures through Velite's own
 * issue-reporting (`ctx.addIssue` + `z.NEVER`, not a raw throw).
 *
 * `strict: true` is required for this to actually fail the build: Velite's
 * default (`strict: false`) only *logs a warning* on a schema violation and
 * still succeeds - the exact "safety net with a hole" this closes.
 */
export default defineConfig({
  root: "src/content",
  strict: true,
  output: {
    data: ".velite",
    assets: "public/static",
    base: "/static/",
    name: "[name]-[hash:6].[ext]",
    clean: true,
  },
  collections: {
    projects: {
      name: "Project",
      pattern: "projects/**/*.mdx",
      schema: s
        .object({
          id: s.string(),
          title: s.string(),
          slug: s.string(),
          startDate: s.string(),
          endDate: s.string().nullable().optional(),
          stack: s.array(s.string()),
          languages: s.array(s.string()),
          summary: s.string(),
          githubUrl: s.string(),
          preview: s.any(),
          body: s.mdx(),
        })
        .transform(({ body, ...frontmatter }, ctx) => {
          const result = projectSchema.safeParse(frontmatter);
          if (!result.success) {
            for (const issue of result.error.issues) {
              ctx.addIssue({
                code: "custom",
                message: issue.message,
                path: issue.path.map(String),
              });
            }
            return z.NEVER;
          }
          return { ...result.data, body };
        }),
    },
  },
});
