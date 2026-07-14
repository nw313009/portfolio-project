import { SiteHeading } from "@/components/site-heading";
import { ThemeToggle } from "@/components/theme-toggle";
import { Timeline } from "@/components/timeline/timeline";
import { getPublishedProjectEntries } from "@/db/queries";

/**
 * ISR (Slice 2): this Server Component has no dynamic APIs (no cookies,
 * headers, or searchParams), so it's still statically prerendered and served
 * from cache — the public read path stays fast with no auth on it — but the
 * cached page is regenerated in the background at most once per hour so a
 * newly published project shows up without a redeploy.
 */
export const revalidate = 3600;

export default async function Home() {
  const projects = await getPublishedProjectEntries();

  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <div className="mx-auto flex w-full max-w-4xl items-start justify-between gap-4">
        <div className="flex-1">
          <SiteHeading
            title="Projects Timeline"
            subtitle="A scroll-driven, center-line portfolio."
          />
        </div>
        <ThemeToggle />
      </div>
      <Timeline projects={projects} />
    </main>
  );
}
