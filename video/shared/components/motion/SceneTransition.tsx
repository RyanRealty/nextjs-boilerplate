// SceneTransition — wrap an outgoing or incoming scene to apply a transition.
//
// The component pairs with Remotion's <Sequence> overlap pattern: render the
// outgoing scene wrapped in `mode="out"` and the incoming scene wrapped in
// `mode="in"` over the overlap window.
//
// Transition variants:
//   crossfade     — opacity 1↔0 (already exists in listing_video_v4 as a base)
//   wipe-left     — outgoing slides off left, incoming reveals from right
//   wipe-right    — mirror of wipe-left
//   wipe-up       — vertical wipe upward
//   wipe-down     — vertical wipe downward
//   diagonal-wipe — clip-path angle sweep
//   circle-iris   — circular reveal/closer
//   zoom-through  — outgoing scales up + fades; incoming scales from small
//   slide-push    — outgoing pushed off; incoming slides in same direction
//
// Background is intentionally transparent on every variant so the underlying
// Sequence overlap pattern doesn't paint a black flash.

import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { applyEasing, clamp, EasingName } from './easing';

export type TransitionVariant =
  | 'crossfade'
  | 'wipe-left'
  | 'wipe-right'
  | 'wipe-up'
  | 'wipe-down'
  | 'diagonal-wipe'
  | 'circle-iris'
  | 'zoom-through'
  | 'slide-push';

export type SceneTransitionProps = {
  children: React.ReactNode;
  /** 'out': wrap the outgoing scene. 'in': wrap the incoming scene. */
  mode: 'in' | 'out';
  variant?: TransitionVariant;
  /** Total transition duration in seconds. Default 0.5s. */
  durationSec?: number;
  easing?: EasingName;
};

export const SceneTransition: React.FC<SceneTransitionProps> = ({
  children,
  mode,
  variant = 'crossfade',
  durationSec = 0.5,
  easing = 'easeInOutCubic',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalFrames = Math.max(1, durationSec * fps);
  const t = clamp(frame / totalFrames, 0, 1);
  const eased = applyEasing(t, easing);

  // Helpers for wipes — use clip-path so the layer geometry doesn't move
  // (no risk of bg color showing at edges).
  const wipeLeftIn = `inset(0% 0% 0% ${((1 - eased) * 100).toFixed(2)}%)`;
  const wipeLeftOut = `inset(0% ${(eased * 100).toFixed(2)}% 0% 0%)`;
  const wipeRightIn = `inset(0% ${((1 - eased) * 100).toFixed(2)}% 0% 0%)`;
  const wipeRightOut = `inset(0% 0% 0% ${(eased * 100).toFixed(2)}%)`;
  const wipeUpIn = `inset(${((1 - eased) * 100).toFixed(2)}% 0% 0% 0%)`;
  const wipeUpOut = `inset(0% 0% ${(eased * 100).toFixed(2)}% 0%)`;
  const wipeDownIn = `inset(0% 0% ${((1 - eased) * 100).toFixed(2)}% 0%)`;
  const wipeDownOut = `inset(${(eased * 100).toFixed(2)}% 0% 0% 0%)`;

  let style: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: 'transparent',
    willChange: 'transform, opacity, clip-path',
  };

  switch (variant) {
    case 'crossfade': {
      const op = mode === 'in' ? eased : 1 - eased;
      style = { ...style, opacity: op };
      break;
    }

    case 'wipe-left': {
      const c = mode === 'in' ? wipeLeftIn : wipeLeftOut;
      style = { ...style, clipPath: c, WebkitClipPath: c };
      break;
    }
    case 'wipe-right': {
      const c = mode === 'in' ? wipeRightIn : wipeRightOut;
      style = { ...style, clipPath: c, WebkitClipPath: c };
      break;
    }
    case 'wipe-up': {
      const c = mode === 'in' ? wipeUpIn : wipeUpOut;
      style = { ...style, clipPath: c, WebkitClipPath: c };
      break;
    }
    case 'wipe-down': {
      const c = mode === 'in' ? wipeDownIn : wipeDownOut;
      style = { ...style, clipPath: c, WebkitClipPath: c };
      break;
    }

    case 'diagonal-wipe': {
      // 45-degree sweep using a polygon. Incoming reveals from top-left to
      // bottom-right; outgoing fades behind the moving edge.
      const p = (1 - eased) * 200;
      const polyIn = `polygon(0% 0%, ${(0 + (eased * 200)).toFixed(2)}% 0%, ${(eased * 200 - 100).toFixed(2)}% 100%, 0% 100%)`;
      const polyOut = `polygon(${(p).toFixed(2)}% 0%, 100% 0%, 100% 100%, ${(p - 100).toFixed(2)}% 100%)`;
      const c = mode === 'in' ? polyIn : polyOut;
      style = { ...style, clipPath: c, WebkitClipPath: c };
      break;
    }

    case 'circle-iris': {
      // Incoming: 0 → 110% radius. Outgoing: 110 → 0.
      const r = mode === 'in' ? eased * 110 : (1 - eased) * 110;
      const c = `circle(${r.toFixed(2)}% at 50% 50%)`;
      style = { ...style, clipPath: c, WebkitClipPath: c };
      break;
    }

    case 'zoom-through': {
      if (mode === 'out') {
        // Outgoing scales up while fading.
        const sc = 1 + eased * 0.6;
        style = { ...style, transform: `scale(${sc.toFixed(4)})`, opacity: 1 - eased };
      } else {
        // Incoming starts small + faded, scales in.
        const sc = 0.6 + eased * 0.4;
        style = { ...style, transform: `scale(${sc.toFixed(4)})`, opacity: eased };
      }
      break;
    }

    case 'slide-push': {
      // Both layers move in the same direction; outgoing exits left, incoming
      // enters from the right.
      if (mode === 'out') {
        style = { ...style, transform: `translateX(${(-eased * 100).toFixed(2)}vw)` };
      } else {
        style = { ...style, transform: `translateX(${((1 - eased) * 100).toFixed(2)}vw)` };
      }
      break;
    }
  }

  return <div style={style}>{children}</div>;
};
