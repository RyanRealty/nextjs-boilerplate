// ScrimLayer — configurable dark overlay for text legibility.
//
// Solves the recurring "white text on a busy photo" problem. Drop a
// ScrimLayer between the photo and the text. The scrim defaults to a soft
// bottom-up navy gradient that matches the existing market-report look, but
// every parameter is configurable.
//
// Auto-contrast: pass `autoContrast` and the scrim opacity ramps up over the
// text region as content becomes more transparent — useful when text fades
// in/out and the photo can show through during the entrance.

import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { applyEasing, clamp, EasingName } from './easing';

export type ScrimDirection =
  | 'bottom'
  | 'top'
  | 'left'
  | 'right'
  | 'full'
  | 'radial';

export type ScrimLayerProps = {
  direction?: ScrimDirection;
  /** Peak opacity (0..1). Default 0.78. */
  opacity?: number;
  /** Hex/rgba color of the scrim. Default brand navy. */
  color?: string;
  /** % of the gradient's "dark end" — where opacity is at peak. Default 0%. */
  peakAt?: number;
  /** % at which scrim is fully transparent. Default 60. */
  fadeAt?: number;
  /** Animate the scrim in over `animateInSec` (s). Set 0 for static. Default 0. */
  animateInSec?: number;
  easing?: EasingName;
  /**
   * If true, scrim opacity ramps up over the duration so text that fades in
   * gets more contrast as the photo settles.
   */
  autoContrast?: boolean;
  /** Total scene duration (only used by autoContrast). */
  durationSec?: number;
};

const DEFAULT_NAVY = '16,39,66'; // rgb of #102742

function rgbaFromColor(color: string, alpha: number): string {
  // If the input looks like rgba(... ,a) replace alpha. If it's hex or named
  // we fall back to the default navy with provided alpha — this is meant for
  // the gradient stops, where the only thing that varies is alpha anyway.
  if (color.startsWith('rgba(')) {
    return color.replace(/rgba\(([^)]+)\)/, (_, inner) => {
      const parts = String(inner).split(',').slice(0, 3).map((p) => p.trim());
      return `rgba(${parts.join(',')},${alpha.toFixed(3)})`;
    });
  }
  if (color.startsWith('rgb(')) {
    const m = color.match(/rgb\(([^)]+)\)/);
    if (m) return `rgba(${m[1]},${alpha.toFixed(3)})`;
  }
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (!Number.isNaN(r + g + b)) {
      return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
    }
  }
  return `rgba(${DEFAULT_NAVY},${alpha.toFixed(3)})`;
}

export const ScrimLayer: React.FC<ScrimLayerProps> = ({
  direction = 'bottom',
  opacity = 0.78,
  color = `rgb(${DEFAULT_NAVY})`,
  peakAt = 0,
  fadeAt = 60,
  animateInSec = 0,
  easing = 'easeOutCubic',
  autoContrast = false,
  durationSec,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Static or animated multiplier (entrance fade-in)
  let mult = 1;
  if (animateInSec > 0) {
    const t = clamp(frame / (animateInSec * fps), 0, 1);
    mult = applyEasing(t, easing);
  }

  // Auto-contrast: rises from 60% → 100% of peak over the scene.
  if (autoContrast && durationSec && durationSec > 0) {
    const t2 = clamp(frame / (durationSec * fps), 0, 1);
    mult *= 0.6 + 0.4 * applyEasing(t2, 'easeOutCubic');
  }

  const finalOpacity = opacity * mult;
  const dark = rgbaFromColor(color, finalOpacity);
  const lightMid = rgbaFromColor(color, finalOpacity * 0.45);
  const transparent = rgbaFromColor(color, 0);

  let background: string;
  switch (direction) {
    case 'bottom':
      background = `linear-gradient(to top, ${dark} ${peakAt}%, ${lightMid} ${(peakAt + fadeAt) / 2}%, ${transparent} ${fadeAt}%)`;
      break;
    case 'top':
      background = `linear-gradient(to bottom, ${dark} ${peakAt}%, ${lightMid} ${(peakAt + fadeAt) / 2}%, ${transparent} ${fadeAt}%)`;
      break;
    case 'left':
      background = `linear-gradient(to right, ${dark} ${peakAt}%, ${lightMid} ${(peakAt + fadeAt) / 2}%, ${transparent} ${fadeAt}%)`;
      break;
    case 'right':
      background = `linear-gradient(to left, ${dark} ${peakAt}%, ${lightMid} ${(peakAt + fadeAt) / 2}%, ${transparent} ${fadeAt}%)`;
      break;
    case 'full':
      // Full-frame even darken — useful behind big-stat overlays.
      background = dark;
      break;
    case 'radial':
      // Vignette: dark edges, transparent center.
      background = `radial-gradient(ellipse at center, ${transparent} 35%, ${lightMid} 70%, ${dark} 100%)`;
      break;
  }

  return (
    <AbsoluteFill
      style={{
        background,
        pointerEvents: 'none',
      }}
    />
  );
};
