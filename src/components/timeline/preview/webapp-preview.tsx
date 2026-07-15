"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, Play } from "lucide-react";
import { cn } from "@/lib/utils";

const HOVER_INTENT_MS = 400;
const LOAD_TIMEOUT_MS = 6000;

type Status = "idle" | "loading" | "loaded" | "failed";

interface WebappPreviewProps {
  demoUrl: string;
  poster?: string;
  title: string;
  /**
   * Called ONLY on a deliberate "Preview" button click (a real user action),
   * never on hover-intent — hover is noisy, has no touch equivalent, and isn't
   * intent. Used to record the "preview opened" engagement event.
   */
  onExpand?: () => void;
}

/**
 * Live `<iframe>` preview of a webapp demo. Never mounts the iframe eagerly:
 * it waits for hover intent (a short mouseenter debounce, so a passing
 * cursor doesn't trigger a network request) or a direct click/keyboard
 * activation of the "Preview" button, which is the only way keyboard users
 * can trigger it since hover has no keyboard equivalent.
 *
 * There is no reliable way to detect from the parent page that a site has
 * refused framing via X-Frame-Options/CSP - the iframe's `load` event still
 * fires even when the response is blocked, so a timeout can't distinguish
 * "blocked" from "slow but fine". Given that platform limitation, this
 * always keeps an "Open demo" escape hatch visible once the preview has
 * loaded, and additionally treats a `load` event that never fires within
 * `LOAD_TIMEOUT_MS` (a genuine non-response) as a failure.
 */
export function WebappPreview({ demoUrl, poster, title, onExpand }: WebappPreviewProps) {
  const [status, setStatus] = useState<Status>("idle");
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startLoading() {
    setStatus((current) => (current === "idle" ? "loading" : current));
  }

  // Deliberate button click = "preview opened". Kept separate from
  // `startLoading` (which the hover-intent path also calls) so hover NEVER
  // records the event.
  function handleExpandClick() {
    startLoading();
    onExpand?.();
  }

  function handleMouseEnter() {
    if (status !== "idle") return;
    hoverTimerRef.current = setTimeout(startLoading, HOVER_INTENT_MS);
  }

  function handleMouseLeave() {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }

  useEffect(() => {
    if (status !== "loading") return;
    const timeoutId = setTimeout(() => setStatus("failed"), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeoutId);
  }, [status]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  if (status === "idle") {
    return (
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative flex aspect-video items-center justify-center overflow-hidden rounded-md bg-muted bg-cover bg-center"
        style={poster ? { backgroundImage: `url(${poster})` } : undefined}
      >
        <button
          type="button"
          onClick={handleExpandClick}
          className="relative z-10 inline-flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-sm font-medium shadow-sm ring-1 ring-border transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Play className="size-4" aria-hidden="true" />
          Preview {title}
        </button>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-md bg-muted p-4 text-center text-sm text-muted-foreground">
        <p>This demo couldn&apos;t be loaded here.</p>
        <FallbackLink demoUrl={demoUrl} />
      </div>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
      {status === "loading" ? (
        <div
          className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
          Loading preview…
        </div>
      ) : null}
      <iframe
        src={demoUrl}
        title={`${title} demo`}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        loading="lazy"
        onLoad={() => setStatus("loaded")}
        className={cn("h-full w-full border-0", status === "loading" && "opacity-0")}
      />
      {status === "loaded" ? (
        <div className="absolute right-2 top-2 rounded-md bg-background/90 px-2 py-1 shadow-sm ring-1 ring-border">
          <FallbackLink demoUrl={demoUrl} />
        </div>
      ) : null}
    </div>
  );
}

function FallbackLink({ demoUrl }: { demoUrl: string }) {
  return (
    <a
      href={demoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
    >
      Open demo
      <ExternalLink className="size-3.5" aria-hidden="true" />
    </a>
  );
}
