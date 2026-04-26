// News-clip shared primitives — animated counter, bar chart, comparison cards,
// arrow, source line, brand outro. Used by the three news comps under
// listing_video_v4/src/news/.
//
// Brand rules from VIDEO_PRODUCTION_SKILL.md Section 5:
//   - Charcoal/cream/gold body palette. Navy ONLY for the outro card.
//   - Source attribution lives on-screen for every cited stat (small caps,
//     bottom-anchored).
//   - Phone/IG/web NEVER in video frame for viral cuts (these are news-style
//     so the brand card outro IS allowed per Matt's spec).

import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { CHARCOAL, CREAM, GOLD, NAVY, FONT_BODY, FONT_SERIF } from '../brand';
import { clamp, easeOutCubic, easeOutQuart, easeInOutCubic } from '../easing';

// ─── AnimatedCounter ──────────────────────────────────────────────────────
// Counts from `from` to `to` over `durationSec`. Format function controls the
// rendered string (e.g. dollars, percent, plain number with thousands).
type CounterProps = {
  from: number;
  to: number;
  startFrame: number;
  durationFrames: number;
  format: (v: number) => string;
  style?: React.CSSProperties;
};

export const AnimatedCounter: React.FC<CounterProps> = ({
  from,
  to,
  startFrame,
  durationFrames,
  format,
  style,
}) => {
  const frame = useCurrentFrame();
  const localF = frame - startFrame;
  const t = clamp(localF / durationFrames, 0, 1);
  const eased = easeOutCubic(t);
  const value = from + (to - from) * eased;
  return <span style={style}>{format(value)}</span>;
};

// ─── ScrimText ────────────────────────────────────────────────────────────
// Headline text block with fade+rise entry. Lives in the 900×1400 safe zone
// (90 px margin every edge per master skill Section 1).
type ScrimTextProps = {
  text: string;
  startFrame: number;
  riseFrames?: number;
  style?: React.CSSProperties;
  maxWidth?: number;
  position?: 'top' | 'center' | 'upper-third' | 'lower-third';
};

export const ScrimText: React.FC<ScrimTextProps> = ({
  text,
  startFrame,
  riseFrames = 12,
  style,
  maxWidth = 900,
  position = 'center',
}) => {
  const frame = useCurrentFrame();
  const localF = frame - startFrame;
  const t = clamp(localF / riseFrames, 0, 1);
  const alpha = easeOutCubic(t);
  const ty = (1 - easeOutQuart(t)) * 26;
  const top =
    position === 'top'
      ? '14%'
      : position === 'upper-third'
      ? '30%'
      : position === 'lower-third'
      ? '64%'
      : '50%';
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top,
        transform: `translate(-50%, calc(-50% + ${ty}px))`,
        opacity: alpha,
        maxWidth,
        textAlign: 'center',
        ...style,
      }}
    >
      {text}
    </div>
  );
};

// ─── SourceLine ───────────────────────────────────────────────────────────
// Tiny attribution line at the bottom of frame. Required for every cited stat
// per CLAUDE.md data accuracy rule.
type SourceLineProps = {
  text: string;
  startFrame: number;
};

export const SourceLine: React.FC<SourceLineProps> = ({ text, startFrame }) => {
  const frame = useCurrentFrame();
  const localF = frame - startFrame;
  const alpha = clamp(localF / 9, 0, 1);
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 90,
        left: 90,
        right: 90,
        textAlign: 'center',
        opacity: alpha * 0.78,
        fontFamily: FONT_BODY,
        fontWeight: 500,
        fontSize: 22,
        color: 'rgba(242, 235, 221, 0.85)',
        letterSpacing: 1.6,
        textTransform: 'uppercase',
      }}
    >
      Source: {text}
    </div>
  );
};

// ─── ComparisonBar ────────────────────────────────────────────────────────
// Horizontal bar that fills from 0 to a percentage, with the city name on the
// left and the percent value on the right. Negative values render in red,
// positive in cool green.
type ComparisonBarProps = {
  label: string;
  pct: number; // -100 to +100
  startFrame: number;
  growthFrames?: number;
  scale?: number; // px per percentage point — controls bar width
  yOffset: number; // px from center vertical
};

