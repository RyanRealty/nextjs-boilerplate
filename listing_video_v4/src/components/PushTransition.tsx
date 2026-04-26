// PushTransition — orderly slide where the outgoing layer is pushed off one
// direction while the incoming layer slides in from the opposite.
// No blur — clean architectural push, like a horizontal carousel.
//
// Background is transparent — never paints black/charcoal.

import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, easeInOutCubic } from '../easing';

type Direction = 'left' | 'right' | 'up' | 'down';

type Props = {
  children: React.ReactNode;
  /** Direction the content moves. 'left' = content exits/enters from the left axis. */
  direction: Direction;
  /** Duration in seconds. Default 0.4s. */
  durationSec?: number;
  /** 'out': wrap the outgoing layer | 'in': wrap the incoming layer */
  mode: 'in' | 'out';
};

function getTranslate(direction: Direction, mode: 'in' | 'out', eased: number): string {
  // Out: content travels from 0 → off-screen in the named direction
  // In:  content travels from off-screen (opposite) → 0
  switch (direction) {
    case 'left': {
      // left: outgoing exits to -x (left), incoming enters from +x (right)
      const tx = mode === 'out' ? -eased * 100 : (1 - eased) * 100;
      return `translateX(${tx.toFixed(3)}vw)`;
    }
    case 'right': {
      // right: outgoing exits to +x, incoming enters from -x
      const tx = mode === 'out' ? eased * 100 : -(1 - eased) * 100;
      return `translateX(${tx.toFixed(3)}vw)`;
    }
    case 'up': {
      // up: outgoing exits to -y (up), incoming enters from +y (below)
      const ty = mode === 'out' ? -eased * 100 : (1 - eased) * 100;
      return `translateY(${ty.toFixed(3)}vh)`;
    }
    case 'down': {
      // down: outgoing exits to +y, incoming enters from -y
      const ty = mode === 'out' ? eased * 100 : -(1 - eased) * 100;
      return `translateY(${ty.toFixed(3)}vh)`;
    }
  }
}

export const PushTransition: React.FC<Props> = ({
  children,
  direction,
  durationSec = 0.4,
  mode,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const durationFrames = durationSec * fps;
  const progress = clamp(frame / durationFrames, 0, 1);
  const eased = easeInOutCubic(progress);

  const translate = getTranslate(direction, mode, eased);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'transparent',
        transform: translate,
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  );
};
