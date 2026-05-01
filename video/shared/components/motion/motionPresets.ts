// motionPresets — energy-tag → motion-combo mappings.
//
// Build agents that scaffold scenes from data should look up a preset by
// scene-energy tag and apply the recommended primary motion + text variant +
// transition + particle overlay.
//
// Ken Burns is the FALLBACK only — it sits behind the `default` preset and is
// only reached when no richer preset matches.
//
// Preset shape:
//   {
//     primary:    { kind, ...config }      — the photo / hero motion
//     text:       { variant, spring, ... } — KineticText config for headlines
//     transition: { variant, ... }         — SceneTransition for in/out
//     particles?: { preset, ... }          — optional ParticleOverlay
//     accent?:    string                   — accent color override
//   }

import type { KineticVariant } from './KineticText';
import type { TransitionVariant } from './SceneTransition';
import type { ParticlePreset } from './ParticleOverlay';
import type { ParallaxDirection } from './ParallaxPhoto';
import type { MaskShape } from './MaskReveal';
import type { KenBurnsDirection } from './KenBurns';
import type { SpringPresetName, EasingName } from './easing';

export type SceneEnergy =
  | 'party'
  | 'elegant'
  | 'sports'
  | 'outdoor'
  | 'food'
  | 'family'
  | 'arts'
  | 'music'
  | 'holiday'
  | 'business'
  | 'data'
  | 'listing-luxury'
  | 'listing-standard'
  | 'default';

export type PrimaryMotion =
  | { kind: 'parallax'; direction: ParallaxDirection; intensity?: number; easing?: EasingName }
  | { kind: 'mask-reveal'; shape: MaskShape; easing?: EasingName }
  | { kind: 'split'; mode: 'left-right' | 'right-left' | 'vertical-split' | 'vertical-split-reverse' | 'diagonal-split' }
  | { kind: 'collage'; layout: 'grid' | 'carousel' }
  | { kind: 'ken-burns'; direction: KenBurnsDirection; intensity?: number };

export type MotionPreset = {
  /** Primary photo / scene motion. */
  primary: PrimaryMotion;
  /** Headline text entrance. */
  text: {
    variant: KineticVariant;
    spring?: SpringPresetName;
    durationSec?: number;
    easing?: EasingName;
  };
  /** Transition wrapper used at scene in/out. */
  transition: {
    variant: TransitionVariant;
    durationSec?: number;
    easing?: EasingName;
  };
  /** Optional particles layer. */
  particles?: {
    preset: ParticlePreset;
    intensity?: number;
    count?: number;
  };
  /** Accent color override (defaults to brand gold if omitted). */
  accent?: string;
  /** One-line note describing the intended feel. */
  note?: string;
};

