import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SkillsPage from "./page";

describe("Skills page", () => {
  it("renders the page heading and category sections", () => {
    render(<SkillsPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Skills" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Frontend" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Backend" })).toBeInTheDocument();
  });

  it("renders skills whose evidence deep-links into the timeline", () => {
    render(<SkillsPage />);

    const deepLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("/projects#"));

    expect(deepLinks.length).toBeGreaterThan(0);
    expect(
      deepLinks.some(
        (link) => link.getAttribute("href") === "/projects#timeline-portfolio",
      ),
    ).toBe(true);
  });
});
