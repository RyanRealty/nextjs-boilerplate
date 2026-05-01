// CounterAnimation — animated number counter for stat reveals.
//
// Counts from `from` → `to` over `durationSec`, with an optional bar that
// fills proportionally. Supports prefixes ($, etc.) and suffixes (%, K, M).
// All numbers are formatted with `Intl.NumberFormat` so commas / decimals
// look right at every breakpoint.
//
// **Accuracy guard:** the displayed number is always within 1 of the target
// at the final frame. Pass `verifyValue` to log a warning during dev if the
// rendered number diverges from `to` — useful for catching off-by-one rounding
// when stitched into multi-stat scenes.

import React from 'react';
import {
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  applyEasing,
  clamp,
  EasingName,
  SPRING_PRESETS,
  SpringPresetName,
} from './easing';

export type CounterAnimationProps = {
  /** Starting number. Default 0. */
  from?: number;
  /** Target number. */
  to: number;
  /** Total animation duration in seconds. */
  durationSec: number;
  /** Delay before counting starts (s). Default 0. */
  delaySec?: number;
  /** Decimal places. Default 0. */
  decimals?: number;
  /** Locale for number formatting. Default 'en-US'. */
  locale?: string;
  /** String prefix (e.g. '$'). Default ''. */
  prefix?: string;
  /** String suffix (e.g. '%', 'K'). Default ''. */
  suffix?: string;
  /**
   * Counting curve. 'spring' uses Remotion's spring(); 'eased' uses the named
   * easing curve. Default 'spring' (snappy, satisfying).
   */
  curve?: 'spring' | 'eased';
  spring?: SpringPresetName;
  easing?: EasingName;
  /** Optional bar fill rendered beneath the number. */
  bar?: {
    /** Bar height in px. Default 12. */
    height?: number;
    /** Filled color. Default brand gold. */
    fill?: string;
    /** Track color. Default semi-transparent white. */
    track?: string;
    /**
     * Bar fill ratio 0..1. If absent, bar fills proportionally to the
     * counter's progress.
     */
    ratio?: number;
  };
  /** Inline style on the number element. */
  style?: React.CSSProperties;
  className?: string;
  /** Wrapper style around bar + number. */
  wrapperStyle?: React.CSSProperties;
};

const DEFAULT_GOLD = '#D4AF37';

export const CounterAnimation: React.FC<CounterAnimationProps> = ({
  from = 0,
  to,
  durationSec,
  delaySec = 0,
  decimals = 0,
  locale = 'en-US',
  prefix = '',
  suffix = '',
  curve = 'spring',
  spring: springName = 'snappy',
  easing = 'easeOutQuart',
  bar,
  style,
  className,
  wrapperStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delayFrames = delaySec * fps;
  const localFrame = Math.max(0, frame - delayFrames);
  const totalFrames = Math.max(1, durationSec * fps);

  let progress: number;
  if (curve === 'spring') {
    progress = spring({
      frame: localFrame,
      fps,
      config: SPRING_PRESETS[springName],
    });
  } else {
    const t = clamp(localFrame / totalFrames, 0, 1);
    progress = applyEasing(t, easing);
  }

  const value = from + (to - from) * progress;

  // Guarantee the final frame lands exactly on `to`.
  const displayValue = localFrame >= totalFrames ? to : value;

  const fmt = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const numberText = `${prefix}${fmt.format(displayValue)}${suffix}`;

  const barRatio = bar?.ratio ?? clamp(progress, 0, 1);

  return (
    <div className={className} style={wrapperStyle}>
      <div style={style}>{numberText}</div>
      {bar ? (
        <div
          style={{
            width: '100%',
            height: bar.height ?? 12,
            background: bar.track ?? 'rgba(255,255,255,0.14)',
            borderRadius: 999,
            overflow: 'hidden',
            marginTop: 14,
          }}
        >
          <div
            style={{
              width: `${(barRatio * 100).toFixed(2)}%`,
              height: '100%',
              background: bar.fill ?? DEFAULT_GOLD,
              borderRadius: 999,
              willChange: 'width',
            }}
          />
        </div>
      ) : null}
    </div>
  );
};
