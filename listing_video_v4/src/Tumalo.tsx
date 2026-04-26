// Tumalo.tsx — 19496 Tumalo Reservoir Rd VIRAL CUT v4 ("Music-driven rebuild")
// 1080×1920 portrait, 30fps, 40.0s. List price $1,350,000, Active.
//
// v4 changes vs v3 ("Blonde Waterfall depth-parallax build"):
//   - Music bed: ElevenMusic-generated cinematic ambient @ 117 BPM, 42s
//     (`public/audio/tumalo_v4_music.mp3`). Detected beats live in
//     `tumalo_v4_beats.json`. The intro is atmospheric (0–8s); the main
//     beat section runs 8.08–32.07s; outro decays to 42s. EVERY photo cut
//     8s onward snaps to a detected beat boundary.
//
//   - 11 photo beats (down from 14). Average beat length 3.18s, max 4.08s.
//     User wanted 8–10 beats; 11 is the minimum the asset set supports
//     while keeping no beat over 4.1s. All beats use one of six camera
//     move types — push_in, pull_out, slow_pan_lr, slow_pan_rl, orbit_fake,
//     gimbal_walk — and no two adjacent beats share the same move type.
//
//   - Real Three.js extruded text reveal — "YOUR / MORNING IN / TUMALO"
//     animates through the scene over 3.5s starting at 8.08s. TextGeometry
//     + ExtrudeGeometry, three-point lighting (warm gold key, cool fill,
//     bright rim), camera flythrough that dollies 110→-30 on Z, transparent
//     background composited over Beat 3 (great-room push-in). See
//     MorningTextScene.tsx. Replaces all five prior CSS-3D attempts.
//
//   - Crossfades with light leaks at cut boundaries (NOT hard cuts).
//     Every beat-to-beat transition gets a 0.6s pre-roll crossfade. Light
//     leak overlays bloom at the 25% mark (Beat 3→4 boundary, ~11.1s) and
//     50% mark (Beat 6→7 boundary, ~20.2s). Per Blonde Waterfall study —
//     hard cuts kill the cinematic read; soft transitions keep the energy.
//
//   - DepthParallaxBeat differential dramatically increased (bg 0.30, fg
//     2.10) — Blonde-Waterfall-grade fg/bg separation that reads as real
//     2.5D parallax on a phone screen. Earlier 0.5/1.5 split was too gentle.
//
//   - Reveal block (35–40s, 5.0s) lands on navy with the white stacked
//     logo + FOR SALE pill + price + address. Logo replaces the prior
//     no-logo viral reveal per user instruction.
//
// DATA ACCURACY NOTE (per CLAUDE.md and ANTI_SLOP_MANIFESTO Rule 7):
//   Verified figures (sources documented):
//     - Address: 19496 TUMALO RESERVOIR RD (Supabase StreetNumber+StreetName)
//     - Price:   $1,350,000 (Supabase ListPrice = 1350000)
//     - Status:  FOR SALE (Supabase StandardStatus = "Active")
//     - Specs:   4 BD / 3 BA / 3,218 SF / 5 Acres — confirmed by listing
//                agent (Matt) on 2026-04-26.
//
// Photo set (11 unique, no reuse). Music beats are FROZEN at the values pulled
// from tumalo_v4_beats.json on 2026-04-26 (tempo 117.45). Re-running librosa
// will regenerate slightly different timings; the hard-coded MUSIC_BEATS
// below correspond to tumalo_v4_music.mp3 as shipped.

import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { CHARCOAL, CREAM, GOLD, NAVY, FONT_SANS, FONT_SERIF } from './brand';
import { DepthParallaxBeat } from './components/DepthParallaxBeat';
import { LightLeakTransition } from './components';
import { MorningTextScene, MORNING_TEXT_TOTAL_SEC } from './MorningTextScene';
import { PhotoBeat } from './PhotoBeat';
import { CameraMoveOpts } from './cameraMoves';
import { clamp, easeOutCubic, easeOutQuart } from './easing';

const FPS = 30;
export const TUMALO_TOTAL_SEC = 40.0;

// Detected music beats (frozen — see file header). Used to anchor cuts.
// Beat 0 = 8.0805s, beat 6 = 11.0991s, beat 11 = 13.6069s, etc.
// MUSIC_BEATS[i] corresponds to detected beat indices [0,6,12,18,24,30,36,42,47].
const MUSIC_BEATS = [
  8.0805, 11.0991, 14.1177, 17.1693, 20.2440, 23.2748, 26.3243, 29.3553, 31.5790,
] as const;

