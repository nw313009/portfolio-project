import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { CursorGlow } from "./cursor-glow";

/** Point `window.matchMedia` at a fixed matrix of query → matches. */
function stubMatchMedia(matches: Record<string, boolean>) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: matches[query] ?? false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

describe("CursorGlow", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("renders nothing under reduced motion", () => {
    stubMatchMedia({
      "(prefers-reduced-motion: reduce)": true,
      "(pointer: fine)": true,
    });
    const { container } = render(<CursorGlow />);
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("renders nothing on a coarse (touch) pointer", () => {
    stubMatchMedia({
      "(prefers-reduced-motion: reduce)": false,
      "(pointer: fine)": false,
    });
    const { container } = render(<CursorGlow />);
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("mounts a non-interactive canvas for a fine pointer with motion allowed", () => {
    stubMatchMedia({
      "(prefers-reduced-motion: reduce)": false,
      "(pointer: fine)": true,
    });
    const { container } = render(<CursorGlow />);
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas).toHaveAttribute("aria-hidden", "true");
  });
});
