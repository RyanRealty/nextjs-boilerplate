// Listing.tsx — Schoolhouse v5.9 VIRAL REELS CUT (45s, HOME-FOCUSED)
// 1080×1920 portrait, 30fps, 45s total
//
// v5.9 changes vs v5.8:
//   - ALL Vandevert Ranch history removed (Sadie, William, rockpile, surrey,
//     footbridge, barn 1970, elk-fording-river). Video is HOME only.
//   - Hook VO replaced: "A Jerry Locati design. On the Little Deschutes."
//     (covers Locati mention + location in one line, no longer the
//     "never hit the market" register).
//   - NO music. VO-only audio (Matt adds music in post).
//   - 14 photo beats. New: #15 main living, #24 kitchen island, #63 drone alt.
//   - Pattern interrupt at 50% (24s) = drone aerial #63 cuts the interior tour.
//   - Reveal in final 15.5% (38–45s).
//   - Per VIRAL_VIDEO_CONSTRAINTS.md.

import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { CHARCOAL, CREAM, GOLD, NAVY, FONT_SANS } from './brand';
import { PhotoBeat, CinemagraphMotion } from './PhotoBeat';
import { CameraMoveOpts } from './cameraMoves';
import { clamp, easeOutCubic } from './easing';

const FPS = 30;
export const LISTING_TOTAL_SEC = 45.0;

const LOCATI_CREDIT = 'Photo: Locati Architects';

type BeatDef = {
  photo: string;
  startSec: number;
  durationSec: number;
  move: CameraMoveOpts;
  historic: boolean;
  cinemagraph?: CinemagraphMotion;
  vignetteLetterbox?: boolean;
  credit?: string;
  objectPosition?: string;
  title?: string;
  sub?: string;
  titlePosition?: 'top' | 'bottom' | 'center' | 'none';
  crossfadeIn?: number;
  crossfadeOut?: number;
};

const BEATS: BeatDef[] = [
  // === HOOK (0-3s) — address overlay on hero exterior ======================
  // Title fade lands by 0.5s; VO "A Jerry Locati design. On the Little Deschutes."
  // plays 0.2-4.8s (audio bleeds into Beat 2 — that's intentional, music-bed
  // free design carries it).
  { photo: 'v5_library/modern/2-web-or-mls-_DSC1055.jpg',
    startSec: 0, durationSec: 3,
    move: { move: 'still', focal: 'center', intensity: 1.0 },
    historic: false,
    vignetteLetterbox: true,
    title: '56111 SCHOOLHOUSE ROAD',
    sub: 'Vandevert Ranch · Bend, OR',
    titlePosition: 'center',
    crossfadeIn: 0 },

  // === Hero interiors front-loaded (3-21.5s) ===============================
  // Window + Mt. Bachelor and view-doors first to lock retention by 5s.
  { photo: 'v5_library/modern/11-web-or-mls-_DSC0950.jpg',
    startSec: 3, durationSec: 3,
    move: { move: 'push_in', focal: 'center', intensity: 1.6 },
    historic: false,
    cinemagraph: { mask: 'v5_library/masks/mask_window_sky.png', type: 'sky_drift' } },
  { photo: 'v5_library/modern/27-web-or-mls-_DSC0961.jpg',
    startSec: 6, durationSec: 3,
    move: { move: 'push_in', focal: 'center', intensity: 1.3 },
    historic: false },
  { photo: 'v5_library/modern/5-web-or-mls-_DSC0771.jpg',
    startSec: 9, durationSec: 2.5,
    move: { move: 'push_in', focal: 'center', intensity: 1.5 },
    historic: false },
  { photo: 'v5_library/modern/13-web-or-mls-_DSC0810.jpg',
    startSec: 11.5, durationSec: 2.5,
    move: { move: 'gimbal_walk', focal: 'center', intensity: 1.0, direction: 'lr' },
    historic: false },
  { photo: 'v5_library/modern/17-web-or-mls-_DSC0836.jpg',
    startSec: 14, durationSec: 2.5,
    move: { move: 'gimbal_walk', focal: 'center', intensity: 1.0, direction: 'lr' },
    historic: false },
  // NEW — kitchen island + walkout to Cascade view
  { photo: 'v5_library/modern/24-web-or-mls-_DSC0871.jpg',
    startSec: 16.5, durationSec: 2.5,
    move: { move: 'gimbal_walk', focal: 'center', intensity: 0.9, direction: 'rl' },
    historic: false },
  // NEW — main living with vaulted timber ceilings
  { photo: 'v5_library/modern/15-web-or-mls-_DSC0831.jpg',
    startSec: 19, durationSec: 2.5,
    move: { move: 'push_in', focal: 'center', intensity: 0.6 },
    historic: false },
  { photo: 'v5_library/modern/25-web-or-mls-_DSC0898.jpg',
    startSec: 21.5, durationSec: 2.5,
    move: { move: 'gimbal_walk', focal: 'center', intensity: 0.9, direction: 'rl' },
    historic: false },

  // === 50% mark (24s) — pattern interrupt: drone aerial ====================
  // Sharp register shift from interior closeups to exterior wide. New camera
  // language signals the algorithm "watch keeps changing — keep watching."
  { photo: 'v5_library/modern/63-web-or-mls-DJI_20260127142841_0096_D.jpg',
    startSec: 24, durationSec: 3,
    move: { move: 'pull_out', focal: 'center', intensity: 0.6 },
    historic: false },

  // === Closing interior tour (27-35s) =====================================
  { photo: 'v5_library/modern/28-web-or-mls-_DSC1010.jpg',
    startSec: 27, durationSec: 2.5,
    move: { move: 'gimbal_walk', focal: 'center', intensity: 0.9, direction: 'lr' },
    historic: false },
  { photo: 'v5_library/modern/30-web-or-mls-_DSC0930.jpg',
    startSec: 29.5, durationSec: 2.5,
    move: { move: 'gimbal_walk', focal: 'center', intensity: 0.8, direction: 'lr' },
    historic: false },
  { photo: 'v5_library/modern/52-web-or-mls-_DSC1022.jpg',
    startSec: 32, durationSec: 3,
    move: { move: 'push_in', focal: 'center', intensity: 0.4 },
    historic: false,
    cinemagraph: { mask: 'v5_library/masks/mask_fire_patio.png', type: 'flame_flicker' },
    objectPosition: '88% 50%' },

  // === Closing visual (35-38s) — pond aerial of the home ==================
  { photo: 'v5_library/modern/62-web-or-mls-DJI_20260127142754_0088_D.jpg',
    startSec: 35, durationSec: 3,
    move: { move: 'gimbal_walk', focal: 'center', intensity: 0.5, direction: 'lr' },
    historic: false,
    crossfadeOut: 0 },
];

