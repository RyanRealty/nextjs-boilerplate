// Listing.tsx — Schoolhouse v5.1 full composition
// 1080×1920 portrait, 30fps, 122s total
// 23 photo beats with per-beat motion variety + 11 documentary-discipline VO sequences
//
// Round 3 v3 critique fix: every line maps to a specific beat.
// Photo-to-cinema-motion fix: per-photo motion is content-aware, not generic 3-anchor pan.
//
// Timeline (render seconds):
//   0-7s        OpenSequence (1892. → VANDEVERT RANCH → boundary glow)
//   7-114s      23 photo beats (acts 1-7)
//   114-119s    ClosingReveal (PENDING / $3,025,000 / REPRESENTED BY RYAN REALTY)
//   119-122s    BrandOutro (navy + stacked logo + sting)

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
import { CHARCOAL, CREAM, GOLD, NAVY, FONT_SANS } from './brand';
import { BrandOutro } from './BrandOutro';
import { OpenSequence } from './OpenSequence';
import { PhotoBeat } from './PhotoBeat';
import { clamp, easeOutCubic } from './easing';

const FPS = 30;
export const LISTING_TOTAL_SEC = 122.0;

// ─── Per-beat motion plan ────────────────────────────────────────────────────
// Each beat's motion is chosen for its photo content, NOT a default.

type BeatDef = {
  photo: string;
  startSec: number;
  durationSec: number;
  move: import('./cameraMoves').CameraMoveOpts;
  historic: boolean;
};

