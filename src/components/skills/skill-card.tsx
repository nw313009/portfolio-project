"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

export interface SkillEvidence {
  slug: string;
  title: string;
}

interface SkillCardProps {
  name: string;
  evidence: SkillEvidence[];
  /** Position within its category, used to stagger the reveal slightly. */
  index: number;
}

/**
 * A single skill tile. Reveals on scroll (staggered by `index`), consistent with
 * the timeline's motion language, and honors `prefers-reduced-motion` the same
 * way `ProjectCard` does: reduced motion renders at rest via `animate` (so a
 * tile whose intersection never fires isn't stranded), otherwise `whileInView`.
 *
 * `evidence` are the projects that demonstrate this skill, deep-linked into the
 * timeline via the `/projects#<slug>` anchor contract.
 */
export function SkillCard({ name, evidence, index }: SkillCardProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.article
      className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5"
      initial={{ opacity: 0, y: 16 }}
      animate={prefersReducedMotion ? { opacity: 1, y: 0 } : undefined}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 0.4, ease: "easeOut", delay: Math.min(index * 0.05, 0.3) }
      }
    >
      <h3 className="font-heading text-base font-medium leading-snug">{name}</h3>
      {evidence.length > 0 ? (
        <div className="mt-auto flex flex-col gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Used in
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {evidence.map((project) => (
              <li key={project.slug}>
                <Link
                  href={`/projects#${project.slug}`}
                  className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {project.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </motion.article>
  );
}