export const ComparisonBar: React.FC<ComparisonBarProps> = ({
  label,
  pct,
  startFrame,
  growthFrames = 22,
  scale = 24,
  yOffset,
}) => {
  const frame = useCurrentFrame();
  const localF = frame - startFrame;
  const t = clamp(localF / growthFrames, 0, 1);
  const eased = easeOutCubic(t);
  const animatedPct = pct * eased;
  const width = Math.abs(animatedPct) * scale;
  const isNegative = pct < 0;
  const barColor = isNegative ? '#D85B5B' : '#5BB47A';
  const valueColor = isNegative ? '#E07474' : '#73C58E';
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: `calc(50% + ${yOffset}px)`,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        width: 880,
      }}
    >
      <div
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 700,
          fontSize: 38,
          color: CREAM,
          letterSpacing: 2.2,
          textTransform: 'uppercase',
          width: 320,
          textAlign: 'right',
          opacity: clamp(localF / 8, 0, 1),
        }}
      >
        {label}
      </div>
      <div
        style={{
          flex: 1,
          height: 28,
          position: 'relative',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 6,
          overflow: 'visible',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${width}px`,
            background: barColor,
            borderRadius: 6,
            boxShadow: `0 0 18px ${barColor}55`,
          }}
        />
      </div>
      <div
        style={{
          fontFamily: FONT_SERIF,
          fontWeight: 700,
          fontSize: 46,
          color: valueColor,
          width: 160,
          textAlign: 'left',
          opacity: clamp(localF / 8, 0, 1),
        }}
      >
        {pct > 0 ? '+' : ''}
        {animatedPct.toFixed(1)}%
      </div>
    </div>
  );
};

// ─── AnimatedArrow ────────────────────────────────────────────────────────
// SVG arrow that draws upward (or downward) with a stroke animation.
type AnimatedArrowProps = {
  startFrame: number;
  drawFrames?: number;
  direction?: 'up' | 'down';
  color?: string;
  size?: number;
  x: string;
  y: string;
};

export const AnimatedArrow: React.FC<AnimatedArrowProps> = ({
  startFrame,
  drawFrames = 18,
  direction = 'up',
  color = GOLD,
  size = 220,
  x,
  y,
}) => {
  const frame = useCurrentFrame();
  const localF = frame - startFrame;
  const t = clamp(localF / drawFrames, 0, 1);
  const eased = easeInOutCubic(t);
  const length = 320;
  const dashOffset = length * (1 - eased);
  const headOpacity = clamp((localF - drawFrames * 0.7) / 8, 0, 1);
  const points =
    direction === 'up'
      ? { y1: 200, y2: 30, headY: [60, 30, 90] }
      : { y1: 30, y2: 200, headY: [170, 200, 140] };
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <svg viewBox="0 0 240 240" width="100%" height="100%">
        <line
          x1="120"
          y1={points.y1}
          x2="120"
          y2={points.y2}
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={dashOffset}
        />
        <polyline
          points={`80,${points.headY[0]} 120,${points.headY[1]} 160,${points.headY[2]}`}
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={headOpacity}
        />
      </svg>
    </div>
  );
};

// ─── BackgroundPhoto ──────────────────────────────────────────────────────
// Full-bleed photo background with darken overlay, slow ken-burns push, and
// optional vignette. Used for the localize/lifestyle beats.
type BackgroundPhotoProps = {
  src: string;
  startFrame: number;
  durationFrames: number;
  darken?: number; // 0–1
};

export const BackgroundPhoto: React.FC<BackgroundPhotoProps> = ({
  src,
  startFrame,
  durationFrames,
  darken = 0.55,
}) => {
  const frame = useCurrentFrame();
  const localF = frame - startFrame;
  const t = clamp(localF / durationFrames, 0, 1);
  const scale = 1.04 + 0.06 * easeInOutCubic(t);
  const alpha = clamp(localF / 12, 0, 1) * (1 - clamp((localF - (durationFrames - 12)) / 12, 0, 1));
  return (
    <>
      <Img
        src={staticFile(`images/${src}`)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale.toFixed(4)})`,
          transformOrigin: '50% 50%',
          opacity: alpha,
          filter: 'sepia(0.05) saturate(1.05) brightness(0.95) contrast(1.05)',
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,${darken * 0.6}) 30%, rgba(0,0,0,${darken}) 100%)`,
          opacity: alpha,
        }}
      />
    </>
  );
};

// ─── BrandOutroCard ───────────────────────────────────────────────────────
// Closing 2-3s navy card with stacked logo + tagline. Per Matt's spec the
// brand card IS allowed for news clips (different content type than viral
// listing reels).
type BrandOutroProps = {
  startFrame: number;
};

export const BrandOutroCard: React.FC<BrandOutroProps> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const localF = frame - startFrame;
  const navyAlpha = clamp(localF / 9, 0, 1);
  const logoAlpha = clamp((localF - 6) / 14, 0, 1);
  const logoScale = 0.96 + 0.04 * easeOutCubic(clamp((localF - 6) / 18, 0, 1));
  const tagAlpha = clamp((localF - 18) / 14, 0, 1);
  return (
    <AbsoluteFill style={{ background: NAVY, opacity: navyAlpha }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Img
          src={staticFile('brand/stacked_logo_white.png')}
          style={{
            width: 480,
            height: 'auto',
            opacity: logoAlpha,
            transform: `scale(${logoScale.toFixed(4)})`,
            marginBottom: 48,
          }}
        />
        <div
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 700,
            fontSize: 30,
            color: GOLD,
            letterSpacing: 4,
            textTransform: 'uppercase',
            opacity: tagAlpha,
          }}
        >
          Bend / Central Oregon
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── DarkBackdrop ─────────────────────────────────────────────────────────
// Charcoal-with-warm-grain backdrop used for stat-only beats. Subtle radial
// gradient + film grain dots.
export const DarkBackdrop: React.FC = () => (
  <>
    <AbsoluteFill style={{ background: CHARCOAL }} />
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse at 50% 30%, rgba(200,168,100,0.08) 0%, transparent 60%), radial-gradient(ellipse at 50% 80%, rgba(255,235,200,0.04) 0%, transparent 60%)',
      }}
    />
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(circle at 20% 30%, rgba(255,235,200,0.025) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,235,200,0.018) 0%, transparent 50%)',
        mixBlendMode: 'overlay',
        opacity: 0.7,
      }}
    />
  </>
);
