"use client";

import { motion, type MotionValue } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

interface TimelineLineProps {
  /** 0-1 scroll progress through the timeline section, from `useScroll`. */
  progress: MotionValue<number>;
}

/**
 * Center line for the timeline: a dim static track (always the full height)
 * with a solid line drawn on top of it as `progress` advances. Rendered as
 * SVG `<path>`s so the draw effect can use `pathLength`, per Motion's
 * documented SVG line-drawing pattern.
 */
export function TimelineLine({ progress }: TimelineLineProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="none"
      viewBox="0 0 2 100"
      className="pointer-events-none absolute inset-y-0 left-4 h-full w-0.5 sm:left-1/2 sm:-translate-x-1/2"
    >
      <path
        d="M 1 0 L 1 100"
        className="stroke-border"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        fill="none"
      />
      <motion.path
        d="M 1 0 L 1 100"
        className="stroke-primary"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        fill="none"
        style={{ pathLength: prefersReducedMotion ? 1 : progress }}
      />
    </svg>
  );
}
