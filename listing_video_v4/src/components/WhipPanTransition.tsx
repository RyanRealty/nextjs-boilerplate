// WhipPanTransition — snap horizontal pan blur.
// Outgoing layer translates rapidly off-screen while horizontal motion blur
// is applied. Incoming layer enters from opposite side with same blur.
//
// Blur peaks at the 50% midpoint (maximum smear feel), and translateX goes
// from 0 → ±100vw (out) or ∓100vw → 0 (in).
//
// Background is transparent — never paints black/charcoal.

import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, easeInOutCubic } from '../easing';

type Props = {
  children: React.ReactNode;
  /** 'lr': motion moves left-to-right (out goes left, in comes right) */
  /** 'rl': motion moves right-to-left (out goes right, in comes left) */
  direction: 'lr' | 'rl';
  /** Duration of the whip pan in seconds. Default 0.3s. */
  durationSec?: number;
  /** 'out': wrap the outgoing layer | 'in': wrap the incoming layer */
  mode: 'in' | 'out';
};

export const WhipPanTransition: React.FC<Props> = ({
  children,
  direction,
  durationSec = 0.3,
  mode,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const durationFrames = durationSec * fps;
  const progress = clamp(frame / durationFrames, 0, 1);
  const eased = easeInOutCubic(progress);

  // Blur: 0 → 20px → 0, peaking at progress 0.5
  const blurT = Math.sin(progress * Math.PI); // 0→1→0 over the transition
  const blurPx = blurT * 20;

  // Translate: depends on mode + direction
  // direction 'lr' = rightward motion: out goes -100vw, in comes from +100vw
  // direction 'rl' = leftward motion:  out goes +100vw, in comes from -100vw
  let translateX: string;

  if (mode === 'out') {
    const sign = direction === 'lr' ? -1 : 1;
    // 0 → sign*100vw
    translateX = `${sign * eased * 100}vw`;
  } else {
    // mode === 'in'
    const sign = direction === 'lr' ? 1 : -1;
    // sign*100vw → 0
    translateX = `${sign * (1 - eased) * 100}vw`;
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'transparent',
        transform: `translateX(${translateX})`,
        filter: blurPx > 0.1 ? `blur(${blurPx.toFixed(2)}px)` : undefined,
        willChange: 'transform, filter',
      }}
    >
      {children}
    </div>
  );
};