export const motionPresets: Record<SceneEnergy, MotionPreset> = {
  party: {
    primary: { kind: 'mask-reveal', shape: 'iris-open', easing: 'easeOutBack' },
    text: { variant: 'spring-bounce', spring: 'bouncy', durationSec: 0.7 },
    transition: { variant: 'circle-iris', durationSec: 0.45 },
    particles: { preset: 'confetti', intensity: 1 },
    note: 'High-energy reveal + tumbling confetti + bouncy text. Use for festivals, brewery events, holiday parties.',
  },

  elegant: {
    primary: { kind: 'parallax', direction: 'push-in', intensity: 0.85, easing: 'easeInOutCubic' },
    text: { variant: 'fade-slide-up', durationSec: 0.7, easing: 'easeOutQuart' },
    transition: { variant: 'crossfade', durationSec: 0.5 },
    particles: { preset: 'floating-lights', intensity: 0.75 },
    accent: '#D4AF37',
    note: 'Soft 2.5D push + bokeh lights + understated copy. For luxury listings, gallery openings, fine-dining features.',
  },

  sports: {
    primary: { kind: 'mask-reveal', shape: 'diagonal-slash', easing: 'easeOutExpo' },
    text: { variant: 'slide-left', durationSec: 0.4, easing: 'easeOutExpo' },
    transition: { variant: 'wipe-right', durationSec: 0.35 },
    particles: { preset: 'speed-lines', intensity: 0.9 },
    note: 'Aggressive diagonal slash + speed lines. For game-day, race events, athletic features.',
  },

  outdoor: {
    primary: { kind: 'parallax', direction: 'pan-right', intensity: 1, easing: 'easeInOutCubic' },
    text: { variant: 'scale-from-center', spring: 'gentle', durationSec: 0.7 },
    transition: { variant: 'zoom-through', durationSec: 0.5 },
    note: 'Wide parallax pan + gentle scale text + zoom transitions. For hikes, parks, outdoor recreation.',
  },

  food: {
    primary: { kind: 'split', mode: 'left-right' },
    text: { variant: 'fade-slide-up', durationSec: 0.55 },
    transition: { variant: 'wipe-up', durationSec: 0.4 },
    particles: { preset: 'sparkle', intensity: 0.5 },
    note: 'Side-by-side photo + info panel; subtle sparkle. For restaurant openings, food-truck features.',
  },

  family: {
    primary: { kind: 'collage', layout: 'grid' },
    text: { variant: 'split-chars', spring: 'snappy', durationSec: 0.6 },
    transition: { variant: 'crossfade', durationSec: 0.5 },
    note: 'Photo grid + character-by-character headline. For family events, kid-focused activities.',
  },

  arts: {
    primary: { kind: 'mask-reveal', shape: 'curtain-wipe-left', easing: 'easeInOutQuart' },
    text: { variant: 'fade-slide-up', durationSec: 0.7, easing: 'easeOutQuart' },
    transition: { variant: 'wipe-left', durationSec: 0.5 },
    particles: { preset: 'sparkle', intensity: 0.4 },
    note: 'Theater-curtain reveal + sparkle. For gallery openings, theater nights, museum events.',
  },

  music: {
    primary: { kind: 'parallax', direction: 'push-in', intensity: 1.1 },
    text: { variant: 'spring-bounce', spring: 'punchy', durationSec: 0.5 },
    transition: { variant: 'circle-iris', durationSec: 0.4 },
    particles: { preset: 'confetti', intensity: 0.6 },
    note: 'Hard push-in on the artist photo + punchy headline + iris transition. For concerts, music festivals.',
  },

  holiday: {
    primary: { kind: 'mask-reveal', shape: 'circle-from-center', easing: 'easeOutBack' },
    text: { variant: 'spring-bounce', spring: 'bouncy', durationSec: 0.6 },
    transition: { variant: 'crossfade', durationSec: 0.5 },
    particles: { preset: 'snow', intensity: 1 },
    note: 'Iris reveal + falling snow + bouncy headline. For holiday markets, tree-lightings, winter festivals.',
  },

  business: {
    primary: { kind: 'split', mode: 'left-right' },
    text: { variant: 'fade-slide-up', durationSec: 0.6, easing: 'easeOutCubic' },
    transition: { variant: 'wipe-down', durationSec: 0.4 },
    note: 'Clean split layout, fade-slide text, structured wipe. For business openings, networking events.',
  },

  data: {
    primary: { kind: 'mask-reveal', shape: 'split-vertical', easing: 'easeInOutCubic' },
    text: { variant: 'typewriter', durationSec: 1.0 },
    transition: { variant: 'wipe-up', durationSec: 0.4 },
    note: 'Vertical split reveal + typewriter for stat callouts. Use sparingly — high-info scenes only.',
  },

  'listing-luxury': {
    primary: { kind: 'parallax', direction: 'push-in', intensity: 1, easing: 'easeInOutCubic' },
    text: { variant: 'fade-slide-up', durationSec: 0.7, easing: 'easeOutQuart' },
    transition: { variant: 'crossfade', durationSec: 0.5 },
    particles: { preset: 'floating-lights', intensity: 0.55 },
    accent: '#C8A864',
    note: 'Layer-mode parallax (depthDir required) + champagne lights. Pair with depth-cut photos.',
  },

  'listing-standard': {
    primary: { kind: 'parallax', direction: 'pan-right', intensity: 0.9 },
    text: { variant: 'fade-slide-up', durationSec: 0.55 },
    transition: { variant: 'crossfade', durationSec: 0.4 },
    note: 'Fake-mode parallax (no depth map) + clean text. Default for listings without MiDaS layer cuts.',
  },

  default: {
    primary: { kind: 'ken-burns', direction: 'zoom-in-center', intensity: 1 },
    text: { variant: 'fade-slide-up', durationSec: 0.55 },
    transition: { variant: 'crossfade', durationSec: 0.4 },
    note: 'FALLBACK ONLY. Ken Burns + fade-slide. Pick a richer preset whenever possible.',
  },
};

/**
 * Look up a preset by scene-energy tag, falling back to `default` (Ken Burns)
 * when the tag is unknown. Build agents should always pass a tag — the
 * fallback exists for safety, not for routine use.
 */
export function getMotionPreset(energy: SceneEnergy | string | undefined): MotionPreset {
  if (!energy) return motionPresets.default;
  if ((energy as SceneEnergy) in motionPresets) {
    return motionPresets[energy as SceneEnergy];
  }
  return motionPresets.default;
}

/** Energies that the build agent should preferentially pick before falling back. */
export const RICH_ENERGIES: SceneEnergy[] = [
  'party',
  'elegant',
  'sports',
  'outdoor',
  'food',
  'family',
  'arts',
  'music',
  'holiday',
  'business',
  'data',
  'listing-luxury',
  'listing-standard',
];
