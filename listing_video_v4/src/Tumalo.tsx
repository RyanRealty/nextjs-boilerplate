// Tumalo.tsx — 19496 Tumalo Reservoir Rd VIRAL CUT (43s, 14 beats + reveal)
// 1080x1920 portrait, 30fps. List price $1,350,000, Active.
//
// Photo plan (per VIDEO_PRODUCTION_SKILL.md):
//   Hook (0-3s)        : #1 hero ext at dusk + address overlay (vignetteLetterbox)
//   Intrigue (3-8.5s)  : #16 Three Sisters thru window, #14 Sisters from deck
//   Tour (8.5-21s)     : #26 great room, #28 kitchen, #31 primary, #22 covered deck
//   Pattern interrupt  : #58 lifestyle wildlife — water feature, DEER (50%), wildflowers, eagle
//   Reveal (38-43s)    : kinetic stat — $1,350,000 + 19496 Tumalo Reservoir Rd
//
// Beat #9 (deer 21-24s) lands the 50% pattern interrupt — two mule deer
// bucks standing in the yard is the scroll-stopper. Beat #11 (eagle 26.5s)
// is the second wildlife interrupt. Together they sell the property's
// natural setting in a way no MLS still can.
//
// All 14 photos are unique (no reuse rule). Seven distinct camera moves
// across the BEATS array. No logo / no agent name / no phone in frame.

import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { CHARCOAL, CREAM, GOLD, NAVY, FONT_SANS } from './brand';
import { PhotoBeat } from './PhotoBeat';
import { CameraMoveOpts } from './cameraMoves';
import { clamp, easeOutCubic } from './easing';

const FPS = 30;
export const TUMALO_TOTAL_SEC = 43.0;

type BeatDef = {
  photo: string;
  startSec: number;
  durationSec: number;
  move: CameraMoveOpts;
  vignetteLetterbox?: boolean;
  objectPosition?: string;
  title?: string;
  sub?: string;
  titlePosition?: 'top' | 'bottom' | 'center' | 'none';
  crossfadeIn?: number;
  crossfadeOut?: number;
};

const BEATS: BeatDef[] = [
  // === HOOK (0-3s) — address overlay on hero exterior at dusk =============
  // Push_in engages by frame 12 (0.4s). vignetteLetterbox keeps the wide
  // dusk-back-of-house intact with blurred extension into top/bottom dead
  // space. Title fade lands by 0.5s.
  { photo: 'v5_library/tumalo/1-DJI_aerial_hero.jpg',
    startSec: 0, durationSec: 3,
    move: { move: 'push_in', focal: 'center', intensity: 0.7 },
    vignetteLetterbox: true,
    title: '19496 TUMALO RESERVOIR',
    sub: 'BEND · OREGON',
    titlePosition: 'center',
    crossfadeIn: 0 },

  // === INTRIGUE (3-8.5s) — the view that defines the property ============
  // #16 = Three Sisters framed by interior window. THE hero shot.
  // vignetteLetterbox keeps all three peaks visible (cover-mode would crop
  // out the two left peaks). Mild push_in for forward motion without
  // re-cropping the frame.
  { photo: 'v5_library/tumalo/16-twilight_DSC9560.jpg',
    startSec: 3, durationSec: 3,
    move: { move: 'push_in', focal: 'center', intensity: 0.5 },
    vignetteLetterbox: true },
  // #14 = Three Sisters at sunrise from deck. Wide-aspect photo (1.78),
  // slow horizontal pan reveals the full peak silhouette.
  { photo: 'v5_library/tumalo/14-twilight_untitled.jpg',
    startSec: 6, durationSec: 2.5,
    move: { move: 'slow_pan_lr', focal: 'center', intensity: 1.0 } },

  // === TOUR (8.5-21s) — great room → kitchen → primary → covered deck ====
  // 25% mark = 10.75s lands inside Beat 4 (great room). New visual register
  // — interior reveal after exterior + view shots.
  { photo: 'v5_library/tumalo/26-int_DSC8932.jpg',
    startSec: 8.5, durationSec: 2.5,
    move: { move: 'gimbal_walk', focal: 'center', intensity: 1.0, direction: 'lr' } },
  { photo: 'v5_library/tumalo/28-int_DSC8968.jpg',
    startSec: 11, durationSec: 2.5,
    move: { move: 'push_in', focal: 'center', intensity: 1.0 } },
  { photo: 'v5_library/tumalo/31-int_DSC8994.jpg',
    startSec: 13.5, durationSec: 2.5,
    move: { move: 'gimbal_walk', focal: 'center', intensity: 0.9, direction: 'rl' } },
  { photo: 'v5_library/tumalo/22-int_DSC8333.jpg',
    startSec: 16, durationSec: 2.5,
    move: { move: 'slow_pan_lr', focal: 'center', intensity: 0.9 } },

  // === LIFESTYLE / 50% PATTERN INTERRUPT (18.5-29.5s) ====================
  // Grounds + wildlife sequence. 50% mark = 21.5s lands inside Beat 9
  // (the deer). Two mule-deer bucks standing in the yard. This is the
  // scroll-stopper — pure register shift from architecture to the wild
  // setting that the home sits inside.
  { photo: 'v5_library/tumalo/lifestyle_water_feature.jpg',
    startSec: 18.5, durationSec: 2.5,
    move: { move: 'slow_pan_bt', focal: 'center', intensity: 0.8 },
    objectPosition: '60% 50%' },
  // Deer: low push_in so both bucks stay in frame. objectPosition biases
  // the cover-crop slightly downward to center on the antlers/faces, not
  // the empty top of the photo.
  { photo: 'v5_library/tumalo/lifestyle_deer.jpg',
    startSec: 21, durationSec: 3,
    move: { move: 'push_in', focal: 'center', intensity: 0.4 },
    objectPosition: '50% 65%' },
  { photo: 'v5_library/tumalo/lifestyle_wildflowers.jpg',
    startSec: 24, durationSec: 2.5,
    move: { move: 'slow_pan_rl', focal: 'center', intensity: 1.0 } },
  // Eagle is portrait-orientation (1500x2000). vignetteLetterbox lets the
  // sky extend into the side dead-space without bars.
  { photo: 'v5_library/tumalo/lifestyle_eagle.jpg',
    startSec: 26.5, durationSec: 3,
    move: { move: 'push_in', focal: 'center', intensity: 0.6 },
    objectPosition: '50% 35%' },

  // === CLOSING AERIALS (29.5-38s) ========================================
  // Top-down geometry → daytime full reveal → broad mountain landscape.
  { photo: 'v5_library/tumalo/58-DJI_aerial_4.jpg',
    startSec: 29.5, durationSec: 2.5,
    move: { move: 'push_in', focal: 'center', intensity: 0.6 } },
  { photo: 'v5_library/tumalo/2-DJI_aerial_2.jpg',
    startSec: 32, durationSec: 2.5,
    move: { move: 'pull_out', focal: 'center', intensity: 0.6 } },
  // Final beat: dusk drone wide with the Three Sisters silhouette beyond
  // the property. Slow R-to-L pan, slightly longer dwell into the reveal.
  { photo: 'v5_library/tumalo/9-DJI_aerial_3.jpg',
    startSec: 34.5, durationSec: 3.5,
    move: { move: 'slow_pan_rl', focal: 'center', intensity: 0.9 },
    crossfadeOut: 0 },
];

