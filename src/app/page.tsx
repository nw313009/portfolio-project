import { Hero } from "@/components/landing/hero";
import { FeaturedProjects } from "@/components/landing/featured-projects";
import { about } from "@/lib/about";
import { getPublishedProjectEntries } from "@/db/queries";
import type { TimelineProject } from "@/lib/content";

/**
 * The landing page's featured strip reads the same published set as the
 * timeline, so it uses the same ISR window — no dynamic APIs, so `/` stays
 * statically prerendered and regenerated at most hourly.
 */
export const revalidate = 3600;

/** How many recent projects the featured strip shows. */
const FEATURED_COUNT = 3;

/**
 * Same build-resilience posture as `/projects`: a DB hiccup must never crash the
 * build or the page. On failure the featured strip simply renders nothing (the
 * hero still stands on its own), and the next ISR pass retries.
 */
async function loadFeaturedProjects(): Promise<TimelineProject[]> {
  try {
    const published = await getPublishedProjectEntries();
    // `getPublishedProjectEntries` returns oldest-first; feature the newest.
    return published.slice(-FEATURED_COUNT).reverse();
  } catch (error) {
    console.error("Failed to load featured projects for the landing page:", error);
    return [];
  }
}

export default async function Home() {
  const featured = await loadFeaturedProjects();

  return (
    <main className="flex flex-col">
      <Hero name={about.name} role={about.role} tagline={about.tagline} />
      <FeaturedProjects projects={featured} />
    </main>
  );
}
