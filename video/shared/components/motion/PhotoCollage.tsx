// PhotoCollage — animated 2-to-4 photo grid or sequential carousel.
//
// Two top-level layouts:
//
//  - 'grid'     : N tiles laid out in a static grid; each tile scales/fades
//                 in sequentially, then a final unifying motion pulls them
//                 toward the camera together.
//  - 'carousel' : tiles flip one-after-another (CSS 3D rotateY) revealing the
//                 next photo. Single visible tile at a time, full-bleed.
//
// Use `grid` when the panel needs to convey "here's everything at a glance"
// (event collages, area highlights). Use `carousel` for photo runs that need
// to read sequentially (listing rooms, before/after).

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

export type CollagePhoto = {
  src: string;
  /** Optional CSS object-position override per photo. */
  objectPosition?: string;
  /** Optional caption text overlaid on this tile. */
  caption?: string;
};

export type PhotoCollageProps = {
  photos: CollagePhoto[];
  layout?: 'grid' | 'carousel';
  /** Total beat duration in seconds. */
  durationSec: number;
  /** For grid: stagger between tile entrances (s). Default 0.18. */
  staggerSec?: number;
  /** Spring config for grid tile entrance. Default 'snappy'. */
  spring?: SpringPresetName;
  /** Carousel: easing for the flip. Default 'easeInOutCubic'. */
  easing?: EasingName;
  /** Color of the divider lines on grid layout. Default brand gold. */
  dividerColor?: string;
  /** Width of dividers in px. Default 6. Set 0 for no dividers. */
  dividerWidth?: number;
  /** Optional CSS filter chain applied to every tile. */
  filter?: string;
};

const DEFAULT_GOLD = '#D4AF37';

function gridLayoutFor(n: number): { rows: number; cols: number } {
  if (n <= 1) return { rows: 1, cols: 1 };
  if (n === 2) return { rows: 1, cols: 2 };
  if (n === 3) return { rows: 1, cols: 3 };
  return { rows: 2, cols: 2 }; // 4 (or more, capped)
}

export const PhotoCollage: React.FC<PhotoCollageProps> = ({
  photos,
  layout = 'grid',
  durationSec,
  staggerSec = 0.18,
  spring: springName = 'snappy',
  easing = 'easeInOutCubic',
  dividerColor = DEFAULT_GOLD,
  dividerWidth = 6,
  filter,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (photos.length === 0) {
    return <AbsoluteFill style={{ backgroundColor: '#0A1A2E' }} />;
  }

  const totalFrames = Math.max(1, durationSec * fps);

  if (layout === 'carousel') {
    // Each photo gets an equal slice of the duration. Within each slice the
    // outgoing photo flips out (rotateY 0 → 90) over the first 25%, then the
    // incoming photo flips in (rotateY -90 → 0) over the next 25%, and rests
    // for the remainder.
    const slice = totalFrames / photos.length;
    const tNorm = frame / slice;
    const idx = clamp(Math.floor(tNorm), 0, photos.length - 1);
    const sliceFrame = frame - idx * slice;
    const sliceT = clamp(sliceFrame / slice, 0, 1);

    // Flip-in over first 0.25 of the slice.
    const flipIn = clamp(sliceT / 0.25, 0, 1);
    const flipEased = applyEasing(flipIn, easing);
    const rotY = (1 - flipEased) * -90; // -90 → 0
    const sc = 0.92 + 0.08 * flipEased;

    const photo = photos[idx];

    return (
      <AbsoluteFill
        style={{
          perspective: '1600px',
          backgroundColor: '#0A1A2E',
          overflow: 'hidden',
        }}
      >
        <AbsoluteFill
          style={{
            transform: `rotateY(${rotY.toFixed(2)}deg) scale(${sc.toFixed(4)})`,
            transformOrigin: 'center center',
            backfaceVisibility: 'hidden',
            willChange: 'transform',
          }}
        >
          <Img
            src={photo.src}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: photo.objectPosition ?? 'center',
              filter,
            }}
          />
        </AbsoluteFill>
        {photo.caption ? (
          <div
            style={{
              position: 'absolute',
              bottom: '8%',
              left: '6%',
              right: '6%',
              opacity: flipEased,
              color: '#fff',
              fontSize: 36,
              fontWeight: 700,
              textShadow: '0 2px 12px rgba(0,0,0,0.7)',
            }}
          >
            {photo.caption}
          </div>
        ) : null}
      </AbsoluteFill>
    );
  }

  // ─── Grid layout ──────────────────────────────────────────────────────────
  const tiles = photos.slice(0, 4);
  const { rows, cols } = gridLayoutFor(tiles.length);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0A1A2E',
        display: 'grid',
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: dividerWidth,
        overflow: 'hidden',
      }}
    >
      {tiles.map((photo, i) => {
        const delayFrames = i * staggerSec * fps;
        const tileFrame = Math.max(0, frame - delayFrames);
        const s = spring({
          frame: tileFrame,
          fps,
          config: SPRING_PRESETS[springName],
        });
        const sc = 0.85 + 0.15 * s;
        return (
          <div
            key={`tile-${i}`}
            style={{
              position: 'relative',
              overflow: 'hidden',
              transform: `scale(${sc.toFixed(4)})`,
              opacity: clamp(s, 0, 1),
              willChange: 'transform, opacity',
              outline: dividerWidth > 0 ? `${dividerWidth / 2}px solid ${dividerColor}` : 'none',
            }}
          >
            <Img
              src={photo.src}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: photo.objectPosition ?? 'center',
                filter,
              }}
            />
            {photo.caption ? (
              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 14,
                  right: 14,
                  color: '#fff',
                  fontSize: 22,
                  fontWeight: 700,
                  textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                }}
              >
                {photo.caption}
              </div>
            ) : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
