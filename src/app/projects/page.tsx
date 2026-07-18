import type { Metadata } from "next";
import { SiteHeading } from "@/components/site-heading";
import { Timeline } from "@/components/timeline/timeline";
import { VisitorCard } from "@/components/visitor-card";
import { getPublishedProjectEntries } from "@/db/queries";
import type { TimelineProject } from "@/lib/content";

/**
 * ISR (Slice 2): this Server Component has no dynamic APIs (no cookies,
 * headers, or searchParams), so it's still statically prerendered and served
 * from cache — the public read path stays fast with no auth on it — but the
 * cached page is regenerated in the background at most once per hour so a
 * newly published project shows up without a redeploy.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Projects",
  description: "A scroll-driven, center-line timeline of projects, oldest first.",
};

/**
 * Build resilience (Slice 2 hardening, prompted by a real incident: the
 * `main` branch was never migrated, and `next build` hard-failed prerendering
 * this route when the query hit a missing `projects` table). A DB hiccup — an
 * unmigrated/unreachable database, a transient network blip, or a genuinely
 * empty table — must never crash the build or the page; it degrades to the
 * empty state below instead, and the next ISR regeneration retries once the
 * DB is reachable again.
 */
async function loadPublishedProjects(): Promise<TimelineProject[]> {
  try {
    return await getPublishedProjectEntries();
  } catch (error) {
    console.error("Failed to load published projects for the timeline:", error);
    return [];
  }
}

export default async function ProjectsPage() {
  const projects = await loadPublishedProjects();

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <SiteHeading
          title="Projects"
          subtitle="A scroll-driven, center-line portfolio."
        />
      </div>
      {projects.length > 0 ? (
        <Timeline projects={projects} />
      ) : (
        <p className="mx-auto max-w-4xl px-4 py-12 text-center text-sm text-muted-foreground">
          No projects to show yet — check back soon.
        </p>
      )}
      {/*
        Optional "who's visiting" card at the END of the timeline (Slice 6).
        A client component that only POSTs on a deliberate submit, so this route
        stays statically prerendered + ISR — it never fetches during render.
      */}
      <VisitorCard />
    </main>
  );
}
