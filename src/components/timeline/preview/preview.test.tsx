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

  it("renders CliPreview's terminal recording for a cli preview", () => {
    const preview: Preview = {
      previewType: "cli",
      castUrl: "https://example.com/cast.cast",
    };
    render(<ProjectPreview preview={preview} title="CLI" />);
    expect(screen.getByText(/terminal recording/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /watch the recording/i }),
    ).toHaveAttribute("href", "https://example.com/cast.cast");
  });

  it("renders ServicePreview's sample payload for a service preview", () => {
    const preview: Preview = {
      previewType: "service",
      sample: '{"ok":true}',
    };
    render(<ProjectPreview preview={preview} title="API" />);
    expect(screen.getByText('{"ok":true}')).toBeInTheDocument();
  });

  it("renders LibraryPreview's code snippet for a library preview", () => {
    const preview: Preview = { previewType: "library", codeSnippet: "const x = 1;" };
    render(<ProjectPreview preview={preview} title="Lib" />);
    expect(screen.getByText("const x = 1;")).toBeInTheDocument();
  });

  it("renders NotebookPreview's output + open-notebook link for a notebook preview", () => {
    const preview: Preview = {
      previewType: "notebook",
      outputImageUrl: "/previews/nb.png",
      notebookUrl: "https://example.com/nb.ipynb",
    };
    render(<ProjectPreview preview={preview} title="Notebook" />);
    expect(
      screen.getByRole("link", { name: /open notebook/i }),
    ).toHaveAttribute("href", "https://example.com/nb.ipynb");
  });

  it("renders MediaPreview's screenshot gallery for a media preview", () => {
    const preview: Preview = { previewType: "media", images: ["/a.png", "/b.png"] };
    render(<ProjectPreview preview={preview} title="Gallery" />);
    expect(screen.getByRole("list", { name: /screenshots/i })).toBeInTheDocument();
  });

  it("never renders an iframe for non-webapp preview types", () => {
    const preview: Preview = { previewType: "media", images: ["/a.png"] };
    const { container } = render(<ProjectPreview preview={preview} title="Gallery" />);
    expect(container.querySelector("iframe")).not.toBeInTheDocument();
  });
});
