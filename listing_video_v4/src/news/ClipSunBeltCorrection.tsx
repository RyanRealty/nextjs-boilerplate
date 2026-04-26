// ClipSunBeltCorrection — 30s news clip, 1080×1920 portrait.
//
// Original spec was "Sun Belt Collapse — Bend is the stable safe haven."
// VERIFICATION FLIPPED THE LOCAL ANGLE: Bend median sale price is DOWN ~10%
// YoY in April 2026 per Supabase market_stats_cache; trailing-12-month
// median-of-monthly-medians is -3.6%. Bend is correcting along with the Sun
// Belt, not contrasting with it. The honest narrative is: "pandemic-era
// boom markets are giving back, and Central Oregon is in the same correction.
// The pattern is cycle position, not geography."
//
// Verification trace per figure:
//   - Cape Coral -9.6% (Feb 2025 → Feb 2026, AEI Housing Center via Fortune
//     2026-04-11): https://fortune.com/2026/04/11/housing-prices-by-city-2026/
//   - Kansas City +8.6% (same source, same window): same article
//   - Bend -3.6% trailing-12-months: Supabase ryan-realty-platform
//     market_stats_cache, geo_slug='bend', period_type='monthly',
//     median-of-monthly-median_sale_price last-12mo vs prior-12mo computed
//     2026-04-26 (current month -10.0% YoY, prior month -12.2% YoY)
//
// CUT (per CLAUDE.md data accuracy rule):
//   - "Austin -4.1%" — not in cited Fortune source. Other outlets cite -3.6%
//     to -6.8% but with different indices. Without a clean primary source,
//     the specific number is dropped.

import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { CREAM, GOLD, FONT_BODY, FONT_SERIF, TEXT_SHADOW } from '../brand';
import {
  ScrimText,
  SourceLine,
  ComparisonBar,
  BrandOutroCard,
  DarkBackdrop,
} from './primitives';

const FPS = 30;
export const CLIP_SBC_TOTAL_SEC = 30.0;

// Beat 1 — Hook
const BeatHook: React.FC = () => (
  <AbsoluteFill>
    <DarkBackdrop />
    <ScrimText
      startFrame={4}
      position="center"
      text="The cities everyone moved TO are giving back."
      style={{
        fontFamily: FONT_SERIF,
        fontWeight: 400,
        fontSize: 76,
        color: CREAM,
        lineHeight: 1.18,
        textShadow: TEXT_SHADOW,
        letterSpacing: '-0.01em',
      }}
      maxWidth={920}
    />
  </AbsoluteFill>
);

// Beat 2 — Comparison bars: Cape Coral -9.6%, Kansas City +8.6%
const BeatBars: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <DarkBackdrop />
      <ScrimText
        startFrame={4}
        position="top"
        text="HOME PRICES, FEB 2025 TO FEB 2026"
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 900,
          fontSize: 36,
          color: GOLD,
          letterSpacing: 4,
          textShadow: TEXT_SHADOW,
        }}
        maxWidth={900}
      />
      <ComparisonBar label="Cape Coral, FL" pct={-9.6} startFrame={Math.round(fps * 0.6)} yOffset={-110} />
      <ComparisonBar label="Bend, OR" pct={-3.6} startFrame={Math.round(fps * 1.2)} yOffset={0} />
      <ComparisonBar label="Kansas City" pct={8.6} startFrame={Math.round(fps * 1.8)} yOffset={110} />
      <SourceLine startFrame={Math.round(fps * 2.6)} text="Fortune / AEI Housing Center; Bend per ryan-realty-platform" />
    </AbsoluteFill>
  );
};