const BEATS: BeatDef[] = [
  // === Act 1: Family ===========================================================
  { photo: 'v5_library/historic/vr_sadie_girl.jpg',
    startSec: 7, durationSec: 5.5,
    move: { move: 'push_counter', focal: 'center', intensity: 0.6, counterDir: 'left' },
    historic: true },
  { photo: 'v5_library/historic/03_william_p_with_cane.jpg',
    startSec: 12.5, durationSec: 5.5,
    move: { move: 'push_counter', focal: 'center', intensity: 0.6, counterDir: 'right' },
    historic: true },
  { photo: 'v5_library/historic/09_family_rockpile.jpg',
    startSec: 18, durationSec: 5.5,
    move: { move: 'slow_pan_lr', focal: 'center', intensity: 1.0 },
    historic: true },

  // === Act 2: Ranch life =======================================================
  { photo: 'v5_library/historic/vr_workshop_barn_looking_east.jpg',
    startSec: 23.5, durationSec: 4,
    move: { move: 'push_in', focal: 'center', intensity: 1.5 },
    historic: true },
  { photo: 'v5_library/historic/vr_people_with_surrey.jpg',
    startSec: 27.5, durationSec: 4,
    move: { move: 'slow_pan_rl', focal: 'center', intensity: 1.0 },
    historic: true },
  { photo: 'v5_library/historic/07_sheep_with_cattle.jpg',
    startSec: 31.5, durationSec: 4,
    move: { move: 'multi_point_pan', focal: 'center', intensity: 1.0,
      anchors: [{x:-3,y:0,scale:1.10},{x:0,y:0,scale:1.14},{x:4,y:1,scale:1.16}] },
    historic: true },
  { photo: 'v5_library/historic/vr_sheep_dip.jpg',
    startSec: 35.5, durationSec: 7,
    move: { move: 'slow_pan_lr', focal: 'center', intensity: 1.6 },
    historic: true },

  // === Act 3: Bridge to modern =================================================
  { photo: 'v5_library/historic/vr_barn_newberry_crater.jpg',
    startSec: 42.5, durationSec: 5,
    move: { move: 'push_in', focal: 'center', intensity: 0.5 },
    historic: false },

  // === Act 4: Architect & entry ================================================
  { photo: 'v5_library/historic/architect_locati.jpg',
    startSec: 47.5, durationSec: 5.5,
    move: { move: 'push_counter', focal: 'center', intensity: 1.0, counterDir: 'left' },
    historic: true },
  { photo: 'v5_library/modern/5-web-or-mls-_DSC0771.jpg',
    startSec: 53, durationSec: 4.5,
    move: { move: 'push_in', focal: 'center', intensity: 2.2 },
    historic: false },

  // === Act 5: Modern home tour =================================================
  { photo: 'v5_library/modern/2-web-or-mls-_DSC1055.jpg',
    startSec: 57.5, durationSec: 4,
    move: { move: 'slow_pan_lr', focal: 'center', intensity: 0.6 },
    historic: false },
  { photo: 'v5_library/modern/11-web-or-mls-_DSC0950.jpg',
    startSec: 61.5, durationSec: 5,
    move: { move: 'push_in', focal: 'center', intensity: 1.8 },
    historic: false },
  { photo: 'v5_library/modern/13-web-or-mls-_DSC0810.jpg',
    startSec: 66.5, durationSec: 5,
    move: { move: 'push_counter', focal: 'center-bottom', intensity: 0.8, counterDir: 'left' },
    historic: false },
  { photo: 'v5_library/modern/17-web-or-mls-_DSC0836.jpg',
    startSec: 71.5, durationSec: 4,
    move: { move: 'slow_pan_lr', focal: 'center', intensity: 1.0 },
    historic: false },
  { photo: 'v5_library/modern/25-web-or-mls-_DSC0898.jpg',
    startSec: 75.5, durationSec: 4,
    move: { move: 'slow_pan_rl', focal: 'center', intensity: 1.0 },
    historic: false },
  { photo: 'v5_library/modern/27-web-or-mls-_DSC0961.jpg',
    startSec: 79.5, durationSec: 4.5,
    move: { move: 'push_in', focal: 'center', intensity: 1.5 },
    historic: false },
  { photo: 'v5_library/modern/28-web-or-mls-_DSC1010.jpg',
    startSec: 84, durationSec: 4,
    move: { move: 'slow_pan_lr', focal: 'center', intensity: 0.9 },
    historic: false },
  { photo: 'v5_library/modern/29-web-or-mls-_DSC0925.jpg',
    startSec: 88, durationSec: 4,
    move: { move: 'push_counter', focal: 'center', intensity: 0.7, counterDir: 'left' },
    historic: false },
  { photo: 'v5_library/modern/52-web-or-mls-_DSC1022.jpg',
    startSec: 92, durationSec: 5.5,
    move: { move: 'cinemagraph', focal: 'center', intensity: 0.5 },
    historic: false },

  // === Act 6: Outdoor / wildlife ==============================================
  { photo: 'v5_library/modern/88-web-or-mls-_DSC1105.jpg',
    startSec: 97.5, durationSec: 4,
    move: { move: 'push_in', focal: 'center', intensity: 1.2 },
    historic: false },
  { photo: 'v5_library/modern/86-web-or-mls-_DSC1090.jpg',
    startSec: 101.5, durationSec: 4,
    move: { move: 'slow_pan_lr', focal: 'center', intensity: 1.1 },
    historic: false },

  // === Act 7: River and aerial close ==========================================
  { photo: 'v5_library/snowdrift/Area Guide - Vandevert Ranch - 02.JPG',
    startSec: 105.5, durationSec: 4.5,
    move: { move: 'push_in', focal: 'center', intensity: 0.4 },
    historic: false },
  { photo: 'v5_library/modern/60-web-or-mls-DJI_20260127142652_0078_D.jpg',
    startSec: 110, durationSec: 4,
    move: { move: 'pull_out', focal: 'center', intensity: 1.0 },
    historic: false },
];

