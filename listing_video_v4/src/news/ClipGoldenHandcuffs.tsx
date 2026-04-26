// ClipGoldenHandcuffs — 30s news clip, 1080×1920 portrait.
//
// Source: Coldwell Banker 2026 Home Shopping Season Report (PRNewswire 2026-04-23,
// n=727 Coldwell Banker affiliated agents, fielded Mar 23–Apr 6, 2026).
// https://www.prnewswire.com/news-releases/coldwell-banker-mortgage-rate-lock-in-effect-eases-one-in-three-home-sellers-are-giving-up-a-sub-5-rate-to-list-this-spring-302751081.html
//
// Verification trace per figure:
//   - "1 in 3 / 35%" of sellers giving up sub-5% rate to list this spring → Coldwell Banker, body of release ("35% of sellers currently working with Coldwell Banker affiliated agents have mortgage rates below 5% and are still planning to sell this spring")
//   - "80% of agents say buyers aren't waiting on rates" → same release ("80% of agents say homebuyers this spring are actively on the market and are not waiting for market conditions or rates to drop further")
//   - "43% of agents report a busier shopping season than last year" → same release
//   - "61% still call lock-in a major or moderate factor" → same release
//
// CUT (per CLAUDE.md data accuracy rule):
//   - "8% would stay in a bad relationship for their rate" — DOES NOT EXIST in the cited source. No primary source found.
//   - "Bend inventory at its healthiest since 2019" — Supabase shows Bend at 5.80 months of supply (balanced/buyer-leaning, not seller territory) and our market_stats_cache only goes back to Jan 2025.

import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { CREAM, GOLD, FONT_BODY, FONT_SERIF, TEXT_SHADOW } from '../brand';
import { clamp } from '../easing';
import {
  AnimatedCounter,
  ScrimText,
  SourceLine,
  AnimatedArrow,
  BackgroundPhoto,
  BrandOutroCard,
  DarkBackdrop,
} from './primitives';

const FPS = 30;
export const CLIP_GH_TOTAL_SEC = 30.0;

// Beat 1 — Hook: "1 in 3 sellers" with animated counter ramping to 35%.
const BeatHook: React.FC = () => {
  const { fps } = useVideoConfig();
  const start = 0;
  return (
    <AbsoluteFill>
      <DarkBackdrop />
      <ScrimText
        startFrame={start + 4}
        position="upper-third"
        text="1 IN 3 SELLERS"
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 900,
          fontSize: 78,
          color: CREAM,
          letterSpacing: 4,
          textShadow: TEXT_SHADOW,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '52%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}
      >
        <AnimatedCounter
          from={0}
          to={35}
          startFrame={start + 8}
          durationFrames={fps * 1.6}
          format={(v) => `${Math.round(v)}%`}
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 360,
            fontWeight: 700,
            color: GOLD,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            textShadow: '0 6px 28px rgba(0,0,0,0.85)',
          }}
        />
      </div>
      <ScrimText
        startFrame={start + Math.round(fps * 1.4)}
        position="lower-third"
        text="are giving up their low mortgage rate"
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 600,
          fontSize: 44,
          color: CREAM,
          letterSpacing: 1.4,
          textShadow: TEXT_SHADOW,
          lineHeight: 1.25,
        }}
        maxWidth={840}
      />
    </AbsoluteFill>
  );
};

// Beat 2 — "Sub-5% rate holders listing this spring: 35%" + source attribution.
const BeatSubFive: React.FC = () => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const bodyAlpha = clamp((frame - 14) / 18, 0, 1);
  const tailAlpha = clamp((frame - 32) / 14, 0, 1);
  return (
    <AbsoluteFill>
      <DarkBackdrop />
      <ScrimText
        startFrame={4}
        position="upper-third"
        text="THE LOCK-IN IS BREAKING"
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 900,
          fontSize: 56,
          color: GOLD,
          letterSpacing: 5,
          textShadow: TEXT_SHADOW,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          maxWidth: 920,
        }}
      >
        <div
          style={{
            fontFamily: FONT_SERIF,
            fontWeight: 400,
            fontSize: 70,
            color: CREAM,
            lineHeight: 1.16,
            opacity: bodyAlpha,
            textShadow: TEXT_SHADOW,
          }}
        >
          35% of spring sellers
          <br />
          have mortgage rates
          <br />
          below 5%
        </div>
        <div
          style={{
            marginTop: 36,
            fontFamily: FONT_BODY,
            fontWeight: 700,
            fontSize: 32,
            color: GOLD,
            letterSpacing: 3,
            textTransform: 'uppercase',
            opacity: tailAlpha,
            textShadow: TEXT_SHADOW,
          }}
        >
          and they are listing anyway
        </div>
      </div>
      <SourceLine startFrame={Math.round(fps * 1.0)} text="Coldwell Banker spring 2026 survey, n=727 agents" />
    </AbsoluteFill>
  );
};

