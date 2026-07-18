import { defineConfig, s } from "velite";
import { z } from "zod";
import { skillSchema } from "../../../src/lib/skills-schema";

/**
 * Standalone Velite config for a throwaway skills fixture. Mirrors the real
 * `velite.config.ts` skills collection (same schema, same `strict: true`) so
 * that building `content/skills/broken.mdx` (an invalid `category`) proves the
 * actual build pipeline fails loudly on bad skill content — not just the Zod
 * schema in isolation. Never referenced by the app; only `run.mjs` in this
 * folder invokes it, from a test subprocess.
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
    skills: {
      name: "Skill",
      pattern: "skills/**/*.mdx",
      schema: s
        .object({
          slug: s.string(),
          name: s.string(),
          category: s.string(),
          order: s.number(),
          projectSlugs: s.array(s.string()).optional(),
          body: s.mdx(),
        })
        .transform(({ body, ...frontmatter }, ctx) => {
          const result = skillSchema.safeParse(frontmatter);
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
