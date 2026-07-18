import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import type { ReactElement } from "react";
import type { ProjectEntry } from "@/lib/content";

const { getPublishedProjectEntries } = vi.hoisted(() => ({
  getPublishedProjectEntries: vi.fn(),
}));

vi.mock("@/db/queries", () => ({ getPublishedProjectEntries }));

const Home = (await import("./page")).default;

function renderHome(element: ReactElement) {
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
  stack: ["Next.js"],
  languages: [],
  summary: "A demo project.",
  githubUrl: "https://github.com/example/demo",
  preview: { previewType: "media", images: ["/a.png"] },
  body: "",
};

describe("Landing page", () => {
  afterEach(() => {
    getPublishedProjectEntries.mockReset();
  });

  it("renders a hero heading and CTAs into projects and skills", async () => {
    getPublishedProjectEntries.mockResolvedValue([]);
    renderHome(await Home());

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view projects/i })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(screen.getByRole("link", { name: /explore skills/i })).toHaveAttribute(
      "href",
      "/skills",
    );
  });

  it("features recent published projects, deep-linked into the timeline", async () => {
    getPublishedProjectEntries.mockResolvedValue([project]);
    renderHome(await Home());

    const featuredLink = screen.getByRole("link", { name: /demo project/i });
    expect(featuredLink).toHaveAttribute("href", "/projects#demo");
  });

  it("renders the hero without a featured strip when the DB read fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    getPublishedProjectEntries.mockRejectedValue(new Error("db down"));

    await expect((async () => renderHome(await Home()))()).resolves.not.toThrow();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText(/featured work/i)).not.toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
