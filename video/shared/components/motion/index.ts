// Barrel exports for the shared motion library.
//
// Import from here in any Remotion pipeline:
//
//   import {
//     ParallaxPhoto, MaskReveal, KineticText, SplitComposition,
//     PhotoCollage, ParticleOverlay, SceneTransition, AnimatedInfoCard,
//     KenBurns, GradientOverlay, TextReveal, ScrimLayer, CounterAnimation,
//     EmojiReaction, PIPPresenter, ProgressIndicator, FrameComposer,
//     CrossfadeTransition, WipeTransition, SlideTransition,
//     IrisTransition, ZoomThroughTransition, DiagonalWipeTransition,
//     motionPresets, getMotionPreset,
//   } from '../../shared/components/motion';
//
// (Adjust the relative path to where the importing pipeline lives.)
//
// NEVER pick `KenBurns` or the `default` preset directly when a richer preset
// fits the scene — see motionPresets.ts and README.md for the routing logic.

export { KenBurns } from './KenBurns';
export type { KenBurnsDirection, KenBurnsProps } from './KenBurns';

export { ParallaxPhoto } from './ParallaxPhoto';
export type { ParallaxDirection, ParallaxPhotoProps } from './ParallaxPhoto';

export { MaskReveal } from './MaskReveal';
export type { MaskShape, MaskRevealProps } from './MaskReveal';

export { KineticText } from './KineticText';
export type { KineticVariant, KineticTextProps } from './KineticText';

export { TextReveal } from './TextReveal';
export type { TextRevealProps, TextRevealLine } from './TextReveal';

export { SplitComposition } from './SplitComposition';
export type { SplitMode, SplitCompositionProps } from './SplitComposition';

export { PhotoCollage } from './PhotoCollage';
export type { CollagePhoto, PhotoCollageProps } from './PhotoCollage';

export { ParticleOverlay } from './ParticleOverlay';
export type { ParticlePreset, ParticleOverlayProps } from './ParticleOverlay';

export { SceneTransition } from './SceneTransition';
export type { TransitionVariant, SceneTransitionProps } from './SceneTransition';

export {
  CrossfadeTransition,
  WipeTransition,
  SlideTransition,
  IrisTransition,
  ZoomThroughTransition,
  DiagonalWipeTransition,
} from './transitions';
export type {
  StandaloneTransitionProps,
  DirectionalTransitionProps,
} from './transitions';

export { AnimatedInfoCard } from './AnimatedInfoCard';
export type {
  AnimatedInfoCardProps,
  InfoCardDetail,
  InfoCardPill,
} from './AnimatedInfoCard';

export { GradientOverlay } from './GradientOverlay';
export type { GradientOverlayProps, GradientMode } from './GradientOverlay';

export { ScrimLayer } from './ScrimLayer';
export type { ScrimLayerProps, ScrimDirection } from './ScrimLayer';

export { CounterAnimation } from './CounterAnimation';
export type { CounterAnimationProps } from './CounterAnimation';

export { EmojiReaction } from './EmojiReaction';
export type { EmojiReactionProps } from './EmojiReaction';

export { PIPPresenter } from './PIPPresenter';
export type {
  PIPPresenterProps,
  PIPCorner,
  PIPShape,
  PIPEntrance,
} from './PIPPresenter';

export { ProgressIndicator } from './ProgressIndicator';
export type {
  ProgressIndicatorProps,
  ProgressStyle,
  ProgressPlacement,
} from './ProgressIndicator';

export { FrameComposer, assertFrameComposition } from './FrameComposer';
export type { FrameComposerProps } from './FrameComposer';

export {
  motionPresets,
  getMotionPreset,
  RICH_ENERGIES,
} from './motionPresets';
export type {
  SceneEnergy,
  MotionPreset,
  PrimaryMotion,
} from './motionPresets';

export {
  applyEasing,
  clamp,
  lerp,
  easeOutCubic,
  easeOutQuart,
  easeOutExpo,
  easeOutBack,
  easeInQuad,
  easeInCubic,
  easeInOutCubic,
  easeInOutQuart,
  SPRING_PRESETS,
  seededRandom,
} from './easing';
export type { EasingName, SpringPresetName } from './easing';

// MotionValidator is intentionally NOT re-exported from this index — it's a
// Node-only module used in QA scripts, not a Remotion component. Import it
// directly:
//   import { validateRender } from '.../shared/components/motion/MotionValidator';
