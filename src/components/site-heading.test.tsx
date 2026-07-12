import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SiteHeading } from "@/components/site-heading";

describe("SiteHeading", () => {
  it("renders the title as a level-1 heading", () => {
    render(<SiteHeading title="Projects Timeline" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Projects Timeline" }),
    ).toBeInTheDocument();
  });

  it("renders the subtitle when provided", () => {
    render(<SiteHeading title="Projects Timeline" subtitle="Hello world" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });
});
