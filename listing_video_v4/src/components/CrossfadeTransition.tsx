// CrossfadeTransition — smoothest, simplest transition.
// Wraps outgoing OR incoming layer and ramps opacity over durationSec.
// Parent background MUST remain transparent (see PhotoBeat v5.6 note) so
// the underlying Sequence overlap pattern works without dark flash.

import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, easeInOutCubic } from '../easing';

type EasingName = 'linear' | 'easeInOut' | 'easeOutCubic';

type Props = {
  children: React.ReactNode;
  /** 'out': fades opacity 1→0 (wrap outgoing layer) */
  /** 'in':  fades opacity 0→1 (wrap incoming layer) */
  mode: 'in' | 'out';
  /** Duration of the crossfade in seconds. Default 0.4s. */
  durationSec?: number;
  easing?: EasingName;
};

function applyEasing(t: number, easingName: EasingName): number {
  switch (easingName) {
    case 'easeInOut':
      return easeInOutCubic(t);
    case 'easeOutCubic':
      return 1 - Math.pow(1 - t, 3);
    case 'linear':
    default:
      return t;
  }
}

export const CrossfadeTransition: React.FC<Props> = ({
  children,
  mode,
  durationSec = 0.4,
  easing = 'easeInOut',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const durationFrames = durationSec * fps;
  const raw = clamp(frame / durationFrames, 0, 1);
  const eased = applyEasing(raw, easing);

  // 'in'  → opacity ramps 0 → 1 as frame progresses
  // 'out' → opacity ramps 1 → 0 as frame progresses
  const opacity = mode === 'in' ? eased : 1 - eased;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity,
        background: 'transparent',
      }}
    >
      {children}
    </div>
  );
};