// ─── Reveal — kinetic stat moment, no brand line ─────────────────────────
const RevealInner: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const navyAlpha = clamp(t / 0.5, 0, 1);
  const statusAlpha = clamp((t - 0.6) / 0.6, 0, 1);
  const statusScale = 1.2 - 0.2 * easeOutCubic(clamp((t - 0.6) / 0.6, 0, 1));
  const priceAlpha = clamp((t - 1.4) / 0.7, 0, 1);
  const priceTranslate = (1 - easeOutCubic(clamp((t - 1.4) / 0.7, 0, 1))) * 16;
  const addressAlpha = clamp((t - 2.3) / 0.7, 0, 1);
  const addressTranslate = (1 - easeOutCubic(clamp((t - 2.3) / 0.7, 0, 1))) * 12;
  return (
    <AbsoluteFill style={{ background: NAVY, opacity: navyAlpha }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 60,
            fontWeight: 700,
            color: GOLD,
            letterSpacing: '0.18em',
            opacity: statusAlpha,
            transform: `scale(${statusScale})`,
            marginBottom: 18,
          }}
        >
          FOR SALE
        </div>
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 124,
            fontWeight: 400,
            color: CREAM,
            letterSpacing: '-0.01em',
            opacity: priceAlpha,
            transform: `translateY(${priceTranslate}px)`,
            marginBottom: 32,
          }}
        >
          $1,350,000
        </div>
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            fontWeight: 600,
            color: CREAM,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            opacity: addressAlpha,
            transform: `translateY(${addressTranslate}px)`,
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          19496 TUMALO RESERVOIR RD
          <br />
          BEND, OREGON
        </div>
      </div>
    </AbsoluteFill>
  );
};

const BeatWrapper: React.FC<{ beat: BeatDef }> = ({ beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <PhotoBeat
      photo={beat.photo}
      local={frame / fps}
      fps={fps}
      durationSec={beat.durationSec}
      move={beat.move}
      historic={false}
      vignetteLetterbox={beat.vignetteLetterbox}
      objectPosition={beat.objectPosition}
      title={beat.title}
      sub={beat.sub}
      titlePosition={beat.titlePosition ?? 'none'}
      scrim={beat.title ? 'full' : 'none'}
      crossfadeIn={beat.crossfadeIn ?? 0.4}
      crossfadeOut={beat.crossfadeOut ?? 0}
    />
  );
};

export const Tumalo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: CHARCOAL }}>
      {BEATS.map((beat, i) => (
        <Sequence
          key={i}
          from={Math.round(Math.max(0, beat.startSec - 0.5) * FPS)}
          durationInFrames={Math.round((beat.durationSec + 0.5) * FPS)}
        >
          <BeatWrapper beat={beat} />
        </Sequence>
      ))}

      <Sequence from={Math.round(38 * FPS)} durationInFrames={Math.round(5 * FPS)}>
        <RevealInner />
      </Sequence>
    </AbsoluteFill>
  );
};