// Beat 3 — The pattern: editorial framing, then a single number reveal
const BeatPattern: React.FC = () => {
  return (
    <AbsoluteFill>
      <DarkBackdrop />
      <ScrimText
        startFrame={4}
        position="upper-third"
        text="The pattern is not geography."
        style={{
          fontFamily: FONT_SERIF,
          fontWeight: 400,
          fontSize: 64,
          color: CREAM,
          lineHeight: 1.2,
          textShadow: TEXT_SHADOW,
          letterSpacing: '-0.005em',
        }}
        maxWidth={900}
      />
      <ScrimText
        startFrame={36}
        position="lower-third"
        text="It is cycle position."
        style={{
          fontFamily: FONT_SERIF,
          fontWeight: 700,
          fontSize: 88,
          color: GOLD,
          lineHeight: 1.2,
          textShadow: TEXT_SHADOW,
          letterSpacing: '-0.01em',
        }}
        maxWidth={900}
      />
    </AbsoluteFill>
  );
};

// Beat 4 — Bend localization (honest): abstract dark backdrop + number.
// Deliberately NOT using a property photo here. A city-level market stat
// over a specific identifiable home reads as a per-property claim, which
// would violate the CLAUDE.md data accuracy rule (the stat is Bend median,
// not that home's value).
const BeatBendLocal: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <DarkBackdrop />
      <ScrimText
        startFrame={4}
        position="upper-third"
        text="BEND, OREGON"
        style={{
          fontFamily: FONT_BODY,
          fontWeight: 900,
          fontSize: 56,
          color: GOLD,
          letterSpacing: 8,
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
        <div
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 220,
            fontWeight: 700,
            color: '#E07474',
            lineHeight: 1,
            letterSpacing: '-0.04em',
            textShadow: '0 6px 28px rgba(0,0,0,0.85)',
          }}
        >
          -3.6%
        </div>
        <div
          style={{
            marginTop: 28,
            fontFamily: FONT_BODY,
            fontWeight: 600,
            fontSize: 36,
            color: CREAM,
            letterSpacing: 2.4,
            textTransform: 'uppercase',
            textShadow: TEXT_SHADOW,
          }}
        >
          Median sale price
          <br />
          trailing 12 months
        </div>
      </div>
      <SourceLine startFrame={Math.round(fps * 1.4)} text="ryan-realty-platform · MLS pull, computed 2026-04-26" />
    </AbsoluteFill>
  );
};

// Beat 5 — The takeaway
const BeatTakeaway: React.FC = () => (
  <AbsoluteFill>
    <DarkBackdrop />
    <ScrimText
      startFrame={4}
      position="center"
      text="Boom markets correct. Stable markets gain. Where you bought into the cycle matters more than where you bought."
      style={{
        fontFamily: FONT_SERIF,
        fontWeight: 400,
        fontSize: 50,
        color: CREAM,
        lineHeight: 1.3,
        textShadow: TEXT_SHADOW,
        letterSpacing: '-0.005em',
      }}
      maxWidth={900}
    />
  </AbsoluteFill>
);

export const ClipSunBeltCorrection: React.FC = () => {
  // Beat layout:
  //   0–80     (0–2.7s)   Hook
  //   80–270   (2.7–9s)   Bars: Cape Coral / Bend / Kansas City
  //   270–420  (9–14s)    Pattern: cycle position
  //   420–600  (14–20s)   Bend local: -3.6% over Tumalo aerial
  //   600–780  (20–26s)   Takeaway
  //   780–900  (26–30s)   Brand outro
  return (
    <AbsoluteFill style={{ background: '#0a0805' }}>
      <Sequence from={0} durationInFrames={90}>
        <BeatHook />
      </Sequence>
      <Sequence from={80} durationInFrames={200}>
        <BeatBars />
      </Sequence>
      <Sequence from={270} durationInFrames={160}>
        <BeatPattern />
      </Sequence>
      <Sequence from={420} durationInFrames={190}>
        <BeatBendLocal />
      </Sequence>
      <Sequence from={600} durationInFrames={190}>
        <BeatTakeaway />
      </Sequence>
      <Sequence from={780} durationInFrames={120}>
        <BrandOutroCard startFrame={0} />
      </Sequence>
    </AbsoluteFill>
  );
};
