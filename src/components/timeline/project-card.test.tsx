import { describe, it, expect, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ProjectCard } from "@/components/timeline/project-card";
import type { ProjectEntry, TimelineProject } from "@/lib/content";

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

function mockPrefersReducedMotion(matches: boolean) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

const webappProject: ProjectEntry = {
  id: "demo",
  title: "Demo Project",
  slug: "demo-project",
  startDate: "2024-01-01",
  endDate: null,
  stack: ["Next.js", "TypeScript"],
  languages: ["TypeScript"],
  summary: "A sample project for testing.",
  githubUrl: "https://github.com/example/demo",
  preview: { previewType: "webapp", demoUrl: "https://example.com" },
  body: "",
};

describe("ProjectCard", () => {
  it("renders the title as a heading, the date range, and the summary", () => {
    render(<ProjectCard project={webappProject} />);
    expect(
      screen.getByRole("heading", { name: "Demo Project" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Jan 2024 - Present")).toBeInTheDocument();
    expect(
      screen.getByText("A sample project for testing."),
    ).toBeInTheDocument();
  });

  it("renders every stack technology as a chip", () => {
    render(<ProjectCard project={webappProject} />);
    expect(screen.getByText("Next.js")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("links to GitHub in a new tab", () => {
    render(<ProjectCard project={webappProject} />);
    const link = screen.getByRole("link", { name: /GitHub/i });
    expect(link).toHaveAttribute("href", "https://github.com/example/demo");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("renders exactly ONE demo anchor for a webapp preview, sourced from preview.demoUrl", () => {
    render(<ProjectCard project={webappProject} />);
    const links = screen.getAllByRole("link", { name: /Live demo/i });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "https://example.com");
    expect(links[0]).toHaveAttribute("target", "_blank");
    expect(links[0]).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("renders exactly ONE demo anchor for a metadata-only node with a flat demoUrl", () => {
    const metadataOnlyProject: TimelineProject = {
      ...webappProject,
      preview: undefined,
      demoUrl: "https://demo.example.com",
    };
    render(<ProjectCard project={metadataOnlyProject} />);
    const links = screen.getAllByRole("link", { name: /Live demo/i });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "https://demo.example.com");
  });

  it("keeps the demo link for a NON-webapp node that has a flat demoUrl", () => {
    const libraryWithDemo: TimelineProject = {
      ...webappProject,
      preview: { previewType: "library", codeSnippet: "const x = 1;" },
      demoUrl: "https://demo.example.com",
    };
    render(<ProjectCard project={libraryWithDemo} />);
    expect(screen.getByRole("link", { name: /Live demo/i })).toHaveAttribute(
      "href",
      "https://demo.example.com",
    );
  });

  it("renders NO demo anchor when neither the union nor a flat demoUrl carries one", () => {
    const libraryProject: TimelineProject = {
      ...webappProject,
      preview: { previewType: "library", codeSnippet: "const x = 1;" },
      demoUrl: undefined,
    };
    render(<ProjectCard project={libraryProject} />);
    expect(
      screen.queryByRole("link", { name: /Live demo/i }),
    ).not.toBeInTheDocument();
  });

  it("is a keyboard-focusable article", () => {
    render(<ProjectCard project={webappProject} />);
    const article = screen.getByRole("article");
    expect(article).toHaveAttribute("tabindex", "0");
    expect(article).toHaveAccessibleName("Demo Project");
  });

  it("becomes fully visible when reduced motion is preferred, even though this environment's IntersectionObserver never fires", async () => {
    // This is a regression test: an earlier implementation gated the reveal
    // on `whileInView`/IntersectionObserver even under reduced motion, so a
    // card could be permanently stuck invisible if reduced motion resolved
    // (client-only, post-mount) before intersection was observed.
    mockPrefersReducedMotion(true);
    render(<ProjectCard project={webappProject} />);
    const article = screen.getByRole("article");
    await waitFor(() => {
      expect(article).toHaveStyle({ opacity: "1", transform: "none" });
    });
  });
});
