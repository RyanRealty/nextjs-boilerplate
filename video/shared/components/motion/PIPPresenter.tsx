// PIPPresenter — picture-in-picture presenter cutout.
//
// Renders a circular or rounded-rect cutout of a presenter video / image
// pinned to a corner of the frame. Supports an animated entrance (slide,
// scale, or pop), a rim light/border for separation from the bg content,
// and optional waveform pulse synced to the VO duration.
//
// Two modes:
//
//   - 'image'    : pass `imageSrc`. Static (or use ParallaxPhoto inside via children).
//   - 'children' : pass arbitrary children — a Video, Img, or composed scene.
//
// **Important:** the presenter source typically has a background you want
// chroma-keyed out. Use a pre-keyed PNG / WebM with alpha. This component
// does NOT apply chroma-key on the fly; it only handles layout + entrance.

import React from 'react';
import {
  AbsoluteFill,
  Img,
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

export type PIPCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type PIPShape = 'circle' | 'rounded' | 'square';
export type PIPEntrance = 'slide' | 'scale-pop' | 'fade' | 'none';

export type PIPPresenterProps = {
  /** Position. Default 'bottom-right'. */
  corner?: PIPCorner;
  shape?: PIPShape;
  /** Cutout size as % of frame's smaller dimension. Default 28. */
  sizePct?: number;
  /** Outer margin from edge of frame in px. Default 60. */
  margin?: number;
  /** Image source. Required if no children passed. */
  imageSrc?: string;
  /** Custom children (Video, Img, ParallaxPhoto, etc.). */
  children?: React.ReactNode;
  /** Entrance animation. Default 'scale-pop'. */
  entrance?: PIPEntrance;
  /** Entrance duration (s). Default 0.7. */
  entranceSec?: number;
  /** Spring preset for scale-pop. Default 'snappy'. */
  spring?: SpringPresetName;
  easing?: EasingName;
  /** Rim border color. Default brand gold. */
  rim?: string;
  /** Rim width in px. Default 4. */
  rimWidth?: number;
  /** Add a soft outer glow. Default true. */
  glow?: boolean;
  /** CSS object-position for the imageSrc. Default 'center'. */
  objectPosition?: string;
  /** Optional VO duration to drive the rim's gentle pulse. If absent, no pulse. */
  durationSec?: number;
};

const DEFAULT_GOLD = '#D4AF37';

function cornerStyle(corner: PIPCorner, margin: number): React.CSSProperties {
  switch (corner) {
    case 'top-left':
      return { top: margin, left: margin };
    case 'top-right':
      return { top: margin, right: margin };
    case 'bottom-left':
      return { bottom: margin, left: margin };
    case 'bottom-right':
      return { bottom: margin, right: margin };
  }
}

export const PIPPresenter: React.FC<PIPPresenterProps> = ({
  corner = 'bottom-right',
  shape = 'circle',
  sizePct = 28,
  margin = 60,
  imageSrc,
  children,
  entrance = 'scale-pop',
  entranceSec = 0.7,
  spring: springName = 'snappy',
  easing = 'easeOutQuart',
  rim = DEFAULT_GOLD,
  rimWidth = 4,
  glow = true,
  objectPosition = 'center',
  durationSec,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: vw, height: vh } = useVideoConfig();

  const sizePx = (Math.min(vw, vh) * sizePct) / 100;

  const entranceFrames = Math.max(1, entranceSec * fps);
  const t = clamp(frame / entranceFrames, 0, 1);
  const eased = applyEasing(t, easing);

  let scale = 1;
  let opacity = 1;
  let translate = { x: 0, y: 0 };

  switch (entrance) {
    case 'scale-pop': {
      const s = spring({
        frame,
        fps,
        config: SPRING_PRESETS[springName],
      });
      scale = clamp(s, 0, 1.05);
      opacity = clamp(s, 0, 1);
      break;
    }
    case 'slide': {
      const offset = (1 - eased) * 220;
      const sign = corner.includes('right') ? 1 : -1;
      translate = { x: sign * offset, y: 0 };
      opacity = eased;
      break;
    }
    case 'fade': {
      opacity = eased;
      break;
    }
    case 'none':
      break;
  }

  // Pulse — driven by VO duration if provided. Soft 4-bpm rim breathing.
  let pulseScale = 1;
  if (durationSec && durationSec > 0) {
    const phase = (frame / fps) / durationSec;
    pulseScale = 1 + Math.sin(phase * Math.PI * 12) * 0.012;
  }

  const borderRadius =
    shape === 'circle' ? '50%' : shape === 'rounded' ? '24px' : '0';

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          width: sizePx,
          height: sizePx,
          ...cornerStyle(corner, margin),
          opacity,
          transform: `translate(${translate.x.toFixed(2)}px, ${translate.y.toFixed(2)}px) scale(${(scale * pulseScale).toFixed(4)})`,
          willChange: 'transform, opacity',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius,
            overflow: 'hidden',
            border: `${rimWidth}px solid ${rim}`,
            boxShadow: glow
              ? `0 0 32px rgba(0,0,0,0.45), 0 0 0 ${rimWidth}px rgba(255,255,255,0.06)`
              : '0 8px 24px rgba(0,0,0,0.35)',
          }}
        >
          {children ? (
            <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
          ) : imageSrc ? (
            <Img
              src={imageSrc}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition,
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'rgba(16,39,66,0.92)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: sizePx * 0.18,
                fontFamily: 'AzoSans, system-ui, sans-serif',
                fontWeight: 700,
              }}
            >
              MR
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
