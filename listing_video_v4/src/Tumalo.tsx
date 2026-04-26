// Tumalo.tsx — 19496 Tumalo Reservoir Rd VIRAL CUT v2 (45s, 16 beats + reveal)
// 1080x1920 portrait, 30fps. List price $1,350,000, Active.
//
// v2 changes (vs v1):
//   - Added MLS photos #30 (kitchen wide), #45 (deck w/ view, hot tub),
//     #56 (aerial 3/4 angle). 13 MLS picks total.
//   - Removed lifestyle deer photo. 3 lifestyle photos remain
//     (water feature, wildflowers, eagle).
//   - 16 beats (was 14). #45 takes over the 50% pattern interrupt slot
//     — daytime deck w/ mountain view after closed-room interiors.
//   - Eagle moves to 27-29.5s as the back-half wildlife moment.
//
// Photo plan (per VIDEO_PRODUCTION_SKILL.md):
//   Hook (0-3s)         : #1 hero ext at dusk + address overlay
//   Intrigue (3-8.2s)   : #16 Three Sisters thru window, #14 Sisters from deck
//   Tour (8.2-20.1s)    : #26 great room, #28 kitchen, #30 kitchen wide,
//                         #31 primary, #22 covered deck
//   50% interrupt (#9)  : #45 open deck w/ view + hot tub + mountains
//   Lifestyle (23-29.6s): water feature → wildflowers → eagle
//   Aerials (29.6-40s)  : #56 3/4 → #58 top-down → #2 daytime → #9 dusk wide
//   Reveal (40-45s)     : kinetic stat — $1,350,000 + 19496 Tumalo Reservoir Rd
//
// All 16 photos are unique (no reuse rule). Seven distinct camera moves
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
export const TUMALO_TOTAL_SEC = 45.0;

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

  // === INTRIGUE (3-8.2s) — the view that defines the property ============
  // #16 = Three Sisters framed by interior window. THE hero shot.
  // vignetteLetterbox keeps all three peaks visible (cover-mode would crop
  // out the two left peaks).
  { photo: 'v5_library/tumalo/16-twilight_DSC9560.jpg',
    startSec: 3, durationSec: 2.7,
    move: { move: 'push_in', focal: 'center', intensity: 0.5 },
    vignetteLetterbox: true },
  // #14 = Three Sisters at sunrise from deck. Wide-aspect (1.78), slow
  // horizontal pan reveals the full peak silhouette.
  { photo: 'v5_library/tumalo/14-twilight_untitled.jpg',
    startSec: 5.7, durationSec: 2.5,
    move: { move: 'slow_pan_lr', focal: 'center', intensity: 1.0 } },

  // === TOUR (8.2-20.1s) — great room → kitchen x2 → primary → covered deck
  // 25% mark of 45s = 11.25s lands inside Beat 5 (#28 kitchen). Fresh
  // visual register after the great room.
  { photo: 'v5_library/tumalo/26-int_DSC8932.jpg',
    startSec: 8.2, durationSec: 2.5,
    move: { move: 'gimbal_walk', focal: 'center', intensity: 1.0, direction: 'lr' } },
  { photo: 'v5_library/tumalo/28-int_DSC8968.jpg',
    startSec: 10.7, durationSec: 2.3,
    move: { move: 'push_in', focal: 'center', intensity: 1.0 } },
  // #30 — second kitchen angle (island + appliances + window).
  { photo: 'v5_library/tumalo/30-int_DSC8983.jpg',
    startSec: 13.0, durationSec: 2.3,
    move: { move: 'gimbal_walk', focal: 'center', intensity: 0.9, direction: 'rl' } },
  { photo: 'v5_library/tumalo/31-int_DSC8994.jpg',
    startSec: 15.3, durationSec: 2.5,
    move: { move: 'gimbal_walk', focal: 'center', intensity: 0.9, direction: 'rl' } },
  { photo: 'v5_library/tumalo/22-int_DSC8333.jpg',
    startSec: 17.8, durationSec: 2.3,
    move: { move: 'slow_pan_lr', focal: 'center', intensity: 0.9 } },

  // === 50% PATTERN INTERRUPT (20.1-23.1s) — open deck + hot tub + view ===
  // 50% mark of 45s = 22.5s falls inside this beat. Sharp register shift
  // from indoor architecture to wide-open daytime deck with the mountains
  // peeking through. Slow R-to-L pan walks the eye across the deck and
  // out to the view.
  { photo: 'v5_library/tumalo/45-int_DSC9031.jpg',
    startSec: 20.1, durationSec: 3.0,
    move: { move: 'slow_pan_rl', focal: 'center', intensity: 1.0 } },

  // === LIFESTYLE (23.1-29.6s) — grounds + wildlife =======================
  { photo: 'v5_library/tumalo/lifestyle_water_feature.jpg',
    startSec: 23.1, durationSec: 2.0,
    move: { move: 'slow_pan_bt', focal: 'center', intensity: 0.8 },
    objectPosition: '60% 50%' },
  { photo: 'v5_library/tumalo/lifestyle_wildflowers.jpg',
    startSec: 25.1, durationSec: 2.0,
    move: { move: 'slow_pan_rl', focal: 'center', intensity: 1.0 } },
  // Eagle: portrait-orientation photo. Mild push_in, biased crop.
  { photo: 'v5_library/tumalo/lifestyle_eagle.jpg',
    startSec: 27.1, durationSec: 2.5,
    move: { move: 'push_in', focal: 'center', intensity: 0.6 },
    objectPosition: '50% 35%' },

  // === CLOSING AERIALS (29.6-40s) ========================================
  // 3/4 angle → top-down geometry → daytime full reveal → broad mountain
  // landscape into reveal.
  { photo: 'v5_library/tumalo/56-DJI_aerial_5.jpg',
    startSec: 29.6, durationSec: 2.4,
    move: { move: 'pull_out', focal: 'center', intensity: 0.5 } },
  { photo: 'v5_library/tumalo/58-DJI_aerial_4.jpg',
    startSec: 32.0, durationSec: 2.4,
    move: { move: 'push_in', focal: 'center', intensity: 0.6 } },
  { photo: 'v5_library/tumalo/2-DJI_aerial_2.jpg',
    startSec: 34.4, durationSec: 2.6,
    move: { move: 'gimbal_walk', focal: 'center', intensity: 0.8, direction: 'lr' } },
  // Final beat: dusk drone wide with the Three Sisters silhouette beyond
  // the property. Slow R-to-L pan into the reveal.
  { photo: 'v5_library/tumalo/9-DJI_aerial_3.jpg',
    startSec: 37.0, durationSec: 3.0,
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

      <Sequence from={Math.round(40 * FPS)} durationInFrames={Math.round(5 * FPS)}>
        <RevealInner />
      </Sequence>
    </AbsoluteFill>
  );
};
