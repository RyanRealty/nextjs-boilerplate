// KineticText — text entrance animations with physics-based feel.
//
// Use this anywhere you'd otherwise drop a static <div>{copy}</div>. Each
// variant is timed in seconds (`durationSec`), uses a configurable easing or
// spring config, and supports a delay so multiple lines can stagger.
//
// Variants:
//   slide-up         — translates from below, fades in
//   slide-left       — translates from right, fades in
//   slide-right      — translates from left, fades in
//   scale-from-center — scale 0.6 → 1.0 with overshoot
//   typewriter       — characters appear one-by-one (no fade)
//   spring-bounce    — spring scale + slight rotation, energetic
//   split-chars      — every character animates in independently with stagger
//   fade-slide-up    — small upward translate + opacity fade (subtle, elegant)

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

export type KineticVariant =
  | 'slide-up'
  | 'slide-left'
  | 'slide-right'
  | 'scale-from-center'
  | 'typewriter'
  | 'spring-bounce'
  | 'split-chars'
  | 'fade-slide-up';

export type KineticTextProps = {
  text: string;
  variant?: KineticVariant;
  /** Animation in-duration in seconds. Default 0.6s. */
  durationSec?: number;
  /** Delay before the animation starts (s). Default 0. */
  delaySec?: number;
  /** Per-character stagger for `split-chars` (s). Default 0.04. */
  charStaggerSec?: number;
  easing?: EasingName;
  /** Spring config name for spring-driven variants. Default 'snappy'. */
  spring?: SpringPresetName;
  /** Inline style for the text element. */
  style?: React.CSSProperties;
  /** Optional className for outer wrapper. */
  className?: string;
};

export const KineticText: React.FC<KineticTextProps> = ({
  text,
  variant = 'fade-slide-up',
  durationSec = 0.6,
  delaySec = 0,
  charStaggerSec = 0.04,
  easing = 'easeOutCubic',
  spring: springName = 'snappy',
  style,
  className,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delayFrames = delaySec * fps;
  const durFrames = Math.max(1, durationSec * fps);
  const localFrame = frame - delayFrames;
  const t = clamp(localFrame / durFrames, 0, 1);
  const eased = applyEasing(t, easing);

  // Hidden until delay elapses.
  if (localFrame < 0) {
    return (
      <div className={className} style={{ ...style, opacity: 0 }}>
        {text}
      </div>
    );
  }

  switch (variant) {
    case 'slide-up': {
      const dy = (1 - eased) * 60;
      return (
        <div
          className={className}
          style={{
            ...style,
            opacity: eased,
            transform: `translateY(${dy.toFixed(2)}px)`,
            willChange: 'transform, opacity',
          }}
        >
          {text}
        </div>
      );
    }

    case 'slide-left': {
      const dx = (1 - eased) * 80;
      return (
        <div
          className={className}
          style={{
            ...style,
            opacity: eased,
            transform: `translateX(${dx.toFixed(2)}px)`,
            willChange: 'transform, opacity',
          }}
        >
          {text}
        </div>
      );
    }

    case 'slide-right': {
      const dx = (1 - eased) * -80;
      return (
        <div
          className={className}
          style={{
            ...style,
            opacity: eased,
            transform: `translateX(${dx.toFixed(2)}px)`,
            willChange: 'transform, opacity',
          }}
        >
          {text}
        </div>
      );
    }

    case 'scale-from-center': {
      const sc = 0.6 + 0.4 * eased;
      return (
        <div
          className={className}
          style={{
            ...style,
            opacity: eased,
            transform: `scale(${sc.toFixed(4)})`,
            transformOrigin: 'center center',
            willChange: 'transform, opacity',
          }}
        >
          {text}
        </div>
      );
    }

    case 'fade-slide-up': {
      const dy = (1 - eased) * 22;
      return (
        <div
          className={className}
          style={{
            ...style,
            opacity: eased,
            transform: `translateY(${dy.toFixed(2)}px)`,
            willChange: 'transform, opacity',
          }}
        >
          {text}
        </div>
      );
    }

    case 'typewriter': {
      const charsToShow = Math.floor(t * text.length + 0.0001);
      return (
        <div className={className} style={style}>
          {text.slice(0, charsToShow)}
          {/* Blinking caret while typing */}
          {charsToShow < text.length ? (
            <span
              style={{
                display: 'inline-block',
                marginLeft: 4,
                opacity: Math.floor((frame / fps) * 2) % 2 === 0 ? 1 : 0,
              }}
            >
              |
            </span>
          ) : null}
        </div>
      );
    }

    case 'spring-bounce': {
      const cfg = SPRING_PRESETS[springName];
      const s = spring({
        frame: localFrame,
        fps,
        config: cfg,
      });
      const sc = 0.5 + 0.5 * s;
      const rot = (1 - s) * -2; // tiny rotation as it settles
      return (
        <div
          className={className}
          style={{
            ...style,
            opacity: clamp(s, 0, 1),
            transform: `scale(${sc.toFixed(4)}) rotate(${rot.toFixed(2)}deg)`,
            transformOrigin: 'center center',
            willChange: 'transform, opacity',
          }}
        >
          {text}
        </div>
      );
    }

    case 'split-chars': {
      const chars = Array.from(text);
      const cfg = SPRING_PRESETS[springName];
      return (
        <div className={className} style={style}>
          {chars.map((ch, i) => {
            const charDelayFrames = i * charStaggerSec * fps;
            const charFrame = localFrame - charDelayFrames;
            const s = spring({
              frame: Math.max(0, charFrame),
              fps,
              config: cfg,
            });
            const dy = (1 - s) * 36;
            return (
              <span
                key={`${ch}-${i}`}
                style={{
                  display: 'inline-block',
                  opacity: clamp(s, 0, 1),
                  transform: `translateY(${dy.toFixed(2)}px)`,
                  // Preserve whitespace as a real space (otherwise inline-blocks collapse).
                  whiteSpace: ch === ' ' ? 'pre' : 'normal',
                  willChange: 'transform, opacity',
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
      );
    }
  }
};
