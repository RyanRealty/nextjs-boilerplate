// EmojiReaction — emoji pops anchored to a point on the frame.
//
// Use this on extreme data points (record-high prices, biggest YoY shifts,
// "wow" moments) to draw the eye and inject personality. Pop = scale spring
// from 0 → 1 with slight overshoot, optional rise + fade-out, optional
// ambient float (like a balloon).
//
// Multiple emojis can be stacked or scattered around the anchor point with
// the `count` and `spread` props.

import React from 'react';
import {
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  applyEasing,
  clamp,
  seededRandom,
  SPRING_PRESETS,
  SpringPresetName,
} from './easing';

export type EmojiReactionProps = {
  /** The emoji character(s). Default '🔥'. */
  emoji?: string;
  /** When the pop fires (s into the scene). Default 0. */
  delaySec?: number;
  /** How long the emoji stays on screen (s). Default 1.6. After this it fades out. */
  holdSec?: number;
  /** Fade-out duration (s). Default 0.4. */
  fadeOutSec?: number;
  /** Number of copies to render. Default 1. */
  count?: number;
  /** Spread radius for multi-copy mode (px). Default 80. */
  spread?: number;
  /** Anchor x position in % (relative to parent). Default 50. */
  anchorXPct?: number;
  /** Anchor y position in % (relative to parent). Default 50. */
  anchorYPct?: number;
  /** Pop spring preset. Default 'bouncy'. */
  spring?: SpringPresetName;
  /** Rise distance during the hold (px). Default 24 — subtle balloon float. */
  riseDistance?: number;
  /** Font size (px). Default 96. */
  fontSize?: number;
  /** Random seed for multi-copy positioning. Default 42. */
  seed?: number;
};

export const EmojiReaction: React.FC<EmojiReactionProps> = ({
  emoji = '🔥',
  delaySec = 0,
  holdSec = 1.6,
  fadeOutSec = 0.4,
  count = 1,
  spread = 80,
  anchorXPct = 50,
  anchorYPct = 50,
  spring: springName = 'bouncy',
  riseDistance = 24,
  fontSize = 96,
  seed = 42,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delayFrames = delaySec * fps;
  const holdFrames = holdSec * fps;
  const fadeFrames = fadeOutSec * fps;

  if (frame < delayFrames - 1) {
    return null; // not yet
  }

  const localFrame = frame - delayFrames;

  const items: React.ReactNode[] = [];

  for (let i = 0; i < count; i++) {
    const r1 = seededRandom(seed * 1000 + i * 7);
    const r2 = seededRandom(seed * 1000 + i * 7 + 1);
    const r3 = seededRandom(seed * 1000 + i * 7 + 2);

    // Per-copy delay: small natural stagger.
    const copyDelayFrames = i * 0.06 * fps;
    const copyFrame = Math.max(0, localFrame - copyDelayFrames);

    // Pop spring (0 → 1 with overshoot)
    const s = spring({
      frame: copyFrame,
      fps,
      config: SPRING_PRESETS[springName],
    });
    const popScale = 0.2 + 0.8 * s;

    // Rise during hold
    const riseT = clamp((copyFrame - 0.4 * fps) / Math.max(1, holdFrames - 0.4 * fps), 0, 1);
    const ty = -applyEasing(riseT, 'easeOutCubic') * riseDistance;

    // Fade out after hold
    let fadeOpacity = 1;
    if (copyFrame > holdFrames) {
      fadeOpacity = clamp(1 - (copyFrame - holdFrames) / fadeFrames, 0, 1);
    }

    if (fadeOpacity <= 0.01) continue;

    // Spread offset (only for count > 1)
    let dx = 0;
    let dy = 0;
    if (count > 1) {
      const angle = r1 * Math.PI * 2;
      const dist = (0.4 + r2 * 0.6) * spread;
      dx = Math.cos(angle) * dist;
      dy = Math.sin(angle) * dist;
    }

    // Tiny rotation for natural feel
    const rot = (r3 - 0.5) * 24;

    items.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: `${anchorXPct}%`,
          top: `${anchorYPct}%`,
          transform: `translate(-50%, -50%) translate(${dx.toFixed(2)}px, ${(dy + ty).toFixed(2)}px) scale(${popScale.toFixed(4)}) rotate(${rot.toFixed(2)}deg)`,
          fontSize,
          lineHeight: 1,
          opacity: clamp(s, 0, 1) * fadeOpacity,
          pointerEvents: 'none',
          willChange: 'transform, opacity',
          // Drop shadow gives the emoji "lift" off the photo behind it.
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.45))',
        }}
      >
        {emoji}
      </div>,
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {items}
    </div>
  );
};