// Beat 3 — Why: "Buyers aren't waiting either" with 80% counter
const BeatBuyers: React.FC = () => {
  const { fps } = useVideoConfig();
  const start = 0;
  return (
    <AbsoluteFill>
      <DarkBackdrop />
      <ScrimText
        startFrame={start + 4}
        position="top"
        text="Buyers aren't waiting either"
        style={{
          fontFamily: FONT_SERIF,
          fontWeight: 400,
          fontSize: 64,
          color: CREAM,
          letterSpacing: '-0.01em',
          textShadow: TEXT_SHADOW,
          lineHeight: 1.18,
        }}
        maxWidth={920}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}
      >
        <AnimatedCounter
          from={0}
          to={80}
          startFrame={start + 10}
          durationFrames={fps * 1.4}
          format={(v) => `${Math.round(v)}%`}
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 320,
            fontWeight: 700,
            color: GOLD,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            textShadow: '0 6px 28px rgba(0,0,0,0.85)',
          }}
        />
      </div>
      <ScrimText
        startFrame={start + Math.round(fps * 1.4)}
        position="lower-third"
        text="of agents say their buyers are no longer waiting for rates to drop"
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 600,
          fontSize: 38,
          color: CREAM,
          letterSpacing: 1.2,
          textShadow: TEXT_SHADOW,
          lineHeight: 1.3,
        }}
        maxWidth={900}
      />
      <SourceLine startFrame={start + Math.round(fps * 1.7)} text="Coldwell Banker spring 2026 survey" />
    </AbsoluteFill>
  );
};

// Beat 4 — Market temperature: "43% of agents say it is busier this year"
// with upward arrow drawing in. Background: Bend aerial drone shot for local
// resonance (stat itself is national; localization is visual context only).
const BeatBusier: React.FC = () => {
  const { fps } = useVideoConfig();
  const start = 0;
  return (
    <AbsoluteFill>
      <BackgroundPhoto
        src="v5_library/modern/63-web-or-mls-DJI_20260127142841_0096_D.jpg"
        startFrame={start}
        durationFrames={fps * 6}
        darken={0.62}
      />
      <ScrimText
        startFrame={start + 4}
        position="upper-third"
        text="THE SHOPPING SEASON IS HEATING UP"
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 900,
          fontSize: 44,
          color: GOLD,
          letterSpacing: 4,
          textShadow: TEXT_SHADOW,
        }}
        maxWidth={900}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}
      >
        <AnimatedCounter
          from={0}
          to={43}
          startFrame={start + 10}
          durationFrames={fps * 1.4}
          format={(v) => `${Math.round(v)}%`}
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 280,
            fontWeight: 700,
            color: CREAM,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            textShadow: '0 6px 28px rgba(0,0,0,0.85)',
          }}
        />
      </div>
      <AnimatedArrow startFrame={start + Math.round(fps * 1.6)} drawFrames={20} direction="up" color={GOLD} size={180} x="78%" y="50%" />
      <ScrimText
        startFrame={start + Math.round(fps * 1.6)}
        position="lower-third"
        text="of agents report a busier season than last year"
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 600,
          fontSize: 38,
          color: CREAM,
          letterSpacing: 1.2,
          textShadow: TEXT_SHADOW,
          lineHeight: 1.3,
        }}
        maxWidth={900}
      />
      <SourceLine startFrame={start + Math.round(fps * 1.9)} text="Coldwell Banker spring 2026 survey" />
    </AbsoluteFill>
  );
};

// Beat 5 — Closing line: editorial framing (no falsifiable stat).
const BeatClose: React.FC = () => {
  return (
    <AbsoluteFill>
      <DarkBackdrop />
      <ScrimText
        startFrame={4}
        position="center"
        text="If you have been waiting on rates to sell, the market is no longer waiting on you."
        style={{
          fontFamily: FONT_SERIF,
          fontWeight: 400,
          fontSize: 60,
          color: CREAM,
          lineHeight: 1.22,
          textShadow: TEXT_SHADOW,
          letterSpacing: '-0.005em',
        }}
        maxWidth={900}
      />
    </AbsoluteFill>
  );
};

export const ClipGoldenHandcuffs: React.FC = () => {
  // Beat layout (frames at 30fps):
  //   0–60     (0–2s)    Hook
  //   60–210   (2–7s)    Sub-5% beat
  //   210–390  (7–13s)   Buyers stat (80%)
  //   390–570  (13–19s)  Busier season (43%)
  //   570–780  (19–26s)  Close line
  //   780–900  (26–30s)  Brand outro
  return (
    <AbsoluteFill style={{ background: '#0a0805' }}>
      <Sequence from={0} durationInFrames={70}>
        <BeatHook />
      </Sequence>
      <Sequence from={60} durationInFrames={160}>
        <BeatSubFive />
      </Sequence>
      <Sequence from={210} durationInFrames={190}>
        <BeatBuyers />
      </Sequence>
      <Sequence from={390} durationInFrames={190}>
        <BeatBusier />
      </Sequence>
      <Sequence from={570} durationInFrames={220}>
        <BeatClose />
      </Sequence>
      <Sequence from={780} durationInFrames={120}>
        <BrandOutroCard startFrame={0} />
      </Sequence>
    </AbsoluteFill>
  );
};
