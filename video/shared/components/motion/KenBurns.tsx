// KenBurns — slow zoom + drift on a still image.
//
// **This is the FALLBACK only.** Picked by motionPresets when no richer
// motion fits the scene. Build agents should prefer ParallaxPhoto, MaskReveal,
// SplitComposition, or PhotoCollage for primary subject scenes.
//
// Kept intentionally minimal — no scrim, no overlays, no copy. Wrap in
// AnimatedInfoCard or KineticText for text. Wrap in SceneTransition for
// in/out treatments.

import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from 'remotion';
import { applyEasing, clamp, EasingName } from './easing';

export type KenBurnsDirection =
  | 'zoom-in-center'
  | 'zoom-in-left'
  | 'zoom-in-right'
  | 'zoom-out-center'
  | 'pan-left'
  | 'pan-right'
  | 'pan-up'
  | 'pan-down';

export type KenBurnsProps = {
  /** Image source. Pass a fully-resolved URL, or use Remotion's staticFile() at the call site. */
  src: string;
  /** Total beat duration in seconds. Animation is normalised over this window. */
  durationSec: number;
  /** Animation pattern. Default 'zoom-in-center'. */
  direction?: KenBurnsDirection;
  /** 0..1 multiplier on the zoom + pan amount. Default 1. */
  intensity?: number;
  /** Easing curve over the beat. Default 'easeInOutCubic' (matches the existing market-report look). */
  easing?: EasingName;
  /** CSS object-position for the underlying photo. Default 'center'. */
  objectPosition?: string;
  /** Optional CSS filter chain (color grade, blur, etc.). */
  filter?: string;
};

export const KenBurns: React.FC<KenBurnsProps> = ({
  src,
  durationSec,
  direction = 'zoom-in-center',
  intensity = 1,
  easing = 'easeInOutCubic',
  objectPosition = 'center',
  filter,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalFrames = Math.max(1, durationSec * fps);
  const t = clamp(frame / totalFrames, 0, 1);
  const eased = applyEasing(t, easing);

  // Zoom amount: 8% of frame, scaled by intensity.
  const ZOOM = 0.08 * intensity;
  // Pan amount: 22 px end-to-end, scaled by intensity.
  const PAN = 22 * intensity;

  let scale = 1;
  let tx = 0;
  let ty = 0;

  switch (direction) {
    case 'zoom-in-center':
      scale = 1 + ZOOM * eased;
      break;
    case 'zoom-in-left':
      scale = 1 + ZOOM * eased;
      tx = PAN * eased;
      break;
    case 'zoom-in-right':
      scale = 1 + ZOOM * eased;
      tx = -PAN * eased;
      break;
    case 'zoom-out-center':
      scale = 1 + ZOOM - ZOOM * eased;
      break;
    case 'pan-left':
      scale = 1 + ZOOM * 0.5;
      tx = PAN * (1 - eased) * 1.6;
      break;
    case 'pan-right':
      scale = 1 + ZOOM * 0.5;
      tx = -PAN * (1 - eased) * 1.6;
      break;
    case 'pan-up':
      scale = 1 + ZOOM * 0.5;
      ty = PAN * (1 - eased) * 1.4;
      break;
    case 'pan-down':
      scale = 1 + ZOOM * 0.5;
      ty = -PAN * (1 - eased) * 1.4;
      break;
  }

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale.toFixed(4)}) translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      >
        <Img
          src={src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition,
            filter,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
