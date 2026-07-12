"use client";

import { useEffect, useRef, useState } from "react";
import { useScroll } from "motion/react";
import type { ProjectEntry } from "@/lib/content";
import { TimelineLine } from "./timeline-line";
import { ProjectCard } from "./project-card";

/** Projects revealed per page. Chosen for a typical viewport's worth of cards. */
const PAGE_SIZE = 6;

interface TimelineProps {
  projects: ProjectEntry[];
}

/**
 * Vertical, center-line timeline. Oldest project at the top (callers are
 * expected to pass `projects` pre-sorted ascending by `startDate`, as
 * `@/lib/content` already does).
 *
 * Layout: on `sm:` and up, cards alternate left/right of the center line by
 * index, each `<li>` rendering its card in exactly one of the two side
 * columns and leaving the other empty. Below `sm:`, both side columns are
 * collapsed onto a single column via explicit `col-start`/`row-start`
 * placement (not by hiding/duplicating markup), so every card sits in one
 * left-aligned rail next to the line.
 *
 * The center line's draw progress tracks scroll through this section (see
 * `TimelineLine`); each card fades/slides in on scroll via `whileInView` (see
 * `ProjectCard`). Cards beyond `PAGE_SIZE` are only mounted once a sentinel
 * near the end of the current list scrolls into view, so the DOM stays
 * bounded for long project lists instead of mounting every card (and every
 * card's preview) up front.
 */
export function Timeline({ projects }: TimelineProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef });

  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(PAGE_SIZE, projects.length),
  );
  const hasMore = visibleCount < projects.length;
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((current) => Math.min(current + PAGE_SIZE, projects.length));
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, projects.length]);

  const visibleProjects = projects.slice(0, visibleCount);

  return (
    <section
      ref={sectionRef}
      aria-label="Project timeline"
      className="relative mx-auto max-w-4xl px-4 py-12"
    >
      <TimelineLine progress={scrollYProgress} />
      <ol className="relative flex flex-col gap-12">
        {visibleProjects.map((project, index) => {
          const side: "left" | "right" = index % 2 === 0 ? "left" : "right";
          return (
            <li
              key={project.id}
              data-side={side}
              className="relative grid grid-cols-[2rem_1fr] items-start gap-x-4 sm:grid-cols-[1fr_2rem_1fr] sm:gap-x-6"
            >
              <div className="col-start-2 row-start-1 sm:col-start-1">
                {side === "left" ? (
                  <ProjectCard project={project} side="left" />
                ) : null}
              </div>
              <div className="col-start-1 row-start-1 flex justify-center sm:col-start-2">
                <span
                  aria-hidden="true"
                  className="mt-2 size-3 rounded-full bg-primary ring-4 ring-background"
                />
              </div>
              <div className="col-start-2 row-start-1 sm:col-start-3">
                {side === "right" ? (
                  <ProjectCard project={project} side="right" />
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      {hasMore ? (
        <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      ) : null}
    </section>
  );
}