// ─── ClosingReveal staged text ───────────────────────────────────────────────
const RevealInner: React.FC<{ durationSec: number }> = ({ durationSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const navyAlpha = clamp(t / 0.4, 0, 1);
  const pendingAlpha = clamp((t - 0.3) / 0.4, 0, 1);
  const pendingScale = 1.2 - 0.2 * easeOutCubic(clamp((t - 0.3) / 0.4, 0, 1));
  const priceAlpha = clamp((t - 0.7) / 0.7, 0, 1);
  const priceTranslate = (1 - easeOutCubic(clamp((t - 0.7) / 0.7, 0, 1))) * 16;
  const brokerageAlpha = clamp((t - 1.5) / 0.7, 0, 1);
  return (
    <AbsoluteFill style={{ background: NAVY, opacity: navyAlpha }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 56, fontWeight: 700, color: GOLD, letterSpacing: '0.16em', opacity: pendingAlpha, transform: `scale(${pendingScale})`, marginBottom: 16 }}>PENDING</div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 96, fontWeight: 400, color: CREAM, letterSpacing: '-0.01em', opacity: priceAlpha, transform: `translateY(${priceTranslate}px)`, marginBottom: 24 }}>$3,025,000</div>
        <div style={{ fontFamily: FONT_SANS, fontSize: 22, fontWeight: 600, color: GOLD, letterSpacing: '0.30em', textTransform: 'uppercase', opacity: brokerageAlpha }}>REPRESENTED BY RYAN REALTY</div>
      </div>
    </AbsoluteFill>
  );
};

// Wrapper that calculates `local` time within each beat for PhotoBeat
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
      letterbox={false}
      scrim="none"
      crossfadeIn={0.5}
      crossfadeOut={0.5}
    />
  );
};

// ─── Main composition ────────────────────────────────────────────────────────
export const Listing: React.FC = () => {
  const musicVolume = (frame: number) => {
    const t = frame / FPS;
    if (t < 7) return interpolate(t, [0, 7], [0.30, 0.55], { extrapolateRight: 'clamp' });
    if (t < 8) return interpolate(t, [7, 8], [0.55, 0.20]);
    if (t < 91) return 0.20;
    if (t < 92) return interpolate(t, [91, 92], [0.20, 0.45]);
    if (t < 117) return 0.45;
    return interpolate(t, [117, 119], [0.45, 0.0], { extrapolateRight: 'clamp' });
  };

  const VO = [
    { src: 'audio/v51_s01.mp3', startSec: 7.0 },
    { src: 'audio/v51_s02.mp3', startSec: 18.5 },
    { src: 'audio/v51_s03.mp3', startSec: 23.5 },
    { src: 'audio/v51_s04.mp3', startSec: 42.5 },
    { src: 'audio/v51_s05.mp3', startSec: 47.5 },
    { src: 'audio/v51_s06.mp3', startSec: 58.0 },
    { src: 'audio/v51_s07.mp3', startSec: 84.2 },
    { src: 'audio/v51_s08.mp3', startSec: 92.5 },
    { src: 'audio/v51_s09.mp3', startSec: 97.7 },
    { src: 'audio/v51_s10.mp3', startSec: 105.7 },
    { src: 'audio/v51_s11.mp3', startSec: 110.2 },
  ];

  return (
    <AbsoluteFill style={{ background: CHARCOAL }}>
      <Audio src={staticFile('audio/music_bed_v5.mp3')} volume={musicVolume} />

      {VO.map((v, i) => (
        <Sequence key={i} from={Math.round(v.startSec * FPS)} durationInFrames={Math.round(15 * FPS)}>
          <Audio src={staticFile(v.src)} volume={1.0} />
        </Sequence>
      ))}

      <Sequence from={0} durationInFrames={Math.round(7 * FPS)}>
        <OpenSequence />
      </Sequence>

      {BEATS.map((beat, i) => (
        <Sequence key={i} from={Math.round(beat.startSec * FPS)} durationInFrames={Math.round(beat.durationSec * FPS)}>
          <BeatWrapper beat={beat} />
        </Sequence>
      ))}

      <Sequence from={Math.round(114 * FPS)} durationInFrames={Math.round(5 * FPS)}>
        <RevealInner durationSec={5} />
      </Sequence>

      <BrandOutro startFrame={Math.round(119 * FPS)} durationSec={3} />
    </AbsoluteFill>
  );
};
