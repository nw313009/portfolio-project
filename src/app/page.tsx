import { SiteHeading } from "@/components/site-heading";
import { ThemeToggle } from "@/components/theme-toggle";
import { Timeline } from "@/components/timeline/timeline";
import { projects } from "@/lib/content";

export default function Home() {
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
