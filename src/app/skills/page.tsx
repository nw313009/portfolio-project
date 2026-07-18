import type { Metadata } from "next";
import { SiteHeading } from "@/components/site-heading";
import { SkillCard, type SkillEvidence } from "@/components/skills/skill-card";
import { getProjectBySlug } from "@/lib/content";
import { getSkillGroups } from "@/lib/skills";
import { SKILL_CATEGORY_LABELS } from "@/lib/skills-schema";

export const metadata: Metadata = {
  title: "Skills",
  description: "The tools and practices behind the work, grouped by domain.",
};

/**
 * Resolve a skill's evidence project slugs to display titles. Skills reference
 * MDX-authored projects (present in the build-time content layer), so a title is
 * available; an unknown slug falls back to the slug itself rather than dropping
 * the (still-valid) deep link.
 */
function resolveEvidence(projectSlugs: string[] | undefined): SkillEvidence[] {
  return (projectSlugs ?? []).map((slug) => ({
    slug,
    title: getProjectBySlug(slug)?.title ?? slug,
  }));
}

export default function SkillsPage() {
  const groups = getSkillGroups();

  return (
    <main className="flex min-h-screen flex-col gap-10 p-8">
      <div className="mx-auto w-full max-w-4xl">
        <SiteHeading
          title="Skills"
          subtitle="The tools and practices behind the work — each linked to the projects that prove it."
        />
      </div>

      {groups.length > 0 ? (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
          {groups.map((group) => (
            <section key={group.category} aria-labelledby={`skills-${group.category}`}>
              <h2
                id={`skills-${group.category}`}
                className="font-heading text-xl font-semibold tracking-tight"
              >
                {SKILL_CATEGORY_LABELS[group.category]}
              </h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.skills.map((skill, index) => (
                  <li key={skill.slug}>
                    <SkillCard
                      name={skill.name}
                      evidence={resolveEvidence(skill.projectSlugs)}
                      index={index}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="mx-auto max-w-4xl px-4 py-12 text-center text-sm text-muted-foreground">
          Skills coming soon.
        </p>
      )}
    </main>
  );
}
