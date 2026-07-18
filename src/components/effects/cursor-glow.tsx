"use client";

import { useEffect, useRef, useState } from "react";
import {
  capParticles,
  cursorEffectsEnabled,
  spawnParticles,
  stepParticles,
  type Particle,
} from "@/lib/cursor-particles";

/**
 * Site-wide "firelight" cursor: a full-viewport, non-interactive canvas that
 * trails warm embers behind the real pointer, bursts on click, and flares over
 * interactive elements.
 *
 * Performance contract: the pointer position and the particle array live in
 * refs, never React state, so a mousemove never triggers a re-render — all
 * motion is driven by a single `requestAnimationFrame` loop drawing to canvas.
 * The only state is the one-time enable decision.
 *
 * Accessibility contract: renders nothing under `prefers-reduced-motion: reduce`
 * or on coarse pointers (touch), and never hides the native cursor.
 */
export function CursorGlow() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(cursorEffectsEnabled());
  }, []);

  if (!enabled) return null;
  return <CursorCanvas />;
}

function CursorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;
    // `getContext` is unimplemented in jsdom (throws); guard so the component
    // degrades to an inert canvas under test instead of crashing the effect.
    let maybeContext: CanvasRenderingContext2D | null = null;
    try {
      maybeContext = canvasElement.getContext("2d");
    } catch {
      maybeContext = null;
    }
    if (!maybeContext) return;
    // Explicitly-typed `const` aliases so the narrowed non-null types survive
    // into the closures (rAF loop, listeners) below.
    const canvas: HTMLCanvasElement = canvasElement;
    const context: CanvasRenderingContext2D = maybeContext;

    let particles: Particle[] = [];
    let intensity = 1; // flares up over interactive elements
    const pointer = { x: 0, y: 0, active: false };
    let devicePixelRatioValue = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      devicePixelRatioValue = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * devicePixelRatioValue);
      canvas.height = Math.floor(window.innerHeight * devicePixelRatioValue);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(devicePixelRatioValue, 0, 0, devicePixelRatioValue, 0, 0);
    }
    resize();

    function handlePointerMove(event: PointerEvent) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
      particles = capParticles(
        particles.concat(
          spawnParticles({ x: pointer.x, y: pointer.y, count: Math.round(2 * intensity) }),
        ),
      );
    }

    function handleClick(event: PointerEvent) {
      particles = capParticles(
        particles.concat(
          spawnParticles({ x: event.clientX, y: event.clientY, count: 24, speed: 2.4 }),
        ),
      );
    }

    function handleOver(event: Event) {
      const target = event.target as Element | null;
      intensity = target?.closest("a, button, [role='button']") ? 2.2 : 1;
    }

    let frame = 0;
    function render() {
      // Trail fade: clear fully each frame, then draw live particles with
      // additive blending so overlapping embers brighten like real fire.
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      context.globalCompositeOperation = "lighter";
      for (const particle of particles) {
        const radius = particle.size * (1 + particle.life * 2.5);
        const gradient = context.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          radius,
        );
        const alpha = particle.life * 0.55;
        gradient.addColorStop(0, `hsla(${particle.hue}, 100%, 68%, ${alpha})`);
        gradient.addColorStop(1, `hsla(${particle.hue}, 100%, 50%, 0)`);
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
        context.fill();
      }
      context.globalCompositeOperation = "source-over";
      particles = stepParticles(particles);
      frame = window.requestAnimationFrame(render);
    }
    frame = window.requestAnimationFrame(render);

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handleClick, { passive: true });
    window.addEventListener("mouseover", handleOver, { passive: true });
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handleClick);
      window.removeEventListener("mouseover", handleOver);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60]"
    />
  );
}
