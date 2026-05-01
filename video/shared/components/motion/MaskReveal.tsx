// MaskReveal — animate a CSS clip-path or SVG mask to reveal children.
//
// Children render full-bleed; the mask animates from "hidden" to "fully
// revealed" over `durationSec`. Useful for hero photos, headlines, or any
// scene element that benefits from a confident reveal instead of a soft
// crossfade.
//
// All shapes use clip-path with values in % so they scale to any aspect ratio.

import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { applyEasing, clamp, EasingName } from './easing';

export type MaskShape =
  | 'circle-from-center'
  | 'circle-from-corner'
  | 'curtain-wipe-left'
  | 'curtain-wipe-right'
  | 'curtain-wipe-up'
  | 'curtain-wipe-down'
  | 'diagonal-slash'
  | 'iris-open'
  | 'split-vertical'
  | 'split-horizontal';

export type MaskRevealProps = {
  children: React.ReactNode;
  /** Total reveal duration in seconds. */
  durationSec: number;
  shape?: MaskShape;
  easing?: EasingName;
  /** Reverse the mask — instead of revealing, hide content over `durationSec`. */
  reverse?: boolean;
  /** Optional delay (s) before the reveal starts. Children stay hidden until then. */
  delaySec?: number;
};

function clipPathForShape(shape: MaskShape, t: number): string {
  // t goes 0 (hidden) → 1 (fully revealed).

  switch (shape) {
    case 'circle-from-center': {
      // 0% radius → ~110% radius (oversized so corners are reached).
      const r = (t * 110).toFixed(2);
      return `circle(${r}% at 50% 50%)`;
    }
    case 'circle-from-corner': {
      const r = (t * 160).toFixed(2);
      return `circle(${r}% at 0% 0%)`;
    }
    case 'curtain-wipe-left': {
      // Right side first; left side reveals over time.
      const x = ((1 - t) * 100).toFixed(2);
      return `inset(0% 0% 0% ${x}%)`;
    }
    case 'curtain-wipe-right': {
      const x = ((1 - t) * 100).toFixed(2);
      return `inset(0% ${x}% 0% 0%)`;
    }
    case 'curtain-wipe-up': {
      const y = ((1 - t) * 100).toFixed(2);
      return `inset(${y}% 0% 0% 0%)`;
    }
    case 'curtain-wipe-down': {
      const y = ((1 - t) * 100).toFixed(2);
      return `inset(0% 0% ${y}% 0%)`;
    }
    case 'diagonal-slash': {
      // Polygon swept along a 45° line; at t=0 nothing visible, t=1 full poly.
      // We translate a giant parallelogram across the frame.
      const p = (1 - t) * 200; // shift in % units
      return `polygon(${(-50 + p).toFixed(2)}% 0%, ${(150 + p).toFixed(2)}% 0%, ${(50 + p).toFixed(2)}% 100%, ${(-150 + p).toFixed(2)}% 100%)`;
    }
    case 'iris-open': {
      // Square iris that grows from a slit → full frame. Different feel from
      // circle-from-center; reads as "shutter opens."
      const inset = ((1 - t) * 50).toFixed(2);
      return `inset(${inset}% ${inset}% ${inset}% ${inset}% round 4%)`;
    }
    case 'split-vertical': {
      // Two halves part — left edge moves left, right edge moves right.
      // We use a polygon that's two rectangles meeting in the middle when t=0.
      const half = (50 - t * 50).toFixed(2);
      return `polygon(0% 0%, ${half}% 0%, ${half}% 100%, 0% 100%, 0% 0%, 100% 0%, ${(100 - +half).toFixed(2)}% 0%, ${(100 - +half).toFixed(2)}% 100%, 100% 100%, 100% 0%)`;
    }
    case 'split-horizontal': {
      // Top and bottom strips part to reveal the middle.
      const half = (50 - t * 50).toFixed(2);
      return `polygon(0% 0%, 100% 0%, 100% ${half}%, 0% ${half}%, 0% 100%, 100% 100%, 100% ${(100 - +half).toFixed(2)}%, 0% ${(100 - +half).toFixed(2)}%)`;
    }
  }
}

export const MaskReveal: React.FC<MaskRevealProps> = ({
  children,
  durationSec,
  shape = 'circle-from-center',
  easing = 'easeOutQuart',
  reverse = false,
  delaySec = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalFrames = Math.max(1, durationSec * fps);
  const delayFrames = Math.max(0, delaySec * fps);
  const localFrame = frame - delayFrames;
  const raw = clamp(localFrame / totalFrames, 0, 1);
  const eased = applyEasing(raw, easing);

  const t = reverse ? 1 - eased : eased;
  const clip = clipPathForShape(shape, t);

  return (
    <AbsoluteFill
      style={{
        clipPath: clip,
        WebkitClipPath: clip,
        willChange: 'clip-path',
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
