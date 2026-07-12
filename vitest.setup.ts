import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

/**
 * jsdom has no IntersectionObserver, but motion/react's `whileInView` needs
 * one to mount. This minimal stub never fires, so `whileInView` components
 * simply render at their `initial` state in tests - sufficient since these
 * are unit tests of markup/content, not of scroll-triggered animation.
 */
class IntersectionObserverStub implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver =
    IntersectionObserverStub as unknown as typeof IntersectionObserver;
}

/**
 * jsdom has no `window.matchMedia`, but `usePrefersReducedMotion` needs it.
 * Defaults to "no match" (motion enabled) unless a test overrides it.
 */
if (typeof window.matchMedia === "undefined") {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}
