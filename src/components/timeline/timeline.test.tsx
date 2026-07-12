import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { Timeline } from "@/components/timeline/timeline";
import type { ProjectEntry } from "@/lib/content";

function makeProject(id: string, title: string, startDate: string): ProjectEntry {
  return {
    id,
    title,
    slug: id,
    startDate,
    endDate: null,
    stack: [],
    languages: [],
    summary: `Summary for ${title}`,
    githubUrl: `https://github.com/example/${id}`,
    preview: { previewType: "media", images: ["/a.png"] },
    body: "",
  };
}

const projects: ProjectEntry[] = [
  makeProject("one", "Oldest Project", "2021-01-01"),
  makeProject("two", "Middle Project", "2022-01-01"),
  makeProject("three", "Newest Project", "2023-01-01"),
];

describe("Timeline", () => {
  it("renders exactly one list item per project", () => {
    // Scoped to direct children of the timeline's own <ol>, not
    // `getAllByRole("listitem")`: a project's preview (e.g. a media
    // gallery) can render its own nested <ul>/<li>s.
    const { container } = render(<Timeline projects={projects} />);
    expect(container.querySelectorAll("ol > li")).toHaveLength(3);
  });

  it("renders cards in the given (oldest-first) order", () => {
    render(<Timeline projects={projects} />);
    const headings = screen.getAllByRole("heading").map((el) => el.textContent);
    expect(headings).toEqual([
      "Oldest Project",
      "Middle Project",
      "Newest Project",
    ]);
  });

  it("renders each project's card exactly once (no duplicate side rendering)", () => {
    render(<Timeline projects={projects} />);
    for (const project of projects) {
      expect(screen.getAllByText(project.title)).toHaveLength(1);
    }
  });

  it("alternates cards left/right by index", () => {
    const { container } = render(<Timeline projects={projects} />);
    const items = container.querySelectorAll("ol > li");
    expect(items[0]).toHaveAttribute("data-side", "left");
    expect(items[1]).toHaveAttribute("data-side", "right");
    expect(items[2]).toHaveAttribute("data-side", "left");
  });

  it("renders a single center line", () => {
    render(<Timeline projects={projects} />);
    const section = screen.getByRole("region", { name: "Project timeline" });
    expect(section.querySelectorAll("svg[aria-hidden='true']")).toHaveLength(1);
  });
});

describe("Timeline pagination", () => {
  // Swap in a controllable IntersectionObserver for this block only, so the
  // sentinel's reveal-more-on-intersect logic can be driven manually instead
  // of relying on the never-fires stub in vitest.setup.ts.
  let intersectionCallback: IntersectionObserverCallback | null = null;
  let observeSpy: ReturnType<typeof vi.fn<(target: Element) => void>>;
  let originalIntersectionObserver: typeof IntersectionObserver;

  beforeEach(() => {
    originalIntersectionObserver = globalThis.IntersectionObserver;
    observeSpy = vi.fn<(target: Element) => void>();
    const spy = observeSpy;
    class MockIntersectionObserver implements IntersectionObserver {
      readonly root: Element | Document | null = null;
      readonly rootMargin: string = "";
      readonly thresholds: ReadonlyArray<number> = [];
      constructor(callback: IntersectionObserverCallback) {
        intersectionCallback = callback;
      }
      observe(target: Element): void {
        spy(target);
      }
      unobserve(): void {}
      disconnect(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }
    globalThis.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    globalThis.IntersectionObserver = originalIntersectionObserver;
    intersectionCallback = null;
  });

  const manyProjects: ProjectEntry[] = Array.from({ length: 8 }, (_, index) =>
    makeProject(`p${index}`, `Project ${index}`, `2020-${String(index + 1).padStart(2, "0")}-01`),
  );

  it("only mounts the first page of cards and observes a sentinel", () => {
    const { container } = render(<Timeline projects={manyProjects} />);
    expect(container.querySelectorAll("ol > li")).toHaveLength(6);
    expect(observeSpy).toHaveBeenCalledTimes(1);
  });

  it("reveals the next page once the sentinel intersects", () => {
    const { container } = render(<Timeline projects={manyProjects} />);

    act(() => {
      intersectionCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(container.querySelectorAll("ol > li")).toHaveLength(8);
  });

  it("does not observe a sentinel once every project is already visible", () => {
    render(<Timeline projects={projects} />);
    expect(observeSpy).not.toHaveBeenCalled();
  });
});