type BeatDef = {
  photo: string;
  depthDir: string;
  startSec: number;
  durationSec: number;
  move: CameraMoveOpts;
  vignetteLetterbox?: boolean;
  objectPosition?: string;
  flat?: boolean;
};

const lib = (slug: string) => `v5_library/tumalo/${slug}`;
const depth = (slug: string) => `v5_library/depth/tumalo/${slug}`;

const BEATS: BeatDef[] = [
  // === HOOK (0.0 – 4.0s) — atmospheric intro =================================
  // Beat 1 — hero exterior aerial + address overlay. push_in starts immediately.
  { photo: lib('1-DJI_aerial_hero.jpg'),
    depthDir: depth('1-DJI_aerial_hero'),
    startSec: 0.0, durationSec: 4.0,
    move: { move: 'push_in', focal: 'center', intensity: 0.95 },
    vignetteLetterbox: true },

  // === HOOK (4.0 – 8.08s) — second hero shot + price flash ==================
  // Beat 2 — twilight Sisters thru-window. pull_out reveals the wood mullions
  // framing the snowcapped peaks. Lands at the FIRST detected music beat.
  { photo: lib('16-twilight_DSC9560.jpg'),
    depthDir: depth('16-twilight_DSC9560'),
    startSec: 4.0, durationSec: 4.08,
    move: { move: 'pull_out', focal: 'center', intensity: 0.85 },
    vignetteLetterbox: true },

  // === DROP (8.08s) — music beat 0. 3D text reveal begins. =================
  // Beat 3 — great room push_in. The 3D YOUR MORNING IN TUMALO scene
  // composites on top from 8.08–11.58s (3.5s, ends 0.5s into Beat 4).
  { photo: lib('26-int_DSC8932.jpg'),
    depthDir: depth('26-int_DSC8932'),
    startSec: MUSIC_BEATS[0], durationSec: MUSIC_BEATS[1] - MUSIC_BEATS[0],
    move: { move: 'push_in', focal: 'center', intensity: 1.0 } },

  // === 25% PATTERN INTERRUPT (11.10s) — kitchen + light leak ===============
  // Beat 4 — kitchen detail. orbit_fake adds rotation energy.
  // FLAT: MiDaS reads dark fridge as foreground; aggressive depth multipliers
  // slide it off-frame. Plain PhotoBeat reads cleanly.
  { photo: lib('30-int_DSC8983.jpg'),
    depthDir: depth('30-int_DSC8983'),
    startSec: MUSIC_BEATS[1], durationSec: MUSIC_BEATS[2] - MUSIC_BEATS[1],
    move: { move: 'orbit_fake', focal: 'center', intensity: 0.85 },
    flat: true },

  // === TOUR (14.12 – 17.17s) — primary suite ================================
  // Beat 5 — pull_out reveals primary suite scale.
  { photo: lib('31-int_DSC8994.jpg'),
    depthDir: depth('31-int_DSC8994'),
    startSec: MUSIC_BEATS[2], durationSec: MUSIC_BEATS[3] - MUSIC_BEATS[2],
    move: { move: 'pull_out', focal: 'center', intensity: 0.7 } },

  // === TOUR (17.17 – 20.24s) — covered porch ===============================
  // Beat 6 — slow_pan_lr along the covered porch.
  { photo: lib('22-int_DSC8333.jpg'),
    depthDir: depth('22-int_DSC8333'),
    startSec: MUSIC_BEATS[3], durationSec: MUSIC_BEATS[4] - MUSIC_BEATS[3],
    move: { move: 'slow_pan_lr', focal: 'center', intensity: 1.0 } },

  // === 50% PATTERN INTERRUPT (20.24s) — open deck + light leak =============
  // Beat 7 — open deck w/ view. slow_pan_rl reverses the previous pan
  // direction (perceptual energy break). Light leak fires at boundary.
  // FLAT: open deck has high sky-vs-foliage depth contrast that produces
  // parallax-tear gap artifacts at any pan multiplier above 1.5×. Verified
  // against tumalo_v4 first render — dark crescent at bottom-of-frame and
  // sky tear lines were visible. Plain PhotoBeat reads cleanly.
  { photo: lib('45-int_DSC9031.jpg'),
    depthDir: depth('45-int_DSC9031'),
    startSec: MUSIC_BEATS[4], durationSec: MUSIC_BEATS[5] - MUSIC_BEATS[4],
    move: { move: 'slow_pan_rl', focal: 'center', intensity: 1.0 },
    flat: true },

  // === LIFESTYLE (23.27 – 26.32s) — water feature ==========================
  // Beat 8 — push_in on water feature with off-center focal.
  { photo: lib('lifestyle_water_feature.jpg'),
    depthDir: depth('lifestyle_water_feature'),
    startSec: MUSIC_BEATS[5], durationSec: MUSIC_BEATS[6] - MUSIC_BEATS[5],
    move: { move: 'push_in', focal: 'center', intensity: 0.85 },
    objectPosition: '60% 50%' },

  // === LIFESTYLE (26.32 – 29.36s) — wildflowers ============================
  // Beat 9 — gimbal_walk through wildflower garden.
  { photo: lib('lifestyle_wildflowers.jpg'),
    depthDir: depth('lifestyle_wildflowers'),
    startSec: MUSIC_BEATS[6], durationSec: MUSIC_BEATS[7] - MUSIC_BEATS[6],
    move: { move: 'gimbal_walk', focal: 'center', intensity: 0.85, direction: 'lr' } },

  // === 75% MARK (29.36 – 31.58s) — closing aerial 3/4 angle ================
  // Beat 10 — push_in on aerial.
  { photo: lib('56-DJI_aerial_5.jpg'),
    depthDir: depth('56-DJI_aerial_5'),
    startSec: MUSIC_BEATS[7], durationSec: MUSIC_BEATS[8] - MUSIC_BEATS[7],
    move: { move: 'push_in', focal: 'center', intensity: 0.7 } },

  // === FINAL APPROACH (31.58 – 35.0s) — dusk wide ==========================
  // Beat 11 — slow_pan_rl on dusk aerial leading into reveal.
  // FLAT: dusk sky gradient confuses MiDaS; flat PhotoBeat reads cleaner.
  { photo: lib('9-DJI_aerial_3.jpg'),
    depthDir: depth('9-DJI_aerial_3'),
    startSec: MUSIC_BEATS[8], durationSec: 35.0 - MUSIC_BEATS[8],
    move: { move: 'slow_pan_rl', focal: 'center', intensity: 0.85 },
    flat: true },
];

