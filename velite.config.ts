import { defineConfig, s } from "velite";
import { z } from "zod";
import { projectSchema } from "./src/lib/project-schema";
import { aboutSchema } from "./src/lib/about-schema";
import { skillSchema } from "./src/lib/skills-schema";

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
    /**
     * Single "about me" entry. Same strict-re-parse discipline as `projects`:
     * Velite reads the frontmatter loosely, then the transform re-validates it
     * through the canonical `aboutSchema` and reports failures via `ctx.addIssue`
     * so `strict: true` fails the build on a bad/misspelled key. The MDX body is
     * kept for the Phase 3 bio corpus.
     */
    about: {
      name: "About",
      pattern: "about/index.mdx",
      single: true,
      schema: s
        .object({
          name: s.string(),
          role: s.string(),
          tagline: s.string(),
          body: s.mdx(),
        })
        .transform(({ body, ...frontmatter }, ctx) => {
          const result = aboutSchema.safeParse(frontmatter);
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
    /**
     * Skills, one MDX file each. Same strict-re-parse discipline: Velite reads
     * the frontmatter loosely, the transform re-validates through the canonical
     * `skillSchema` and reports failures via `ctx.addIssue` so `strict: true`
     * fails the build on a bad key. The MDX body is the Phase 3 skills corpus.
     */
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
