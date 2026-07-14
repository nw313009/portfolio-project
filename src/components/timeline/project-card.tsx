"use client";

import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateRange } from "@/lib/format-date-range";
import type { TimelineProject } from "@/lib/content";
import { ProjectPreview } from "./preview/preview";

interface ProjectCardProps {
  project: TimelineProject;
  /** Which side of the center line this card sits on; controls the slide-in direction. */
  side?: "left" | "right";
}

export function ProjectCard({ project, side = "left" }: ProjectCardProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const titleId = `${project.slug}-title`;
  const offsetX = side === "left" ? -24 : 24;

  return (
    <motion.article
      tabIndex={0}
      aria-labelledby={titleId}
      className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      // Reduced motion bypasses the viewport gate entirely via `animate`
      // (there's no motion left to protect against, so there's no reason to
      // make a user scroll each card into view before it appears) - it must
      // NOT simply drop `whileInView` while leaving the reveal gated on
      // intersection, because `prefersReducedMotion` only resolves after
      // mount (SSR has no `window`); a card whose intersection callback
      // already fired (or never will, e.g. after a `scrollTo` jump) before
      // that flip would be stranded at `initial` forever. `animate` and
      // `whileInView` are mutually exclusive here, so there is no priority
      // conflict between them.
      initial={{ opacity: 0, x: offsetX }}
      animate={prefersReducedMotion ? { opacity: 1, x: 0 } : undefined}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
    >
      <Card>
        <CardHeader>
          {/* shadcn's CardTitle renders a plain <div>; use a real heading so
              the card has correct semantics and an accessible name. */}
          <h2 id={titleId} className="font-heading text-lg leading-snug font-medium">
            {project.title}
          </h2>
          <CardDescription>
            <time dateTime={project.startDate}>
              {formatDateRange(project.startDate, project.endDate)}
            </time>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{project.summary}</p>
          <ul className="flex flex-wrap gap-1.5" aria-label="Tech stack">
            {project.stack.map((technology) => (
              <li key={technology}>
                <Badge variant="secondary">{technology}</Badge>
              </li>
            ))}
          </ul>
          {/* Metadata-only nodes (GitHub-ingested, Slice 4) have no `preview`
              payload yet; the preview surface renders in the later preview
              slice. Only render it when a full preview is present. */}
          {project.preview ? (
            <ProjectPreview preview={project.preview} title={project.title} />
          ) : null}
        </CardContent>
        <CardFooter className="gap-4">
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            GitHub ↗
          </a>
          {project.preview?.previewType === "webapp" ? (
            <a
              href={project.preview.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium underline-offset-4 hover:underline"
            >
              Demo ↗
            </a>
          ) : null}
          {/* Independent of `preview`/`previewType` — a flat outbound link
              rendered purely on presence of the (validated-https) `demoUrl`
              column, so a metadata-only (GitHub-ingested) node gets a demo
              link even though it has no preview surface yet. */}
          {project.demoUrl ? (
            <a
              href={project.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium underline-offset-4 hover:underline"
            >
              Live demo ↗
            </a>
          ) : null}
        </CardFooter>
      </Card>
    </motion.article>
  );
}