// Pre-roll crossfade pattern. Each beat's Sequence runs for (PREROLL +
// durationSec) seconds, starting PREROLL seconds before the beat's declared
// startSec. During the pre-roll window, the beat's animation is paused at t=0
// and the alpha fades 0→1. The OUTGOING beat is at full alpha throughout
// (no exit fade), so the incoming covers the outgoing pixel-by-pixel through
// CSS compositing. Real cinematic crossfades — no bg-bleed bugs.
const PREROLL_SEC = 0.6;

const BeatWrapper: React.FC<{ beat: BeatDef; preroll: number }> = ({
  beat,
  preroll,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sequenceLocal = frame / fps;
  const beatLocal = Math.max(0, sequenceLocal - preroll);
  const entryAlpha = preroll > 0 ? clamp(sequenceLocal / preroll, 0, 1) : 1;
  const Comp = beat.flat ? PhotoBeat : (DepthParallaxBeat as typeof PhotoBeat);
  return (
    <div style={{ opacity: entryAlpha, position: 'absolute', inset: 0 }}>
      <Comp
        photo={beat.photo}
        // @ts-expect-error PhotoBeat ignores depthDir
        depthDir={beat.depthDir}
        local={beatLocal}
        fps={fps}
        durationSec={beat.durationSec}
        move={beat.move}
        vignetteLetterbox={beat.vignetteLetterbox}
        objectPosition={beat.objectPosition}
        titlePosition="none"
        scrim="none"
        crossfadeIn={0}
        crossfadeOut={0}
      />
    </div>
  );
};

// ─── Address title — Beat 1 ─────────────────────────────────────────────────
const AddressTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const alpha = clamp(t / 0.5, 0, 1);
  const ty = (1 - easeOutQuart(alpha)) * 24;
  const exit = clamp((t - 3.5) / 0.5, 0, 1);
  const opacity = alpha * (1 - exit);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(15,10,6,0.5) 0%, rgba(15,10,6,0.18) 50%, rgba(15,10,6,0.6) 100%)',
          opacity: opacity * 0.85,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 90,
          right: 90,
          top: '50%',
          transform: `translateY(calc(-50% + ${-ty}px))`,
          opacity,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 88,
            lineHeight: 1.04,
            color: '#F8F4EA',
            letterSpacing: '-0.01em',
            textShadow: '0 4px 24px rgba(0,0,0,0.78), 0 2px 6px rgba(0,0,0,0.85)',
          }}
        >
          19496 TUMALO RESERVOIR
        </div>
        <div
          style={{
            marginTop: 22,
            fontFamily: FONT_SANS,
            fontWeight: 700,
            fontSize: 44,
            color: GOLD,
            letterSpacing: 5,
            textTransform: 'uppercase',
            textShadow: '0 2px 10px rgba(0,0,0,0.85)',
          }}
        >
          BEND · OREGON
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Price flash — Beat 2, 5.0–7.5s ─────────────────────────────────────────
const PriceFlash: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const bloomIn = clamp(t / 0.45, 0, 1);
  const fadeOut = clamp((t - 1.85) / 0.5, 0, 1);
  const alpha = easeOutCubic(bloomIn) * (1 - fadeOut);
  const scale = 0.94 + 0.06 * easeOutCubic(bloomIn);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: 320,
        }}
      >
        <div
          style={{
            transform: `scale(${scale.toFixed(4)})`,
            opacity: alpha,
            padding: '24px 56px',
            background: 'rgba(16, 39, 66, 0.78)',
            borderRadius: 14,
            border: `1px solid ${GOLD}`,
            backdropFilter: 'blur(8px)',
            textAlign: 'center',
            boxShadow: '0 12px 48px rgba(0,0,0,0.55)',
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontWeight: 700,
              fontSize: 28,
              color: GOLD,
              letterSpacing: 6,
              textTransform: 'uppercase',
            }}
          >
            LIST PRICE
          </div>
          <div
            style={{
              marginTop: 10,
              fontFamily: FONT_SERIF,
              fontSize: 96,
              lineHeight: 1,
              color: '#F8F4EA',
              letterSpacing: '-0.01em',
              textShadow: '0 4px 18px rgba(0,0,0,0.55)',
            }}
          >
            $1,350,000
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Specs flash — fires at Beat 5 (primary suite) ──────────────────────────
const SpecsFlash: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const bloomIn = clamp(t / 0.4, 0, 1);
  const fadeOut = clamp((t - 1.7) / 0.5, 0, 1);
  const alpha = easeOutCubic(bloomIn) * (1 - fadeOut);
  const ty = (1 - easeOutQuart(bloomIn)) * 22;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: 280,
        }}
      >
        <div
          style={{
            transform: `translateY(${ty}px)`,
            opacity: alpha,
            padding: '20px 44px',
            background: 'rgba(16, 39, 66, 0.78)',
            borderRadius: 12,
            border: `1px solid ${GOLD}`,
            backdropFilter: 'blur(8px)',
            textAlign: 'center',
            boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontWeight: 700,
              fontSize: 52,
              color: '#F8F4EA',
              letterSpacing: 4,
              textTransform: 'uppercase',
              lineHeight: 1.1,
              textShadow: '0 2px 10px rgba(0,0,0,0.7)',
            }}
          >
            4 BD &nbsp;·&nbsp; 3 BA
          </div>
          <div
            style={{
              marginTop: 8,
              fontFamily: FONT_SANS,
              fontWeight: 600,
              fontSize: 38,
              color: GOLD,
              letterSpacing: 5,
              textTransform: 'uppercase',
              textShadow: '0 2px 8px rgba(0,0,0,0.7)',
            }}
          >
            3,218 SF &nbsp;·&nbsp; 5 ACRES
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Reveal — final 5s, kinetic stat block on navy with white logo ──────────
const RevealInner: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const navyAlpha = clamp(t / 0.5, 0, 1);
  const logoAlpha = clamp((t - 0.4) / 0.6, 0, 1);
  const logoScale = 0.9 + 0.1 * easeOutCubic(clamp((t - 0.4) / 0.6, 0, 1));
  const statusAlpha = clamp((t - 1.0) / 0.6, 0, 1);
  const statusScale = 1.2 - 0.2 * easeOutCubic(clamp((t - 1.0) / 0.6, 0, 1));
  const priceAlpha = clamp((t - 1.7) / 0.7, 0, 1);
  const priceTranslate = (1 - easeOutCubic(clamp((t - 1.7) / 0.7, 0, 1))) * 16;
  const addressAlpha = clamp((t - 2.5) / 0.7, 0, 1);
  const addressTranslate = (1 - easeOutCubic(clamp((t - 2.5) / 0.7, 0, 1))) * 12;
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
        <Img
          src={staticFile('brand/stacked_logo_white.png')}
          style={{
            width: 280,
            height: 'auto',
            opacity: logoAlpha,
            transform: `scale(${logoScale})`,
            marginBottom: 60,
          }}
        />
        <div
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 56,
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
            fontFamily: FONT_SERIF,
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

