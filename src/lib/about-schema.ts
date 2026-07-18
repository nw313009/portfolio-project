import { z } from "zod";

/**
 * The "about me" corpus entry. Authored as a single MDX file
 * (`src/content/about/index.mdx`): the frontmatter drives the landing hero
 * today, and the MDX prose body becomes the Phase 3 bio corpus (a `{type:'bio'}`
 * citation target) with no re-authoring.
 *
 * `z.strictObject` (not the default `z.object`, which silently strips) so an
 * unknown/misspelled frontmatter key is a hard build error, not a silent drop.
 */
export const aboutSchema = z.strictObject({
  /** Full name, shown as the wordmark/identity. */
  name: z.string().min(1),
  /** Short role line, e.g. "Frontend engineer". */
  role: z.string().min(1),
  /** One-sentence positioning statement — the hero headline. */
  tagline: z.string().min(1),
});

export type About = z.infer<typeof aboutSchema>;
