// GradientOverlay — animated gradient background fill.
//
// Solid background color is the most visible "static frame" tell. This
// component fills any rectangular area with a slowly-shifting gradient that
// stays subtle enough not to fight content above it.
//
// Three modes:
//
//   - 'sweep'  : conic gradient slowly rotating around a center point
//   - 'drift'  : linear gradient whose stops drift along the angle
//   - 'pulse'  : radial gradient whose center wobbles
//
// All modes accept arbitrary color stops, durations, and an `intensity`
// multiplier on motion magnitude. Output is a full-bleed AbsoluteFill so it
// composes cleanly under content.

import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export type GradientMode = 'sweep' | 'drift' | 'pulse';

export type GradientOverlayProps = {
  /** Two or more color stops. Default brand navy palette. */
  colors?: string[];
  mode?: GradientMode;
  /** Seconds per full motion loop. Default 12s — slow, ambient. */
  cycleSec?: number;
  /** 0..1 magnitude of motion. Default 1. */
  intensity?: number;
  /** Override blend mode applied over content underneath. */
  blendMode?: React.CSSProperties['mixBlendMode'];
  /** Final opacity (0..1). Default 1 — backgrounds are typically full opacity. */
  opacity?: number;
};

const DEFAULT_COLORS = ['#0A1A2E', '#102742', '#173356', '#0A1A2E'];

export const GradientOverlay: React.FC<GradientOverlayProps> = ({
  colors = DEFAULT_COLORS,
  mode = 'drift',
  cycleSec = 12,
  intensity = 1,
  blendMode,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cycleFrames = Math.max(1, cycleSec * fps);
  const phase = (frame / cycleFrames) % 1; // 0..1 looping

  let background: string;

  switch (mode) {
    case 'sweep': {
      // Conic gradient rotating around the center.
      const deg = phase * 360 * intensity;
      const stopList = colors.map((c, i) => `${c} ${((i / (colors.length - 1)) * 100).toFixed(2)}%`).join(', ');
      background = `conic-gradient(from ${deg.toFixed(2)}deg at 50% 50%, ${stopList})`;
      break;
    }

    case 'pulse': {
      // Radial gradient whose center wobbles.
      const cx = 50 + Math.sin(phase * Math.PI * 2) * 25 * intensity;
      const cy = 50 + Math.cos(phase * Math.PI * 2) * 18 * intensity;
      const stopList = colors.map((c, i) => `${c} ${((i / (colors.length - 1)) * 100).toFixed(2)}%`).join(', ');
      background = `radial-gradient(circle at ${cx.toFixed(2)}% ${cy.toFixed(2)}%, ${stopList})`;
      break;
    }

    case 'drift':
    default: {
      // Linear gradient whose stops slide along its axis.
      const angle = 135 + Math.sin(phase * Math.PI * 2) * 25 * intensity;
      const drift = phase * 30 * intensity; // shift each stop
      const stopList = colors
        .map((c, i) => {
          const base = (i / (colors.length - 1)) * 100;
          const driftPct = (base + drift) % 100;
          return `${c} ${driftPct.toFixed(2)}%`;
        })
        .join(', ');
      background = `linear-gradient(${angle.toFixed(2)}deg, ${stopList})`;
      break;
    }
  }

  return (
    <AbsoluteFill
      style={{
        background,
        opacity,
        mixBlendMode: blendMode,
        pointerEvents: 'none',
      }}
    />
  );
};
