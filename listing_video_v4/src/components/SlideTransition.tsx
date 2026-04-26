// SlideTransition — like Push but with partial overlap (both layers visible
// simultaneously) and a subtle scale pulse for a "doors opening" feel.
//
// Outgoing: translates fully off-screen + scales 1 → 0.96
// Incoming: translates from 30% offset → 0 + scales 1.04 → 1
//
// The shorter offset (30% vs 100%) means the incoming frame is partially
// visible during the entire transition — creates that warm "here comes the
// next room" feeling rather than a hard shove.
//
// Background is transparent — never paints black/charcoal.

import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, easeOutCubic } from '../easing';

type Direction = 'left' | 'right' | 'up' | 'down';

type Props = {
  children: React.ReactNode;
  /** Direction the new content slides in from. */
  direction: Direction;
  /** Duration in seconds. Default 0.5s. */
  durationSec?: number;
  /** 'out': wrap the outgoing layer | 'in': wrap the incoming layer */
  mode: 'in' | 'out';
};

function getTranslateAndScale(
  direction: Direction,
  mode: 'in' | 'out',
  eased: number
): { transform: string } {
  const scaleOut = 1 - eased * 0.04;           // 1 → 0.96
  const scaleIn = 1.04 - eased * 0.04;         // 1.04 → 1.00

  switch (direction) {
    case 'left': {
      if (mode === 'out') {
        const tx = -eased * 100;
        return { transform: `translateX(${tx.toFixed(3)}vw) scale(${scaleOut.toFixed(4)})` };
      } else {
        // In: starts at 30vw (partial overlap), moves to 0
        const tx = (1 - eased) * 30;
        return { transform: `translateX(${tx.toFixed(3)}vw) scale(${scaleIn.toFixed(4)})` };
      }
    }
    case 'right': {
      if (mode === 'out') {
        const tx = eased * 100;
        return { transform: `translateX(${tx.toFixed(3)}vw) scale(${scaleOut.toFixed(4)})` };
      } else {
        const tx = -(1 - eased) * 30;
        return { transform: `translateX(${tx.toFixed(3)}vw) scale(${scaleIn.toFixed(4)})` };
      }
    }
    case 'up': {
      if (mode === 'out') {
        const ty = -eased * 100;
        return { transform: `translateY(${ty.toFixed(3)}vh) scale(${scaleOut.toFixed(4)})` };
      } else {
        const ty = (1 - eased) * 30;
        return { transform: `translateY(${ty.toFixed(3)}vh) scale(${scaleIn.toFixed(4)})` };
      }
    }
    case 'down': {
      if (mode === 'out') {
        const ty = eased * 100;
        return { transform: `translateY(${ty.toFixed(3)}vh) scale(${scaleOut.toFixed(4)})` };
      } else {
        const ty = -(1 - eased) * 30;
        return { transform: `translateY(${ty.toFixed(3)}vh) scale(${scaleIn.toFixed(4)})` };
      }
    }
  }
}

export const SlideTransition: React.FC<Props> = ({
  children,
  direction,
  durationSec = 0.5,
  mode,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const durationFrames = durationSec * fps;
  const progress = clamp(frame / durationFrames, 0, 1);
  const eased = easeOutCubic(progress);

  const { transform } = getTranslateAndScale(direction, mode, eased);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'transparent',
        transform,
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  );
};
