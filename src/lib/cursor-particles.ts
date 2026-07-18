/**
 * Pure particle-system logic for the firelight cursor, kept DOM-free so it can
 * be unit-tested without a canvas. The component (`cursor-glow.tsx`) owns the
 * canvas, the rAF loop, and the pointer listeners; this module only knows how
 * embers are born, move, and die.
 */

export interface Particle {
  x: number;
  y: number;
  /** Velocity per frame, in px. */
  vx: number;
  vy: number;
  /** Remaining life in the range (0, 1]; 0 means dead. */
  life: number;
  /** Draw radius in px. */
  size: number;
  /** Ember hue (warm orange/amber). */
  hue: number;
}

export interface SpawnOptions {
  x: number;
  y: number;
  count: number;
  /** Upper bound on initial speed; a click burst passes a larger value. */
  speed?: number;
}

/** Hard cap on live particles so a frantic mouse can't grow the array unbounded. */
export const CURSOR_PARTICLE_CAP = 400;

function randomBetween(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

/**
 * Create `count` embers at `(x, y)`. Injectable `rng` (defaults to `Math.random`)
 * keeps spawning deterministic under test.
 */
export function spawnParticles(
  { x, y, count, speed = 0.7 }: SpawnOptions,
  rng: () => number = Math.random,
): Particle[] {
  const particles: Particle[] = [];
  for (let index = 0; index < count; index += 1) {
    const angle = randomBetween(0, Math.PI * 2, rng);
    const velocity = randomBetween(0.08, speed, rng);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      // Bias upward so embers drift up like a real firelight.
      vy: Math.sin(angle) * velocity - 0.35,
      life: 1,
      size: randomBetween(1, 3, rng),
      hue: randomBetween(18, 42, rng),
    });
  }
  return particles;
}

/**
 * Advance every particle one frame and drop the dead ones. Embers rise
 * (buoyancy) and slow (drag) as they age. `decay` is life lost per frame.
 */
export function stepParticles(particles: Particle[], decay = 0.022): Particle[] {
  const next: Particle[] = [];
  for (const particle of particles) {
    const life = particle.life - decay;
    if (life <= 0) continue;
    next.push({
      x: particle.x + particle.vx,
      y: particle.y + particle.vy,
      vx: particle.vx * 0.98,
      vy: particle.vy - 0.012,
      life,
      size: particle.size,
      hue: particle.hue,
    });
  }
  return next;
}

/** Keep only the most recent `cap` particles (oldest fall off first). */
export function capParticles(
  particles: Particle[],
  cap: number = CURSOR_PARTICLE_CAP,
): Particle[] {
  return particles.length > cap ? particles.slice(particles.length - cap) : particles;
}

/**
 * Whether the firelight cursor should run at all. Off for users who asked for
 * reduced motion, and off for coarse pointers (touch), where there is no cursor
 * to trail. Returns `false` when media queries aren't available (e.g. SSR).
 */
export function cursorEffectsEnabled(win: Window | undefined = typeof window !== "undefined" ? window : undefined): boolean {
  if (!win || typeof win.matchMedia !== "function") return false;
  const prefersReducedMotion = win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = win.matchMedia("(pointer: fine)").matches;
  return !prefersReducedMotion && finePointer;
}
