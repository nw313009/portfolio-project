import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  CliPreview,
  LibraryPreview,
  MediaPreview,
  NotebookPreview,
  ServicePreview,
} from "./simple-previews";

describe("CliPreview", () => {
  it("renders a video when videoUrl is present", () => {
    const { container } = render(
      <CliPreview
        preview={{
          previewType: "cli",
          videoUrl: "https://example.com/demo.mp4",
          poster: "/poster.png",
        }}
        title="Devlog"
      />,
    );
    expect(container.querySelector("video")).toHaveAttribute(
      "src",
      "https://example.com/demo.mp4",
    );
  });

  it("falls back to a cast link when there is no videoUrl", () => {
    render(
      <CliPreview
        preview={{ previewType: "cli", castUrl: "https://asciinema.org/a/1" }}
        title="Devlog"
      />,
    );
    expect(screen.getByRole("link", { name: /watch the recording/i })).toHaveAttribute(
      "href",
      "https://asciinema.org/a/1",
    );
  });

  it("never renders an iframe", () => {
    const { container } = render(
      <CliPreview
        preview={{ previewType: "cli", castUrl: "https://asciinema.org/a/1" }}
        title="Devlog"
      />,
    );
    expect(container.querySelector("iframe")).not.toBeInTheDocument();
  });
});

describe("ServicePreview", () => {
  it("renders the sample payload and an optional OpenAPI link", () => {
    render(
      <ServicePreview
        preview={{
          previewType: "service",
          sample: '{"ok":true}',
          openApiUrl: "https://example.com/openapi.json",
        }}
      />,
    );
    expect(screen.getByText('{"ok":true}')).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view openapi spec/i })).toHaveAttribute(
      "href",
      "https://example.com/openapi.json",
    );
  });

  it("omits the OpenAPI link when not provided", () => {
    render(<ServicePreview preview={{ previewType: "service", sample: '{"ok":true}' }} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("LibraryPreview", () => {
  it("renders the code snippet", () => {
    render(<LibraryPreview preview={{ previewType: "library", codeSnippet: "const x = 1;" }} />);
    expect(screen.getByText("const x = 1;")).toBeInTheDocument();
  });
});

describe("NotebookPreview", () => {
  it("renders the output image and a link to the notebook", () => {
    render(
      <NotebookPreview
        preview={{
          previewType: "notebook",
          outputImageUrl: "/out.png",
          notebookUrl: "https://example.com/nb.ipynb",
        }}
        title="Analysis"
      />,
    );
    expect(screen.getByRole("img", { name: /analysis notebook output/i })).toHaveAttribute(
      "src",
      "/out.png",
    );
    expect(screen.getByRole("link", { name: /open notebook/i })).toHaveAttribute(
      "href",
      "https://example.com/nb.ipynb",
    );
  });
});

describe("MediaPreview", () => {
  it("renders every image", () => {
    render(
      <MediaPreview
        preview={{ previewType: "media", images: ["/a.png", "/b.png"] }}
        title="Gallery"
      />,
    );
    const images = screen.getAllByRole("img", { name: /gallery screenshot/i });
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute("src", "/a.png");
    expect(images[1]).toHaveAttribute("src", "/b.png");
  });
});