// ─── Composition ────────────────────────────────────────────────────────────
export const Tumalo: React.FC = () => {
  // Light leak windows — bloom 0.5s centered just before each pattern interrupt.
  const LL_DUR_SEC = 0.5;
  const lightLeak25 = Math.round((MUSIC_BEATS[1] - LL_DUR_SEC * 0.5) * FPS);
  const lightLeak50 = Math.round((MUSIC_BEATS[4] - LL_DUR_SEC * 0.5) * FPS);
  const lightLeakDuration = Math.round(LL_DUR_SEC * FPS);

  // 3D YOUR MORNING IN TUMALO scene fires at Beat 3 start (8.08s) for 3.5s.
  const morningStart = Math.round(MUSIC_BEATS[0] * FPS);
  const morningDuration = Math.round(MORNING_TEXT_TOTAL_SEC * FPS);

  return (
    <AbsoluteFill style={{ background: CHARCOAL }}>
      {/* Music bed — ElevenMusic 117 BPM cinematic ambient, 42s */}
      <Audio src={staticFile('audio/tumalo_v4_music.mp3')} volume={0.85} />

      {/* Photo beats — pre-roll crossfade pattern. Beat 1 starts hard at t=0
          (no preroll). All other beats overlap previous by 0.6s. */}
      {BEATS.map((beat, i) => {
        const useHardEntry = i === 0;
        const preroll = useHardEntry ? 0 : PREROLL_SEC;
        const seqFrom = Math.round(Math.max(0, beat.startSec - preroll) * FPS);
        const seqEnd = Math.round((beat.startSec + beat.durationSec) * FPS);
        const seqDuration = seqEnd - seqFrom;
        return (
          <Sequence key={i} from={seqFrom} durationInFrames={seqDuration}>
            <BeatWrapper beat={beat} preroll={preroll} />
          </Sequence>
        );
      })}

      {/* Light leak overlays — 25% and 50% pattern interrupts */}
      <Sequence from={lightLeak25} durationInFrames={lightLeakDuration}>
        <LightLeakTransition durationSec={LL_DUR_SEC} intensity="medium" position={{ x: '60%', y: '38%' }} />
      </Sequence>
      <Sequence from={lightLeak50} durationInFrames={lightLeakDuration}>
        <LightLeakTransition durationSec={LL_DUR_SEC} intensity="medium" position={{ x: '40%', y: '55%' }} />
      </Sequence>

      {/* Address title — 0.0–4.0s over Beat 1 */}
      <Sequence from={0} durationInFrames={Math.round(4.0 * FPS)}>
        <AddressTitle />
      </Sequence>

      {/* Price flash — 5.0–7.5s over Beat 2 */}
      <Sequence from={Math.round(5.0 * FPS)} durationInFrames={Math.round(2.5 * FPS)}>
        <PriceFlash />
      </Sequence>

      {/* 3D YOUR MORNING IN TUMALO reveal — fires at Beat 3 start */}
      <Sequence from={morningStart} durationInFrames={morningDuration}>
        <MorningTextScene />
      </Sequence>

      {/* Specs flash — primary suite beat */}
      <Sequence
        from={Math.round((MUSIC_BEATS[2] + 0.4) * FPS)}
        durationInFrames={Math.round(2.2 * FPS)}
      >
        <SpecsFlash />
      </Sequence>

      {/* Reveal — final 5.0s on navy + logo + price + address */}
      <Sequence from={Math.round(35.0 * FPS)} durationInFrames={Math.round(5.0 * FPS)}>
        <RevealInner />
      </Sequence>
    </AbsoluteFill>
  );
};
