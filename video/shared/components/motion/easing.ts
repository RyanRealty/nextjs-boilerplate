// Shared easing + math helpers for the motion library.
//
// Mirrors the curves already used in listing_video_v4 so animations look
// consistent across the market-report, listing-tour, weekend-events, and
// any future Remotion pipelines that pull from this library.

export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
export const easeOutExpo = (t: number) =>
  t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
export const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export const easeInQuad = (t: number) => t * t;
export const easeInCubic = (t: number) => t * t * t;

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeInOutQuart = (t: number) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

export type EasingName =
  | 'linear'
  | 'easeOutCubic'
  | 'easeOutQuart'
  | 'easeOutExpo'
  | 'easeOutBack'
  | 'easeInQuad'
  | 'easeInCubic'
  | 'easeInOutCubic'
  | 'easeInOutQuart';

export function applyEasing(t: number, name: EasingName): number {
  switch (name) {
    case 'easeOutCubic':
      return easeOutCubic(t);
    case 'easeOutQuart':
      return easeOutQuart(t);
    case 'easeOutExpo':
      return easeOutExpo(t);
    case 'easeOutBack':
      return easeOutBack(t);
    case 'easeInQuad':
      return easeInQuad(t);
    case 'easeInCubic':
      return easeInCubic(t);
    case 'easeInOutCubic':
      return easeInOutCubic(t);
    case 'easeInOutQuart':
      return easeInOutQuart(t);
    case 'linear':
    default:
      return t;
  }
}

/** Spring-config presets matched to the feel each preset implies. */
export const SPRING_PRESETS = {
  /** Snappy, slight overshoot — great for headlines */
  snappy: { damping: 14, stiffness: 180, mass: 1 },
  /** Bouncy — for party/energetic energy */
  bouncy: { damping: 8, stiffness: 200, mass: 1 },
  /** Smooth, no overshoot — for elegant/luxury */
  smooth: { damping: 22, stiffness: 110, mass: 1 },
  /** Aggressive, fast — for sports/action */
  punchy: { damping: 12, stiffness: 260, mass: 1 },
  /** Slow, soft — for outdoor/serene */
  gentle: { damping: 26, stiffness: 80, mass: 1 },
} as const;

export type SpringPresetName = keyof typeof SPRING_PRESETS;

/**
 * Deterministic pseudo-random in [0, 1) seeded by an integer.
 * Used by ParticleOverlay to keep particle positions stable across renders.
 */
export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