// ─── Reveal — kinetic stat moment, no brand line ─────────────────────────
const RevealInner: React.FC<{ durationSec: number }> = ({ durationSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const navyAlpha = clamp(t / 0.5, 0, 1);
  const pendingAlpha = clamp((t - 0.6) / 0.6, 0, 1);
  const pendingScale = 1.2 - 0.2 * easeOutCubic(clamp((t - 0.6) / 0.6, 0, 1));
  const priceAlpha = clamp((t - 1.4) / 0.7, 0, 1);
  const priceTranslate = (1 - easeOutCubic(clamp((t - 1.4) / 0.7, 0, 1))) * 16;
  const addressAlpha = clamp((t - 2.3) / 0.7, 0, 1);
  const addressTranslate = (1 - easeOutCubic(clamp((t - 2.3) / 0.7, 0, 1))) * 12;
  return (
    <AbsoluteFill style={{ background: NAVY, opacity: navyAlpha }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 60, fontWeight: 700, color: GOLD, letterSpacing: '0.18em', opacity: pendingAlpha, transform: `scale(${pendingScale})`, marginBottom: 18 }}>PENDING</div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 110, fontWeight: 400, color: CREAM, letterSpacing: '-0.01em', opacity: priceAlpha, transform: `translateY(${priceTranslate}px)`, marginBottom: 32 }}>$3,025,000</div>
        <div style={{ fontFamily: FONT_SANS, fontSize: 26, fontWeight: 600, color: CREAM, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: addressAlpha, transform: `translateY(${addressTranslate}px)`, textAlign: 'center', lineHeight: 1.5 }}>
          56111 SCHOOLHOUSE ROAD
          <br />
          VANDEVERT RANCH
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
      historic={beat.historic}
      vignetteLetterbox={beat.vignetteLetterbox}
      cinemagraph={beat.cinemagraph}
      credit={beat.credit}
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

export const Listing: React.FC = () => {
  // VO only — no music bed. Matt adds music in post.
  // 2 lines:
  //   v59_hook (4.62s) — "A Jerry Locati design. On the Little Deschutes."
  //   v56_s11  (5.28s) — "Not every story starts on the market. This one
  //                       started with a conversation."
  const VO = [
    { src: 'audio/v59_hook.mp3', startSec: 0.2  },  // 4.62s — hook (Locati + location)
    { src: 'audio/v56_s11.mp3',  startSec: 32.5 },  // 5.28s — closing line
  ];

  return (
    <AbsoluteFill style={{ background: CHARCOAL }}>
      {VO.map((v, i) => (
        <Sequence key={i} from={Math.round(v.startSec * FPS)} durationInFrames={Math.round(15 * FPS)}>
          <Audio src={staticFile(v.src)} volume={1.0} />
        </Sequence>
      ))}

      {BEATS.map((beat, i) => (
        <Sequence
          key={i}
          from={Math.round(Math.max(0, beat.startSec - 0.5) * FPS)}
          durationInFrames={Math.round((beat.durationSec + 0.5) * FPS)}
        >
          <BeatWrapper beat={beat} />
        </Sequence>
      ))}

      <Sequence from={Math.round(38 * FPS)} durationInFrames={Math.round(7 * FPS)}>
        <RevealInner durationSec={7} />
      </Sequence>
    </AbsoluteFill>
  );
};
