// BeaumontDrive — listing reel for 20702 Beaumont Dr, Bend.
//
// $525,000 | 3bd / 2ba | 1,803 sqft | Northpointe | Built 2004
// MLS #220215040
//
// v2 — Matt-approved 6-photo set:
//   • Round 1 enhanced: #21 (front exterior), #27 (neighborhood aerial)
//   • Round 2 corrected: #4 (living room), #8 (bathroom),
//                        #23 (drone with Cascades), #34 (overhead)
//   Photos sourced from public/v5_library/beaumont_v2/ — separate from the
//   beaumont/ working dir so we can iterate without disturbing prior renders.
//
// Music: beaumont_music.mp3 — fresh MusicGen instrumental, distinct from
//   music_bed.mp3 (Schoolhouse), sunstone_music.mp3, tumalo_bluegrass.mp3.
//
// Six distinct camera-move primitives, no two consecutive the same:
//   1 — drone with Cascades  (#23) → PUSH-IN (hook)
//   2 — front exterior       (#21) → LATERAL PARALLAX L→R
//   3 — living room          (#04) → PULL-OUT
//   4 — bathroom             (#08) → VERTICAL REVEAL UP
//   5 — overhead             (#34) → LATERAL PARALLAX R→L
//   6 — neighborhood aerial  (#27) → ORBIT FAKE / hero hold (overlay bed)
//
// 21s portrait, 1080×1920 @ 30fps. Same KenBurnsBeat + LuxuryListingOverlay
// pattern as SchoolhousePending / SunstoneLoop / TumaloReservoir.

import React from 'react';
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { CHARCOAL } from './brand';
import { KenBurnsBeat } from './SchoolhousePending';
import { LuxuryListingOverlay } from './SunstoneLoop';

export const BEAUMONT_TOTAL_SEC = 21.0;

// ─── Photo schedule ─────────────────────────────────────────────────────────

type Beat = {
  photo: string;
  startSec: number;
  durSec: number;
  scaleFrom: number;
  scaleTo: number;
  objectPosition?: string;
  transformOrigin?: string;
  translateXTo?: number;
  translateYTo?: number;
};

const BEATS: Beat[] = [
  {
    // 1 — drone with Cascades (Matt-approved R2). PUSH-IN: slow approach
    // into the home. Mountain peaks remain visible upper-left.
    photo: 'v5_library/beaumont_v2/23-drone-cascades.jpg',
    startSec: 0,
    durSec: 4.0,
    scaleFrom: 1.00,
    scaleTo: 1.07,
    transformOrigin: '50% 60%',
  },
  {
    // 2 — front exterior (Matt-approved R1). LATERAL PARALLAX L→R: track
    // across the home from driveway to entry side.
    photo: 'v5_library/beaumont_v2/21-front-exterior.jpg',
    startSec: 2.5,
    durSec: 4.0,
    scaleFrom: 1.05,
    scaleTo: 1.05,
    translateXTo: 28,
    transformOrigin: '50% 50%',
  },
  {
    // 3 — living room (Matt-approved R2). PULL-OUT: scale 1.06 → 1.00
    // reveals the fireplace, vaulted ceiling, and full carpet expanse.
    photo: 'v5_library/beaumont_v2/04-living-room.jpg',
    startSec: 5.0,
    durSec: 4.0,
    scaleFrom: 1.06,
    scaleTo: 1.00,
    transformOrigin: '40% 50%',
  },
  {
    // 4 — bathroom (Matt-approved R2). VERTICAL REVEAL UP: tilt up from
    // the tub/toilet area to the vanity + mirror.
    photo: 'v5_library/beaumont_v2/08-bathroom.jpg',
    startSec: 7.5,
    durSec: 4.0,
    scaleFrom: 1.04,
    scaleTo: 1.04,
    translateYTo: -22,
    transformOrigin: '50% 100%',
  },
  {
    // 5 — overhead drone (Matt-approved R2). LATERAL PARALLAX R→L: opposite
    // direction from beat 2 for cadence variety.
    photo: 'v5_library/beaumont_v2/34-overhead.jpg',
    startSec: 10.0,
    durSec: 4.0,
    scaleFrom: 1.05,
    scaleTo: 1.05,
    translateXTo: -26,
    transformOrigin: '50% 50%',
  },
  {
    // 6 — neighborhood aerial (Matt-approved R1). ORBIT FAKE: subtle scale
    // + origin drift on the closing card-bed. Held 8.5s for the address
    // + price + CTA + logo cascade. Pin marker is centered in the frame.
    photo: 'v5_library/beaumont_v2/27-neighborhood-aerial.jpg',
    startSec: 12.5,
    durSec: 8.5,
    scaleFrom: 1.02,
    scaleTo: 1.06,
    transformOrigin: '50% 55%',
    translateXTo: 14,
  },
];

// ─── Main composition ──────────────────────────────────────────────────────

export const BeaumontDrive: React.FC = () => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const tSec = frame / fps;

  // Ambient music — fresh MusicGen track. Fade in/out.
  const totalFrames = Math.round(BEAUMONT_TOTAL_SEC * fps);
  const musicVolume = (f: number) => {
    if (f < 18) return interpolate(f, [0, 18], [0, 0.32]);
    if (f > totalFrames - 30) return interpolate(f, [totalFrames - 30, totalFrames], [0.32, 0]);
    return 0.32;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: CHARCOAL }}>
      <Audio src={staticFile('audio/beaumont_music.mp3')} volume={musicVolume} />

      {BEATS.map((b, i) => {
        const fromFrame = Math.round(b.startSec * fps);
        const durFrames = Math.round(b.durSec * fps);
        const isFirst = i === 0;
        const isLast = i === BEATS.length - 1;
        return (
          <Sequence
            key={i}
            from={fromFrame}
            durationInFrames={durFrames}
            layout="none"
          >
            <KenBurnsBeat
              photo={b.photo}
              local={Math.max(0, tSec - b.startSec)}
              fps={fps}
              durationSec={b.durSec}
              scaleFrom={b.scaleFrom}
              scaleTo={b.scaleTo}
              objectPosition={b.objectPosition}
              transformOrigin={b.transformOrigin}
              translateXTo={b.translateXTo}
              translateYTo={b.translateYTo}
              crossfadeIn={isFirst ? 0 : 1.5}
              crossfadeOut={isLast ? 0 : 1.5}
            />
          </Sequence>
        );
      })}

      <LuxuryListingOverlay
        t={tSec}
        startSec={0.5}
        headlineLine1="New Listing"
        headlineLine2="in Northpointe"
        addressLine1="20702 BEAUMONT DRIVE"
        subdivision="NORTHPOINTE"
        addressLine2="BEND, OREGON"
        price="$525,000"
        cta="3 bedrooms · 2 baths · 1,803 sqft"
        logoSrc="brand/stacked_logo_champagne.png"
        logoBandPosition="top"
      />
    </AbsoluteFill>
  );
};
