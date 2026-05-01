// TextReveal — multi-line text animator built on KineticText.
//
// KineticText handles a single string. TextReveal is the higher-level wrapper
// that takes an array of lines and staggers them in. It enforces the rule
// that "every text element animates in" — drop this around copy you'd
// otherwise render statically.
//
// Lines are animated with the same variant by default; pass `perLineVariant`
// to mix variants (e.g. headline scales, sub fades).

import React from 'react';
import { KineticText, KineticVariant } from './KineticText';
import type { EasingName, SpringPresetName } from './easing';

export type TextRevealLine = {
  text: string;
  /** Per-line variant override. */
  variant?: KineticVariant;
  /** Inline style for this line (font size, color, etc.). */
  style?: React.CSSProperties;
  /** Optional className. */
  className?: string;
  /** Per-line delay override (s). If absent, computed from index × stagger. */
  delaySec?: number;
};

export type TextRevealProps = {
  lines: Array<string | TextRevealLine>;
  /** Default variant for every line. Default 'fade-slide-up'. */
  variant?: KineticVariant;
  /** Delay between line entrances (s). Default 0.18. */
  staggerSec?: number;
  /** Initial delay before the first line starts (s). Default 0. */
  delaySec?: number;
  /** Default per-line animation duration (s). Default 0.55. */
  durationSec?: number;
  easing?: EasingName;
  spring?: SpringPresetName;
  /** Wrapper styles (alignment, max-width, padding, etc.). */
  style?: React.CSSProperties;
  /** Inline style applied to every line unless the line overrides. */
  lineStyle?: React.CSSProperties;
  className?: string;
};

export const TextReveal: React.FC<TextRevealProps> = ({
  lines,
  variant = 'fade-slide-up',
  staggerSec = 0.18,
  delaySec = 0,
  durationSec = 0.55,
  easing = 'easeOutCubic',
  spring,
  style,
  lineStyle,
  className,
}) => {
  return (
    <div className={className} style={style}>
      {lines.map((raw, i) => {
        const line: TextRevealLine =
          typeof raw === 'string' ? { text: raw } : raw;
        const computedDelay =
          line.delaySec ?? delaySec + i * staggerSec;
        return (
          <KineticText
            key={`line-${i}`}
            text={line.text}
            variant={line.variant ?? variant}
            durationSec={durationSec}
            delaySec={computedDelay}
            easing={easing}
            spring={spring}
            style={{ ...lineStyle, ...line.style }}
            className={line.className}
          />
        );
      })}
    </div>
  );
};
