import { describe, expect, it } from "vitest";
import {
  CURSOR_PARTICLE_CAP,
  capParticles,
  cursorEffectsEnabled,
  spawnParticles,
  stepParticles,
  type Particle,
} from "./cursor-particles";

/** Deterministic RNG cycling through fixed values, so spawns are reproducible. */
function seededRng(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

describe("spawnParticles", () => {
  it("creates exactly `count` particles at the origin, each full-life", () => {
    const particles = spawnParticles({ x: 10, y: 20, count: 5 }, seededRng([0.5]));
    expect(particles).toHaveLength(5);
    for (const particle of particles) {
      expect(particle.x).toBe(10);
      expect(particle.y).toBe(20);
      expect(particle.life).toBe(1);
    }
  });

  it("gives embers a warm hue in the amber/orange range", () => {
    const particles = spawnParticles({ x: 0, y: 0, count: 20 });
    for (const particle of particles) {
      expect(particle.hue).toBeGreaterThanOrEqual(18);
      expect(particle.hue).toBeLessThanOrEqual(42);
    }
  });
});

describe("stepParticles", () => {
  it("moves a particle by its velocity", () => {
    const particle: Particle = {
      x: 0,
      y: 0,
      vx: 2,
      vy: -1,
      life: 1,
      size: 2,
      hue: 30,
    };
    const [next] = stepParticles([particle]);
    expect(next.x).toBe(2);
    expect(next.y).toBe(-1);
  });

  it("drops particles once their life reaches zero", () => {
    const nearlyDead: Particle = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0.01,
      size: 1,
      hue: 30,
    };
    expect(stepParticles([nearlyDead], 0.02)).toHaveLength(0);
  });
});

describe("capParticles", () => {
  it("keeps only the most recent particles beyond the cap", () => {
    const many: Particle[] = Array.from({ length: CURSOR_PARTICLE_CAP + 50 }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 1,
      size: 1,
      hue: 30,
    }));
    expect(capParticles(many)).toHaveLength(CURSOR_PARTICLE_CAP);
  });

  it("leaves a small array untouched", () => {
    const few: Particle[] = [
      { x: 0, y: 0, vx: 0, vy: 0, life: 1, size: 1, hue: 30 },
    ];
    expect(capParticles(few)).toHaveLength(1);
  });
});

describe("cursorEffectsEnabled", () => {
  function fakeWindow(matches: Record<string, boolean>): Window {
    return {
      matchMedia: (query: string) => ({ matches: matches[query] ?? false }),
    } as unknown as Window;
  }

  it("is enabled for a fine pointer with motion allowed", () => {
    const win = fakeWindow({
      "(prefers-reduced-motion: reduce)": false,
      "(pointer: fine)": true,
    });
    expect(cursorEffectsEnabled(win)).toBe(true);
  });

  it("is disabled under reduced motion", () => {
    const win = fakeWindow({
      "(prefers-reduced-motion: reduce)": true,
      "(pointer: fine)": true,
    });
    expect(cursorEffectsEnabled(win)).toBe(false);
  });

  it("is disabled for a coarse (touch) pointer", () => {
    const win = fakeWindow({
      "(prefers-reduced-motion: reduce)": false,
      "(pointer: fine)": false,
    });
    expect(cursorEffectsEnabled(win)).toBe(false);
  });

  it("is disabled when matchMedia is unavailable (e.g. SSR)", () => {
    expect(cursorEffectsEnabled(undefined)).toBe(false);
  });
});
