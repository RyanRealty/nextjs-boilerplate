// ParallaxPhoto — 2.5D parallax pop on a still photo.
//
// TWO modes:
//
// 1. **Layer mode** — pass `depthDir` pointing at a directory holding three
//    pre-cut RGBA layer PNGs (`bg.png`, `mid.png`, `fg.png`). This is the
//    high-quality path. Layers are produced offline by the MiDaS pipeline at
//    `video_production_skills/depth_parallax/generate_depth_map.py` (see
//    `listing_video_v4/public/v5_library/depth/<listing>/<photo>/`).
//
// 2. **Fake mode** — pass only `src`. Component synthesises a parallax effect
//    by stacking the same photo twice — a blurred, slow-moving background and
//    a sharp, fast-moving foreground. Cheaper, no MiDaS step required, looks
//    great for short scenes (<3s) and any time the photo doesn't have a strong
//    foreground subject. Build agents can use this anywhere a depth map isn't
//    available without breaking the scene.
//
// Either way, output is a full-bleed AbsoluteFill component. Wrap in
// AnimatedInfoCard / KineticText for copy.

import React from 'react';
import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { applyEasing, clamp, EasingName } from './easing';

export type ParallaxDirection =
  | 'push-in'
  | 'pull-out'
  | 'pan-left'
  | 'pan-right'
  | 'rise';

export type ParallaxPhotoProps = {
  /** The fully-qualified original photo URL (use staticFile() at the call site). */
  src: string;
  /**
   * Optional directory URL containing `bg.png` / `mid.png` / `fg.png` layer
   * PNGs (depth-cut by MiDaS). When provided, the component runs in layer mode.
   * Pass a trailing slash, e.g. `staticFile('depth/lifestyle_eagle/')`.
   */
  depthDir?: string;
  /** Total beat duration in seconds. */
  durationSec: number;
  direction?: ParallaxDirection;
  /** 0..1 multiplier on motion magnitude. Default 1. */
  intensity?: number;
  /** Easing curve. Default 'easeInOutCubic'. */
  easing?: EasingName;
  /** CSS object-position. Default 'center'. */
  objectPosition?: string;
  /** Optional color-grade / filter chain applied to every layer. */
  filter?: string;
  /** Render a blurred copy of the original behind everything as a safety bg fill. Default true. */
  showBaseFill?: boolean;
};

// Layer multipliers. Background recedes, foreground rushes — same depth feel
// as the listing_video_v4 DepthParallaxBeat (0.45 / 1.0 / 1.75).
const LAYER_PAN = { bg: 0.45, mid: 1.0, fg: 1.75 } as const;
const LAYER_SCALE = { bg: 0.45, mid: 1.0, fg: 1.75 } as const;

type Layer = 'bg' | 'mid' | 'fg';

function transformForLayer(
  layer: Layer,
  direction: ParallaxDirection,
  intensity: number,
  eased: number,
): string {
  const panMult = LAYER_PAN[layer];
  const scaleMult = LAYER_SCALE[layer];

  switch (direction) {
    case 'push-in': {
      const scale = 1 + 0.16 * intensity * eased * scaleMult;
      return `scale(${scale.toFixed(4)})`;
    }
    case 'pull-out': {
      const scale = 1.18 - 0.18 * intensity * eased * scaleMult;
      const dx = -8 * intensity * eased * panMult;
      return `translate(${dx.toFixed(2)}px, 0px) scale(${scale.toFixed(4)})`;
    }
    case 'pan-left': {
      const scale = 1 + 0.06 * scaleMult;
      const dx = -36 * intensity * eased * panMult;
      return `translateX(${dx.toFixed(2)}px) scale(${scale.toFixed(4)})`;
    }
    case 'pan-right': {
      const scale = 1 + 0.06 * scaleMult;
      const dx = 36 * intensity * eased * panMult;
      return `translateX(${dx.toFixed(2)}px) scale(${scale.toFixed(4)})`;
    }
    case 'rise': {
      const scale = 1 + 0.08 * scaleMult;
      const dy = (24 - 48 * intensity * eased) * panMult;
      return `translateY(${dy.toFixed(2)}px) scale(${scale.toFixed(4)})`;
    }
  }
}

export const ParallaxPhoto: React.FC<ParallaxPhotoProps> = ({
  src,
  depthDir,
  durationSec,
  direction = 'push-in',
  intensity = 1,
  easing = 'easeInOutCubic',
  objectPosition = 'center',
  filter,
  showBaseFill = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalFrames = Math.max(1, durationSec * fps);
  const t = clamp(frame / totalFrames, 0, 1);
  const eased = applyEasing(t, easing);

  const baseLayerStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition,
    filter,
    willChange: 'transform',
  };

  if (depthDir) {
    // ─── Layer mode ─────────────────────────────────────────────────────────
    const sep = depthDir.endsWith('/') ? '' : '/';
    const bgSrc = `${depthDir}${sep}bg.png`;
    const midSrc = `${depthDir}${sep}mid.png`;
    const fgSrc = `${depthDir}${sep}fg.png`;

    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        {showBaseFill ? (
          <Img
            src={src}
            style={{
              ...baseLayerStyle,
              filter: `${filter ?? ''} blur(36px) brightness(0.92) saturate(1.06)`.trim(),
              transform: 'scale(1.20)',
              opacity: 0.9,
            }}
          />
        ) : null}
        {/* Sharp original beneath the depth stack — fills any parallax-tear gaps. */}
        <Img src={src} style={baseLayerStyle} />
        <Img
          src={bgSrc}
          style={{ ...baseLayerStyle, transform: transformForLayer('bg', direction, intensity, eased) }}
        />
        <Img
          src={midSrc}
          style={{ ...baseLayerStyle, transform: transformForLayer('mid', direction, intensity, eased) }}
        />
        <Img
          src={fgSrc}
          style={{ ...baseLayerStyle, transform: transformForLayer('fg', direction, intensity, eased) }}
        />
      </AbsoluteFill>
    );
  }

  // ─── Fake mode (no depth map) ─────────────────────────────────────────────
  // Two layers of the same photo. The bg layer is blurred + scaled wider and
  // moves at 0.45×; the fg layer is sharp at 1.75×. Reads as parallax pop on
  // most photos without needing a MiDaS depth pass.
  const bgTransform = transformForLayer('bg', direction, intensity, eased);
  const fgTransform = transformForLayer('fg', direction, intensity, eased);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Img
        src={src}
        style={{
          ...baseLayerStyle,
          filter: `${filter ?? ''} blur(18px) brightness(0.88) saturate(1.05)`.trim(),
          transform: `scale(1.18) ${bgTransform}`.trim(),
          opacity: 0.95,
        }}
      />
      <Img
        src={src}
        style={{
          ...baseLayerStyle,
          transform: fgTransform,
        }}
      />
    </AbsoluteFill>
  );
};
