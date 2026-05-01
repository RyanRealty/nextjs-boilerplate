// Standalone transition components.
//
// These are convenience wrappers around `SceneTransition` with the variant
// pre-bound. Existing `listing_video_v4/src/components/CrossfadeTransition`
// (and friends) have nearly the same shape — these versions live in the
// shared library so any pipeline (market-report, weekend-events, etc.) can
// import them without depending on listing_video_v4.
//
// **Hard cuts are banned per project guardrails.** Any scene boundary that
// isn't an explicit pattern interrupt should use one of these.

import React from 'react';
import {
  SceneTransition,
  TransitionVariant,
} from './SceneTransition';
import type { EasingName } from './easing';

export type StandaloneTransitionProps = {
  children: React.ReactNode;
  /** 'in' or 'out' — pairs with Remotion's Sequence-overlap pattern. */
  mode: 'in' | 'out';
  durationSec?: number;
  easing?: EasingName;
};

export type DirectionalTransitionProps = StandaloneTransitionProps & {
  direction: 'left' | 'right' | 'up' | 'down';
};

function dirToVariant(
  base: 'wipe' | 'slide',
  direction: DirectionalTransitionProps['direction'],
): TransitionVariant {
  if (base === 'wipe') {
    return (`wipe-${direction}` as TransitionVariant);
  }
  // slide-push only has one variant; fall back if direction is up/down.
  return 'slide-push';
}

/** Crossfade — opacity 1↔0. Smoothest, simplest, default for most boundaries. */
export const CrossfadeTransition: React.FC<StandaloneTransitionProps> = ({
  children,
  mode,
  durationSec = 0.5,
  easing,
}) => (
  <SceneTransition
    mode={mode}
    variant="crossfade"
    durationSec={durationSec}
    easing={easing}
  >
    {children}
  </SceneTransition>
);

/** Wipe — directional clip-path reveal. */
export const WipeTransition: React.FC<DirectionalTransitionProps> = ({
  children,
  mode,
  direction,
  durationSec = 0.45,
  easing,
}) => (
  <SceneTransition
    mode={mode}
    variant={dirToVariant('wipe', direction)}
    durationSec={durationSec}
    easing={easing}
  >
    {children}
  </SceneTransition>
);

/** Slide — horizontal push (slide-push variant of SceneTransition). */
export const SlideTransition: React.FC<StandaloneTransitionProps> = ({
  children,
  mode,
  durationSec = 0.5,
  easing,
}) => (
  <SceneTransition
    mode={mode}
    variant="slide-push"
    durationSec={durationSec}
    easing={easing}
  >
    {children}
  </SceneTransition>
);

/** Iris — circular reveal/closer. Use for hard register shifts. */
export const IrisTransition: React.FC<StandaloneTransitionProps> = ({
  children,
  mode,
  durationSec = 0.5,
  easing,
}) => (
  <SceneTransition
    mode={mode}
    variant="circle-iris"
    durationSec={durationSec}
    easing={easing}
  >
    {children}
  </SceneTransition>
);

/** Zoom-through — outgoing scales up + fades; incoming scales from small. */
export const ZoomThroughTransition: React.FC<StandaloneTransitionProps> = ({
  children,
  mode,
  durationSec = 0.5,
  easing,
}) => (
  <SceneTransition
    mode={mode}
    variant="zoom-through"
    durationSec={durationSec}
    easing={easing}
  >
    {children}
  </SceneTransition>
);

/** Diagonal wipe — 45° polygon sweep. */
export const DiagonalWipeTransition: React.FC<StandaloneTransitionProps> = ({
  children,
  mode,
  durationSec = 0.5,
  easing,
}) => (
  <SceneTransition
    mode={mode}
    variant="diagonal-wipe"
    durationSec={durationSec}
    easing={easing}
  >
    {children}
  </SceneTransition>
);
