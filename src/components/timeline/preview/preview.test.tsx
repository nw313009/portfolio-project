import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Preview } from "@/lib/project-schema";
import { ProjectPreview } from "./preview";

describe("ProjectPreview", () => {
  it("renders WebappPreview (idle, no iframe yet) for a webapp preview", () => {
    const preview: Preview = { previewType: "webapp", demoUrl: "https://example.com" };
    render(<ProjectPreview preview={preview} title="Demo" />);
    expect(screen.getByRole("button", { name: /preview demo/i })).toBeInTheDocument();
  });

  it("renders LibraryPreview's code snippet for a library preview", () => {
    const preview: Preview = { previewType: "library", codeSnippet: "const x = 1;" };
    render(<ProjectPreview preview={preview} title="Lib" />);
    expect(screen.getByText("const x = 1;")).toBeInTheDocument();
  });

  it("never renders an iframe for non-webapp preview types", () => {
    const preview: Preview = { previewType: "media", images: ["/a.png"] };
    const { container } = render(<ProjectPreview preview={preview} title="Gallery" />);
    expect(container.querySelector("iframe")).not.toBeInTheDocument();
  });
});
