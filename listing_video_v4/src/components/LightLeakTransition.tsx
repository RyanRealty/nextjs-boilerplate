// LightLeakTransition — warm orange/gold flash mimicking analog film light leak.
// Renders an absolutely positioned overlay with a radial gradient that blooms
// in over the first 50% of the duration and fades out over the second 50%.
//
// CRITICAL: this overlay is additive/luminous — it NEVER goes to pure white or
// pure black. Peak opacity is 0.55 max so dark-source frames stay luminous warm,
// not clipped. Background is always transparent so the Sequence overlap pattern
// underneath continues to show through.

import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, easeInOutCubic } from '../easing';

type Intensity = 'subtle' | 'medium' | 'strong';

type Props = {
  /** Duration of the light leak in seconds. Default 0.35s. */
  durationSec?: number;
  /** Position of the radial gradient hotspot. Default '50% 30%'. */
  position?: { x: string; y: string };
  /** Controls peak opacity. subtle=0.35 medium=0.55 strong=0.72 */
  intensity?: Intensity;
};

const PEAK_OPACITY: Record<Intensity, number> = {
  subtle: 0.35,
  medium: 0.55,
  strong: 0.72,
};

export const LightLeakTransition: React.FC<Props> = ({
  durationSec = 0.35,
  position = { x: '50%', y: '30%' },
  intensity = 'medium',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const durationFrames = durationSec * fps;
  const progress = clamp(frame / durationFrames, 0, 1);

  // Bloom in over first 50%, fade out over second 50%
  let t: number;
  if (progress <= 0.5) {
    t = easeInOutCubic(progress / 0.5);
  } else {
    t = easeInOutCubic(1 - (progress - 0.5) / 0.5);
  }

  const peakOpacity = PEAK_OPACITY[intensity];
  const opacity = t * peakOpacity;

  const gradient = `radial-gradient(ellipse 70% 60% at ${position.x} ${position.y}, #FFB070 0%, rgba(255, 160, 60, 0.6) 30%, rgba(255, 120, 20, 0.15) 65%, transparent 100%)`;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'transparent',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: gradient,
          opacity,
          filter: 'blur(8px)',
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
