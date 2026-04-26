// DepthParallaxBeat — 3D Ken Burns / depth-parallax variant of PhotoBeat.
//
// Renders a listing photo that has been pre-processed through
// video_production_skills/depth_parallax/generate_depth_map.py into three
// alpha-cut layer PNGs (bg.png, mid.png, fg.png).  Each layer is translated
// and scaled with a different multiplier so objects closer to the camera
// move more than objects far away — producing a genuine 3D parallax effect
// from a still photograph.
//
// Drop-in replacement for PhotoBeat: identical prop API plus the required
// `depthDir` prop pointing at the folder (under public/images/) that holds
// the three layer PNGs.
//
// Parallax multipliers:
//   bg  — pan 0.4×, scale offset 0.95×  (barely moves — recedes into distance)
//   mid — pan 1.0×, scale offset 1.0×   (base motion, same as PhotoBeat)
//   fg  — pan 1.6×, scale offset 1.08×  (rushes past camera)
//
// This component intentionally shares the same style conventions, filter
// chain, scrim, vignette, and title card logic as PhotoBeat.tsx.

import React from 'react';
import { Img, staticFile } from 'remotion';
import {
  FONT_BODY,
  FONT_SERIF,
  GOLD,
  LUXURY_GRADE_FILTER,
  OFF_WHITE,
  SHARED_VIGNETTE,
  SUB_SHADOW,
  TEXT_SHADOW,
} from '../brand';
import { CameraMoveOpts, cameraTransform } from '../cameraMoves';
import { clamp, easeOutCubic, easeOutQuart } from '../easing';

// ─── Parallax layer multipliers ──────────────────────────────────────────────
// CINEMATIC v4.1: balanced for visible 3D differential WITHOUT the parallax-
// tear gaps that the v4 (0.0/1.0/2.4) aggressive fan-out produced. Wide gaps
// formed at depth-mask boundaries where the fg layer scaled outward away from
// the bg/mid alpha edges, exposing the AbsoluteFill bg color as black arcs
// across the frame. This range (0.5/1.0/1.5) keeps a 10% bg-fg differential
// while staying within the layer alpha-mask overlap zones. A base "fill"
// layer is also rendered underneath the depth stack as a safety net for any
// residual gaps (see <Img src={base}> below the depth Img stack).
const LAYER_PAN_MULT = { bg: 0.5, mid: 1.0, fg: 1.5 } as const;
const LAYER_SCALE_OFFSET_MULT = { bg: 0.5, mid: 1.0, fg: 1.5 } as const;

type LayerKey = 'bg' | 'mid' | 'fg';

// ─── Transform decomposition / recomposition ─────────────────────────────────
//
// cameraTransform() returns a CSS transform string. We need to apply per-layer
// multipliers to the translate and scale components.  Rather than parsing the
// string, we compute our own transform for each layer using the same logic as
// cameraMoves.ts but with depth-derived multipliers applied.

type LayerTransform = {
  transform: string;
  transformOrigin: string;
};

/**
 * Given the base camera result (from cameraTransform), derive a per-layer
 * CSS transform that stretches or compresses the pan and scale offset to
 * simulate depth parallax.
 *
 * Strategy: call cameraTransform twice — once at the current t to get base
 * values, then decompose by reading the parameters directly.  Since we can't
 * parse a CSS string cleanly, we re-derive raw values for the two most
 * important axes (translate, scale) from the raw camera inputs.
 */
