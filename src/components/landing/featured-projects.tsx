import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDateRange } from "@/lib/format-date-range";
import type { TimelineProject } from "@/lib/content";

interface FeaturedProjectsProps {
  projects: TimelineProject[];
}

/**
 * A slim, static teaser strip of the most recent published projects on the
 * landing page. Deliberately beacon-free: unlike the timeline's `ProjectCard`,
 * these cards fire NO `view`/`hover`/`demo-open` events, so engagement counting
 * stays a property of the `/projects` timeline only. Each card deep-links into
 * the timeline via the Slice A `/projects#<slug>` anchor contract.
 */
export function FeaturedProjects({ projects }: FeaturedProjectsProps) {
  if (projects.length === 0) return null;

  return (
    <section
      aria-labelledby="featured-heading"
      className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id="featured-heading"
          className="font-heading text-2xl font-semibold tracking-tight"
        >
          Featured work
        </h2>
        <Link
          href="/projects"
          className="text-sm font-medium text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          All projects →
        </Link>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <li key={project.id}>
            <Link
              href={`/projects#${project.slug}`}
              className="group flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5 transition hover:border-foreground/20 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex flex-col gap-1">
                <h3 className="font-heading text-base font-medium leading-snug">
                  {project.title}
                </h3>
                <time
                  dateTime={project.startDate}
                  className="text-xs text-muted-foreground"
                >
                  {formatDateRange(project.startDate, project.endDate)}
                </time>
              </div>
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {project.summary}
              </p>
              {project.stack.length > 0 ? (
                <ul className="mt-auto flex flex-wrap gap-1.5" aria-label="Tech stack">
                  {project.stack.slice(0, 3).map((technology) => (
                    <li key={technology}>
                      <Badge variant="secondary">{technology}</Badge>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
