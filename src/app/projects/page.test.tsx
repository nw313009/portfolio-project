import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import type { ReactElement } from "react";
import type { ProjectEntry } from "@/lib/content";

const { getPublishedProjectEntries } = vi.hoisted(() => ({
  getPublishedProjectEntries: vi.fn(),
}));

vi.mock("@/db/queries", () => ({ getPublishedProjectEntries }));

const ProjectsPage = (await import("./page")).default;

function renderPage(element: ReactElement) {
  return render(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {element}
    </ThemeProvider>,
  );
}

const project: ProjectEntry = {
  id: "demo",
  title: "Demo Project",
  slug: "demo",
  startDate: "2024-01-01",
  endDate: null,
  stack: [],
  languages: [],
  summary: "A demo project.",
  githubUrl: "https://github.com/example/demo",
  preview: { previewType: "media", images: ["/a.png"] },
  body: "",
};

describe("Projects page", () => {
  afterEach(() => {
    getPublishedProjectEntries.mockReset();
  });

  it("renders the timeline once published projects load successfully", async () => {
    getPublishedProjectEntries.mockResolvedValue([project]);
    renderPage(await ProjectsPage());
    expect(
      screen.getByRole("heading", { level: 2, name: "Demo Project" }),
    ).toBeInTheDocument();
  });

  it("renders an empty state instead of crashing when the DB read fails (e.g. unmigrated/unreachable DB)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    getPublishedProjectEntries.mockRejectedValue(
      new Error('relation "projects" does not exist'),
    );

    await expect(
      (async () => renderPage(await ProjectsPage()))(),
    ).resolves.not.toThrow();
    expect(screen.getByText(/check back soon/i)).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it("renders the same empty state when there are simply zero published projects (not an error)", async () => {
    getPublishedProjectEntries.mockResolvedValue([]);
    renderPage(await ProjectsPage());
    expect(screen.getByText(/check back soon/i)).toBeInTheDocument();
  });
});
