// ClipTariffs — 30s news clip, 1080×1920 portrait.
//
// Verification trace per figure:
//   - "$10,900 per home" → NAHB / Wells Fargo Housing Market Index, APRIL 2025
//     survey (NOT April 2026 as user spec implied).
//     https://www.nahb.org/blog/2025/05/tariff-uncertainty-impact-on-home-building
//     "On average, suppliers increased their prices by 6.3% ... builders
//     estimate a typical cost effect from recent tariff actions at $10,900 per
//     home."
//   - "450,000 fewer homes through 2030" → Center for American Progress
//     analysis (NOT NAHB as user spec implied).
//     https://www.americanprogress.org/article/trump-administration-tariffs-could-result-in-450000-fewer-new-homes-through-2030/
//
// CUT (per CLAUDE.md data accuracy rule):
//   - "Central Oregon new construction is already limited" — Supabase shows
//     Bend's new construction share at 17.32% of active inventory (about 1
//     in 6 listings). Not "limited." Cutting the local angle entirely; the
//     national story carries the clip.

import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { CREAM, GOLD, FONT_BODY, FONT_SERIF, TEXT_SHADOW } from '../brand';
import {
  AnimatedCounter,
  ScrimText,
  SourceLine,
  AnimatedArrow,
  BrandOutroCard,
  DarkBackdrop,
} from './primitives';

const FPS = 30;
export const CLIP_TARIFFS_TOTAL_SEC = 30.0;

// Beat 1 — Hook: huge $10,900 counter
const BeatHook: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <DarkBackdrop />
      <ScrimText
        startFrame={4}
        position="upper-third"
        text="THE COST OF YOUR NEXT HOME"
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 900,
          fontSize: 44,
          color: GOLD,
          letterSpacing: 5,
          textShadow: TEXT_SHADOW,
        }}
        maxWidth={920}
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
          to={10900}
          startFrame={8}
          durationFrames={Math.round(fps * 1.7)}
          format={(v) =>
            `$${Math.round(v).toLocaleString('en-US')}`
          }
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 220,
            fontWeight: 700,
            color: CREAM,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            textShadow: '0 6px 28px rgba(0,0,0,0.85)',
          }}
        />
      </div>
      <ScrimText
        startFrame={Math.round(fps * 1.5)}
        position="lower-third"
        text="more, per new home, from 2025 tariffs"
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 600,
          fontSize: 42,
          color: CREAM,
          letterSpacing: 1.4,
          textShadow: TEXT_SHADOW,
          lineHeight: 1.3,
        }}
        maxWidth={900}
      />
    </AbsoluteFill>
  );
};

// Beat 2 — Source attribution + which materials drive it
const BeatMaterials: React.FC = () => {
  return (
    <AbsoluteFill>
      <DarkBackdrop />
      <ScrimText
        startFrame={4}
        position="top"
        text="WHERE THE $10,900 COMES FROM"
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 900,
          fontSize: 38,
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
          textAlign: 'left',
          fontFamily: FONT_SERIF,
          fontSize: 56,
          fontWeight: 400,
          color: CREAM,
          lineHeight: 1.45,
          letterSpacing: '-0.005em',
          textShadow: TEXT_SHADOW,
        }}
      >
        <div>Canadian softwood lumber</div>
        <div>Steel and aluminum</div>
        <div>Cabinets, drywall, doors</div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 240,
          transform: 'translateX(-50%)',
          fontFamily: FONT_BODY,
          fontWeight: 700,
          fontSize: 32,
          color: GOLD,
          letterSpacing: 3,
          textTransform: 'uppercase',
          textShadow: TEXT_SHADOW,
        }}
      >
        Builder costs up 6.3% on average
      </div>
      <SourceLine startFrame={Math.round(FPS * 1.0)} text="NAHB / Wells Fargo Housing Market Index, April 2025" />
    </AbsoluteFill>
  );
};

// Beat 3 — Forward-looking: 450,000 fewer homes through 2030
const BeatProjection: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <DarkBackdrop />
      <ScrimText
        startFrame={4}
        position="upper-third"
        text="THROUGH 2030"
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 900,
          fontSize: 44,
          color: GOLD,
          letterSpacing: 6,
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
        }}
      >
        <AnimatedCounter
          from={0}
          to={450000}
          startFrame={8}
          durationFrames={Math.round(fps * 1.9)}
          format={(v) => Math.round(v).toLocaleString('en-US')}
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 240,
            fontWeight: 700,
            color: CREAM,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            textShadow: '0 6px 28px rgba(0,0,0,0.85)',
          }}
        />
      </div>
      <ScrimText
        startFrame={Math.round(fps * 1.7)}
        position="lower-third"
        text="fewer new homes will be built"
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 600,
          fontSize: 42,
          color: CREAM,
          letterSpacing: 1.4,
          textShadow: TEXT_SHADOW,
          lineHeight: 1.3,
        }}
        maxWidth={900}
      />
      <SourceLine startFrame={Math.round(fps * 2.0)} text="Center for American Progress analysis, 2026" />
    </AbsoluteFill>
  );
};

// Beat 4 — What this means: existing homes more valuable
const BeatExistingValuable: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <DarkBackdrop />
      <ScrimText
        startFrame={4}
        position="upper-third"
        text="What this means for existing homes"
        style={{
          fontFamily: FONT_SERIF,
          fontWeight: 400,
          fontSize: 56,
          color: CREAM,
          lineHeight: 1.22,
          textShadow: TEXT_SHADOW,
          letterSpacing: '-0.005em',
        }}
        maxWidth={900}
      />
      <AnimatedArrow startFrame={Math.round(fps * 0.9)} drawFrames={26} direction="up" color={GOLD} size={300} x="50%" y="52%" />
      <ScrimText
        startFrame={Math.round(fps * 1.7)}
        position="lower-third"
        text="Less new supply. Same demand. Existing inventory becomes the play."
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 600,
          fontSize: 38,
          color: CREAM,
          letterSpacing: 1.2,
          textShadow: TEXT_SHADOW,
          lineHeight: 1.32,
        }}
        maxWidth={900}
      />
    </AbsoluteFill>
  );
};

// Beat 5 — Closing
const BeatClose: React.FC = () => (
  <AbsoluteFill>
    <DarkBackdrop />
    <ScrimText
      startFrame={4}
      position="center"
      text="When new construction gets harder, the home you already own gets stronger."
      style={{
        fontFamily: FONT_SERIF,
        fontWeight: 400,
        fontSize: 56,
        color: CREAM,
        lineHeight: 1.28,
        textShadow: TEXT_SHADOW,
        letterSpacing: '-0.005em',
      }}
      maxWidth={920}
    />
  </AbsoluteFill>
);

export const ClipTariffs: React.FC = () => {
  // Beat layout:
  //   0–75     (0–2.5s)   Hook ($10,900 counter)
  //   75–210   (2.5–7s)   Materials list + 6.3% cost line
  //   210–390  (7–13s)    Projection: 450,000 fewer homes
  //   390–570  (13–19s)   What this means: arrow + line
  //   570–780  (19–26s)   Closing line
  //   780–900  (26–30s)   Brand outro
  return (
    <AbsoluteFill style={{ background: '#0a0805' }}>
      <Sequence from={0} durationInFrames={85}>
        <BeatHook />
      </Sequence>
      <Sequence from={75} durationInFrames={145}>
        <BeatMaterials />
      </Sequence>
      <Sequence from={210} durationInFrames={190}>
        <BeatProjection />
      </Sequence>
      <Sequence from={390} durationInFrames={190}>
        <BeatExistingValuable />
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