function layerCameraTransform(
  layer: LayerKey,
  localFrame: number,
  totalFrames: number,
  move: CameraMoveOpts,
): LayerTransform {
  const panMult = LAYER_PAN_MULT[layer];
  const scaleMult = LAYER_SCALE_OFFSET_MULT[layer];

  const { move: moveType, focal = 'center', intensity = 1 } = move;
  const t = Math.max(0, Math.min(1, localFrame / Math.max(1, totalFrames)));
  const origin =
    focal === 'center'
      ? '50% 50%'
      : focal === 'center-top'
      ? '50% 30%'
      : focal === 'center-bottom'
      ? '50% 70%'
      : focal === 'left-center'
      ? '30% 50%'
      : focal === 'right-center'
      ? '70% 50%'
      : `${(focal as { x: number; y: number }).x}% ${(focal as { x: number; y: number }).y}%`;

  // Easing helpers (mirrors cameraMoves.ts)
  const easeOutCubicLocal = (v: number) => 1 - Math.pow(1 - v, 3);
  const easeOutQuartLocal = (v: number) => 1 - Math.pow(1 - v, 4);
  const easeInOutCubicLocal = (v: number) =>
    v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;

  switch (moveType) {
    case 'still': {
      return { transform: 'scale(1)', transformOrigin: origin };
    }

    case 'push_in': {
      // Base: scale 1.0 → 1.0 + 0.16 * intensity (was 0.08 — too gentle for the
      // depth multipliers downstream, which scaled the fg layer only 8.6% over
      // 2.4s and read as "no camera move" on playback). 0.16 gives the fg
      // layer a 17% scale swing at intensity 1.0 — visible 3D dolly through
      // space without distortion.
      const eased = easeOutCubicLocal(t);
      const baseScaleOffset = 0.16 * intensity * eased;
      const scale = 1.0 + baseScaleOffset * scaleMult;
      return { transform: `scale(${scale.toFixed(4)})`, transformOrigin: origin };
    }

    case 'pull_out': {
      // Base: scale 1.18 → 1.06 (was 1.12 → 1.0). Bumped from 0.12 to 0.18
      // for matching push_in visibility. fg layer pulls back 19% over the beat.
      const eased = easeOutQuartLocal(t);
      const baseScaleOffset = -0.18 * intensity * eased; // negative = shrink
      const scale = 1.18 + baseScaleOffset * scaleMult;
      const dx = -8 * intensity * eased * panMult;
      return {
        transform: `translate(${dx.toFixed(2)}px, 0px) scale(${scale.toFixed(4)})`,
        transformOrigin: origin,
      };
    }

    case 'parallax': {
      const eased = easeInOutCubicLocal(t);
      const scale = 1.0 + 0.06 * scaleMult;
      const dx = -30 * intensity * eased * panMult;
      return {
        transform: `translateX(${dx.toFixed(2)}px) scale(${scale.toFixed(4)})`,
        transformOrigin: origin,
      };
    }

    case 'vertical_reveal': {
      const eased = easeInOutCubicLocal(t);
      const scale = 1.0 + 0.08 * scaleMult;
      const dy = (25 - 40 * intensity * eased) * panMult;
      return {
        transform: `translateY(${dy.toFixed(2)}px) scale(${scale.toFixed(4)})`,
        transformOrigin: origin,
      };
    }

    case 'orbit_fake': {
      const eased = easeInOutCubicLocal(t);
      const scale = 1.02 + 0.04 * intensity * eased * scaleMult;
      const rot = 0.5 * intensity * Math.sin(t * Math.PI);
      return {
        transform: `rotate(${rot.toFixed(3)}deg) scale(${scale.toFixed(4)})`,
        transformOrigin: origin,
      };
    }

    case 'push_counter': {
      const scaleEase = easeOutCubicLocal(t);
      const transEase = easeInOutCubicLocal(Math.min(1, t * 1.05));
      const scale = 1.0 + 0.12 * intensity * scaleEase * scaleMult;
      const dir = move.counterDir ?? 'right';
      const px = 28 * intensity * transEase * panMult;
      const tx = dir === 'left' ? -px : dir === 'right' ? px : 0;
      const ty = dir === 'up' ? -px : dir === 'down' ? px : 0;
      const shakeX = Math.sin(localFrame / 12) * 0.6 * panMult;
      const shakeY = Math.cos(localFrame / 14) * 0.4 * panMult;
      return {
        transform: `translate(${(tx + shakeX).toFixed(2)}px, ${(ty + shakeY).toFixed(2)}px) scale(${scale.toFixed(4)})`,
        transformOrigin: origin,
      };
    }

    // Wide-mode pan moves — treat as cover-mode for depth parallax since the
    // three layer PNGs are already cropped. Apply pan multiplier to dx.
    case 'slow_pan_lr': {
      const eased = easeInOutCubicLocal(t);
      const panRange = 320 * intensity;
      const dx = (panRange - 2 * panRange * eased) * panMult;
      const scale = 1.0 + 0.04 * scaleMult;
      const shakeY = Math.cos(localFrame / 16) * 0.4;
      return {
        transform: `translate(${dx.toFixed(2)}px, ${shakeY.toFixed(2)}px) scale(${scale.toFixed(4)})`,
        transformOrigin: origin,
      };
    }

    case 'slow_pan_rl': {
      const eased = easeInOutCubicLocal(t);
      const panRange = 320 * intensity;
      const dx = (-panRange + 2 * panRange * eased) * panMult;
      const scale = 1.0 + 0.04 * scaleMult;
      const shakeY = Math.cos(localFrame / 16) * 0.4;
      return {
        transform: `translate(${dx.toFixed(2)}px, ${shakeY.toFixed(2)}px) scale(${scale.toFixed(4)})`,
        transformOrigin: origin,
      };
    }

    case 'slow_pan_tb': {
      const eased = easeInOutCubicLocal(t);
      const scale = 1.0 + 0.10 * scaleMult;
      const dy = (-50 + 100 * intensity * eased) * panMult;
      const shakeX = Math.sin(localFrame / 12) * 0.5;
      return {
        transform: `translate(${shakeX.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${scale.toFixed(4)})`,
        transformOrigin: origin,
      };
    }

    case 'slow_pan_bt': {
      const eased = easeInOutCubicLocal(t);
      const scale = 1.0 + 0.10 * scaleMult;
      const dy = (50 - 100 * intensity * eased) * panMult;
      const shakeX = Math.sin(localFrame / 12) * 0.5;
      return {
        transform: `translate(${shakeX.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${scale.toFixed(4)})`,
        transformOrigin: origin,
      };
    }

    case 'gimbal_walk': {
      const dir = move.direction ?? 'lr';
      const eased = easeInOutCubicLocal(t);
      const panRange = 280 * intensity;
      const dxBase = (dir === 'lr'
        ? panRange - 2 * panRange * eased
        : -panRange + 2 * panRange * eased) * panMult;
      const scaleEase = easeOutCubicLocal(t);
      const scale = 1.02 + 0.06 * scaleEase * scaleMult;
      const bobY = Math.sin(localFrame / 24) * 1.4;
      const counterX = -dxBase * 0.04;
      const shakeX = Math.sin(localFrame / 14) * 0.4;
      return {
        transform: `translate(${(dxBase + counterX + shakeX).toFixed(2)}px, ${bobY.toFixed(2)}px) scale(${scale.toFixed(4)})`,
        transformOrigin: origin,
      };
    }

    case 'multi_point_pan': {
      const anchors = move.anchors ?? [
        { x: 30, y: 0, scale: 1.04 },
        { x: 0, y: 0, scale: 1.06 },
        { x: -30, y: 0, scale: 1.04 },
      ];
      const t2 = t < 0.5
        ? easeInOutCubicLocal(t / 0.5)
        : easeInOutCubicLocal((t - 0.5) / 0.5);
      const seg = t < 0.5 ? 0 : 1;
      const A = anchors[seg];
      const B = anchors[seg + 1];
      const lerp = (p: number, q: number) => p + (q - p) * t2;
      const fx = lerp(A.x, B.x);
      const fy = lerp(A.y, B.y);
      const fs = lerp(A.scale, B.scale);
      const dx = fx * 17.5 * intensity * panMult;
      const dy = fy * 17.5 * intensity * panMult;
      const shakeX = Math.sin(localFrame / 14) * 0.5;
      const shakeY = Math.cos(localFrame / 16) * 0.35;
      const scaleOffset = (fs - 1.0) * scaleMult;
      return {
        transform: `translate(${(dx + shakeX).toFixed(2)}px, ${(dy + shakeY).toFixed(2)}px) scale(${(1.0 + scaleOffset).toFixed(4)})`,
        transformOrigin: origin,
      };
    }

    case 'cinemagraph': {
      // Fall back to base camera result for the rarely-used cinemagraph move
      const base = cameraTransform(localFrame, totalFrames, move);
      return { transform: base.transform, transformOrigin: base.transformOrigin };
    }
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  /** Original photo path under public/images/ (still used for vignetteLetterbox backdrop) */
  photo: string;
  /** Path under public/images/ to the depth layer directory (contains bg.png, mid.png, fg.png) */
  depthDir: string;
  local: number;
  fps: number;
  durationSec: number;
  move: CameraMoveOpts;
  title?: string;
  sub?: string;
  titlePosition?: 'top' | 'bottom' | 'center' | 'none';
  scrim?: 'none' | 'bottom' | 'top' | 'full';
  /** Vignette-letterbox: blurred copy of the original photo fills dead space above/below */
  vignetteLetterbox?: boolean;
  /** CSS object-position for cover-mode layers */
  objectPosition?: string;
  crossfadeIn?: number;
  crossfadeOut?: number;
};

// ─── Component ───────────────────────────────────────────────────────────────

export const DepthParallaxBeat: React.FC<Props> = ({
  photo,
  depthDir,
  local,
  fps,
  durationSec,
  move,
  title,
  sub,
  titlePosition = 'bottom',
  scrim = 'bottom',
  vignetteLetterbox = false,
  objectPosition,
  crossfadeIn = 0.5,
  crossfadeOut = 0.5,
}) => {
  const totalFrames = Math.round(durationSec * fps);
  const localFrame = Math.round(local * fps);

  // Base camera result (used for wideMode flag and fallback)
  const camBase = cameraTransform(localFrame, totalFrames, move);

  // Crossfade alpha — identical math to PhotoBeat
  const tEntry = crossfadeIn > 0 ? clamp(local / crossfadeIn, 0, 1) : 1;
  const tExit =
    crossfadeOut > 0
      ? clamp((local - (durationSec - crossfadeOut)) / crossfadeOut, 0, 1)
      : 0;
  const photoAlpha = easeOutCubic(tEntry) * (1 - tExit);

  // Title fade-in
  const tTitle = clamp((local - 0.05) / 0.4, 0, 1);
  const titleAlpha = easeOutCubic(tTitle) * (1 - tExit);
  const titleY = (1 - easeOutQuart(tTitle)) * 26;

  // Scrim gradient
  let scrimGradient = 'transparent';
  if (scrim === 'bottom')
    scrimGradient =
      'linear-gradient(to top, rgba(15,10,6,0.78) 0%, rgba(15,10,6,0.35) 35%, rgba(15,10,6,0) 60%)';
  else if (scrim === 'top')
    scrimGradient =
      'linear-gradient(to bottom, rgba(15,10,6,0.65) 0%, rgba(15,10,6,0.18) 30%, rgba(15,10,6,0) 50%)';
  else if (scrim === 'full')
    scrimGradient =
      'linear-gradient(180deg, rgba(15,10,6,0.45) 0%, rgba(15,10,6,0.22) 50%, rgba(15,10,6,0.65) 100%)';

  // Per-layer transforms
  const bgCam = layerCameraTransform('bg', localFrame, totalFrames, move);
  const midCam = layerCameraTransform('mid', localFrame, totalFrames, move);
  const fgCam = layerCameraTransform('fg', localFrame, totalFrames, move);

  // Layer image paths — under public/images/
  const bgSrc = staticFile(`images/${depthDir}/bg.png`);
  const midSrc = staticFile(`images/${depthDir}/mid.png`);
  const fgSrc = staticFile(`images/${depthDir}/fg.png`);

  // Common layer style — all layers are full-bleed RGBA PNGs stacked via
  // absolute positioning. objectFit:cover + objectPosition keep each layer
  // aligned with the frame regardless of the original image aspect ratio.
  const layerBaseStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: objectPosition ?? '50% 50%',
    filter: LUXURY_GRADE_FILTER,
    opacity: photoAlpha,
  };

  const renderLayers = () => {
    if (vignetteLetterbox) {
      // Blurred backdrop fills the dead space at high blur. Sharp depth
      // layers fill the canvas at object-fit: cover so the composition
      // reads as a full-frame image with a softened halo at the edges,
      // NOT as a small image floating in a giant blur — that was the v3
      // bug where landscape sources (1535×1024) on a portrait canvas
      // (1080×1920) rendered the sharp layers as a 720-px middle band.
      return (
        <>
          {/* Blurred backdrop — original photo, not depth layers */}
          <Img
            src={staticFile(`images/${photo}`)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: `${LUXURY_GRADE_FILTER} blur(36px) brightness(0.92) saturate(1.08)`,
              transform: 'scale(1.20)',
              opacity: photoAlpha * 0.85,
            }}
          />
          {/* Base FILL layer — original photo at scale 1.0, fills any
              parallax-tear gaps left by the depth layer displacement. */}
          <Img
            src={staticFile(`images/${photo}`)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: objectPosition ?? '50% 50%',
              filter: LUXURY_GRADE_FILTER,
              opacity: photoAlpha,
            }}
          />
          {/* Depth layer stack, full-bleed cover-mode */}
          <Img
            src={bgSrc}
            style={{
              ...layerBaseStyle,
              transform: bgCam.transform,
              transformOrigin: bgCam.transformOrigin,
            }}
          />
          <Img
            src={midSrc}
            style={{
              ...layerBaseStyle,
              transform: midCam.transform,
              transformOrigin: midCam.transformOrigin,
            }}
          />
          <Img
            src={fgSrc}
            style={{
              ...layerBaseStyle,
              transform: fgCam.transform,
              transformOrigin: fgCam.transformOrigin,
            }}
          />
        </>
      );
    }

    if (camBase.wideMode) {
      // Wide-mode: layers sized at height:100% width:auto, centered
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <Img
            src={bgSrc}
            style={{
              height: '100%',
              width: 'auto',
              display: 'block',
              transform: bgCam.transform,
              transformOrigin: bgCam.transformOrigin,
              filter: LUXURY_GRADE_FILTER,
              opacity: photoAlpha,
            }}
          />
          <Img
            src={midSrc}
            style={{
              position: 'absolute',
              height: '100%',
              width: 'auto',
              display: 'block',
              transform: midCam.transform,
              transformOrigin: midCam.transformOrigin,
              filter: LUXURY_GRADE_FILTER,
              opacity: photoAlpha,
            }}
          />
          <Img
            src={fgSrc}
            style={{
              position: 'absolute',
              height: '100%',
              width: 'auto',
              display: 'block',
              transform: fgCam.transform,
              transformOrigin: fgCam.transformOrigin,
              filter: LUXURY_GRADE_FILTER,
              opacity: photoAlpha,
            }}
          />
        </div>
      );
    }

    // Cover mode: full-bleed RGBA layers stacked with absolute positioning.
    // v4.1: BASE FILL layer at scale 1.0 underneath the depth stack acts as
    // a safety net — fills any gaps left by depth-layer parallax displacement
    // at depth-mask boundaries. Without this, aggressive multipliers expose
    // the AbsoluteFill bg color as black arcs at depth edges.
    return (
      <>
        <Img
          src={staticFile(`images/${photo}`)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: objectPosition ?? '50% 50%',
            filter: LUXURY_GRADE_FILTER,
            opacity: photoAlpha,
          }}
        />
        <Img
          src={bgSrc}
          style={{
            ...layerBaseStyle,
            transform: bgCam.transform,
            transformOrigin: bgCam.transformOrigin,
          }}
        />
        <Img
          src={midSrc}
          style={{
            ...layerBaseStyle,
            transform: midCam.transform,
            transformOrigin: midCam.transformOrigin,
          }}
        />
        <Img
          src={fgSrc}
          style={{
            ...layerBaseStyle,
            transform: fgCam.transform,
            transformOrigin: fgCam.transformOrigin,
          }}
        />
      </>
    );
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        // v5.6 rule: parent ALWAYS transparent so the previous beat shows
        // through during crossfade overlap (see PhotoBeat.tsx note).
        background: 'transparent',
        overflow: 'hidden',
      }}
    >
      {renderLayers()}

      {/* Shared vignette — skip on vignetteLetterbox (same rule as PhotoBeat) */}
      {!vignetteLetterbox && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: SHARED_VIGNETTE,
            opacity: 0.85 * photoAlpha,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Subtle film-grain noise overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 20% 30%, rgba(255,235,200,0.02) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,235,200,0.015) 0%, transparent 50%)',
          mixBlendMode: 'overlay',
          opacity: 0.7,
          pointerEvents: 'none',
        }}
      />

      {scrim !== 'none' ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: scrimGradient,
            opacity: photoAlpha,
            pointerEvents: 'none',
          }}
        />
      ) : null}

      {title && titlePosition !== 'none' ? (
        <div
          style={{
            position: 'absolute',
            left: 90,
            right: 90,
            ...(titlePosition === 'top'
              ? { top: 240 }
              : titlePosition === 'center'
              ? { top: '50%', transform: `translateY(calc(-50% + ${-titleY}px))` }
              : { bottom: 280, transform: `translateY(${-titleY}px)` }),
            opacity: titleAlpha,
            textAlign: titlePosition === 'center' ? 'center' : 'left',
          }}
        >
          <div
            style={{
              fontFamily: FONT_SERIF,
              fontSize: 92,
              lineHeight: 1.02,
              color: OFF_WHITE,
              letterSpacing: '-0.01em',
              textShadow: TEXT_SHADOW,
            }}
          >
            {title}
          </div>
          {sub ? (
            <div
              style={{
                marginTop: 22,
                fontFamily: FONT_BODY,
                fontWeight: 700,
                fontSize: 50,
                color: GOLD,
                letterSpacing: 5,
                textTransform: 'uppercase',
                textShadow: SUB_SHADOW,
              }}
            >
              {sub}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
