// SplitComposition — layout primitive that puts a photo on one side and an
// info panel on the other. The split line itself can animate in (sweep,
// reveal, or static).
//
// Children:
//   <SplitComposition.Photo /> — the visual side
//   <SplitComposition.Panel /> — the info-card side
//
// Or you can pass `photo` and `panel` props directly. Prop form is preferred
// for simple cases; child form is preferred when you need finer control.

import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { applyEasing, clamp, EasingName } from './easing';

export type SplitMode =
  | 'left-right'
  | 'right-left'
  | 'vertical-split'   // photo on top, panel on bottom
  | 'vertical-split-reverse' // panel on top, photo on bottom
  | 'diagonal-split';

export type SplitCompositionProps = {
  /** Photo side content (Img, ParallaxPhoto, KenBurns, etc.). */
  photo: React.ReactNode;
  /** Info-card side content (KineticText, AnimatedInfoCard, etc.). */
  panel: React.ReactNode;
  mode?: SplitMode;
  /** Photo:panel ratio 0..1. Default 0.55 (55% photo, 45% panel). */
  photoRatio?: number;
  /** Animate the split line in over `splitAnimationSec`. Default 0.5s. Set to 0 for static. */
  splitAnimationSec?: number;
  easing?: EasingName;
  /** Color of the split divider. Default brand gold. */
  dividerColor?: string;
  /** Width (px) of the split divider. Default 4. */
  dividerWidth?: number;
  /** Background fill behind the panel. Default semi-transparent navy. */
  panelBackground?: string;
};

const DEFAULT_GOLD = '#D4AF37';
const DEFAULT_PANEL_BG = 'rgba(16,39,66,0.92)';

export const SplitComposition: React.FC<SplitCompositionProps> = ({
  photo,
  panel,
  mode = 'left-right',
  photoRatio = 0.55,
  splitAnimationSec = 0.5,
  easing = 'easeInOutCubic',
  dividerColor = DEFAULT_GOLD,
  dividerWidth = 4,
  panelBackground = DEFAULT_PANEL_BG,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const ratio = clamp(photoRatio, 0.15, 0.85);

  const animFrames = Math.max(1, splitAnimationSec * fps);
  const t = splitAnimationSec > 0 ? clamp(frame / animFrames, 0, 1) : 1;
  const eased = applyEasing(t, easing);

  // ─── Diagonal split (special case) ──────────────────────────────────────
  if (mode === 'diagonal-split') {
    // Photo fills full frame; panel is a diagonal slab from bottom-right.
    // The slab's clip-path animates in.
    const x1 = 100 - eased * 100; // 100% → 0%
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <AbsoluteFill>{photo}</AbsoluteFill>
        <AbsoluteFill
          style={{
            background: panelBackground,
            clipPath: `polygon(${x1.toFixed(2)}% 100%, 100% 100%, 100% 0%, ${(x1 + 35).toFixed(2)}% 0%)`,
            WebkitClipPath: `polygon(${x1.toFixed(2)}% 100%, 100% 100%, 100% 0%, ${(x1 + 35).toFixed(2)}% 0%)`,
          }}
        />
        <AbsoluteFill
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '6% 6%',
            opacity: eased,
            pointerEvents: 'none',
          }}
        >
          <div style={{ width: '40%' }}>{panel}</div>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  // ─── Vertical splits ────────────────────────────────────────────────────
  if (mode === 'vertical-split' || mode === 'vertical-split-reverse') {
    const reversed = mode === 'vertical-split-reverse';
    const photoPct = ratio * 100;
    const panelPct = 100 - photoPct;
    const dividerY = reversed ? panelPct : photoPct;

    const photoStyle: React.CSSProperties = {
      position: 'absolute',
      left: 0,
      right: 0,
      top: reversed ? `${panelPct}%` : 0,
      height: `${photoPct}%`,
      overflow: 'hidden',
      transform: `translateY(${(reversed ? -1 : 1) * (1 - eased) * 8}%)`,
    };
    const panelStyle: React.CSSProperties = {
      position: 'absolute',
      left: 0,
      right: 0,
      top: reversed ? 0 : `${photoPct}%`,
      height: `${panelPct}%`,
      background: panelBackground,
      transform: `translateY(${(reversed ? 1 : -1) * (1 - eased) * 8}%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4% 6%',
      opacity: eased,
    };
    const dividerStyle: React.CSSProperties = {
      position: 'absolute',
      left: 0,
      right: 0,
      top: `${dividerY}%`,
      height: dividerWidth,
      background: dividerColor,
      transform: `scaleX(${eased.toFixed(4)})`,
      transformOrigin: 'center center',
    };

    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <div style={photoStyle}>{photo}</div>
        <div style={panelStyle}>{panel}</div>
        <div style={dividerStyle} />
      </AbsoluteFill>
    );
  }

  // ─── Horizontal splits (left-right / right-left) ────────────────────────
  const photoOnLeft = mode === 'left-right';
  const photoPct = ratio * 100;
  const panelPct = 100 - photoPct;
  const dividerX = photoOnLeft ? photoPct : panelPct;

  const photoStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: photoOnLeft ? 0 : `${panelPct}%`,
    width: `${photoPct}%`,
    overflow: 'hidden',
    transform: `translateX(${(photoOnLeft ? -1 : 1) * (1 - eased) * 6}%)`,
  };
  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: photoOnLeft ? `${photoPct}%` : 0,
    width: `${panelPct}%`,
    background: panelBackground,
    transform: `translateX(${(photoOnLeft ? 1 : -1) * (1 - eased) * 6}%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6% 4%',
    opacity: eased,
  };
  const dividerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: `${dividerX}%`,
    width: dividerWidth,
    background: dividerColor,
    transform: `scaleY(${eased.toFixed(4)})`,
    transformOrigin: 'center center',
  };

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <div style={photoStyle}>{photo}</div>
      <div style={panelStyle}>{panel}</div>
      <div style={dividerStyle} />
    </AbsoluteFill>
  );
};
