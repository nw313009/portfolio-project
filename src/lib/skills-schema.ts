import { z } from "zod";

/**
 * Skill groupings shown on `/skills`. Ordered as they should appear as sections.
 */
export const SKILL_CATEGORIES = ["frontend", "backend", "infra", "testing"] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

/** Human labels for each category section heading. */
export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  frontend: "Frontend",
  backend: "Backend",
  infra: "Infrastructure",
  testing: "Testing & Quality",
};

/**
 * A single skill, authored as MDX (`src/content/skills/*.mdx`): typed
 * frontmatter drives the `/skills` grid today, and the MDX prose body becomes
 * the Phase 3 skills corpus (a `{type:'skill',slug}` citation target) with no
 * re-authoring. `projectSlugs` (optional) are the evidence links back into the
 * timeline via the `/projects#<slug>` anchor contract.
 *
 * `z.strictObject` so an unknown/misspelled frontmatter key is a hard build
 * error, not a silent drop.
 */
export const skillSchema = z.strictObject({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case"),
  name: z.string().min(1),
  category: z.enum(SKILL_CATEGORIES),
  /** Sort order within a category (ascending). */
  order: z.number().int(),
  /** Slugs of projects that demonstrate this skill (deep-linked evidence). */
  projectSlugs: z.array(z.string().min(1)).optional(),
});

export type Skill = z.infer<typeof skillSchema>;
