import { defineConfig, s } from "velite";
import { z } from "zod";
import { projectSchema } from "../../../src/lib/project-schema";

/**
 * Standalone Velite config for a throwaway fixture directory. It mirrors the
 * real `velite.config.ts` (same schema, same `strict: true`) so that running
 * a build against `content/projects/broken.mdx` (missing `demoUrl` for its
 * `webapp` preview) proves the *actual build pipeline* fails loudly on bad
 * content - not just the Zod schema in isolation. Never referenced by the
 * app; only `run.mjs` in this folder invokes it, from a test subprocess.
 */
export default defineConfig({
  root: "content",
  strict: true,
  output: {
    data: ".velite",
    assets: "static",
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
