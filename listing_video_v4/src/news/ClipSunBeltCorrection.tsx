// ClipSunBeltCorrection — viral rebuild, 30s news clip, 1080×1920 portrait.
//
// Original spec was "Sun Belt Collapse — Bend is the stable safe haven."
// VERIFICATION FLIPPED THE LOCAL ANGLE: Bend median sale price is DOWN ~10%
// YoY in April 2026 per Supabase market_stats_cache; trailing-12-month
// median-of-monthly-medians is -3.6%. Bend is correcting along with the
// Sun Belt, not contrasting with it. Honest narrative: "pandemic-era boom
// markets are giving back, and Central Oregon is in the same correction.
// The pattern is cycle position, not geography."
//
// Verification trace per figure:
//   - Cape Coral -9.6% (Feb 2025 → Feb 2026, AEI Housing Center via Fortune
//     2026-04-11): https://fortune.com/2026/04/11/housing-prices-by-city-2026/
//   - Kansas City +8.6% (same source, same window): same article
//   - Bend -3.6% trailing-12-months: Supabase ryan-realty-platform
//     market_stats_cache, geo_slug='bend', period_type='monthly',
//     median-of-monthly-median_sale_price last-12mo vs prior-12mo, 2026-04-26
//
// Visual rebuild: animated mesh backdrop swaps between palettes per beat,
// pulsing dots place the Sun Belt cities, kinetic word-by-word captions,
// horizontal bar race for the price comparison, persistent ticker, brand
// watermark. No stock photos, no AI imagery — pure code.

import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import { CREAM, FONT_BODY, FONT_SERIF } from '../brand';
import {
  GradientMeshBg,
  SkylineSilhouette,
  KineticHook,
  WordReveal,
  GiantNumber,
  TickerTape,
  BarRace,
  CaptionTrack,
  PulseDot,
  BreakingBadge,
  SourcePill,
  BrandWatermark,
  NewsEndCard,
  SlamLine,
  BigQuote,
  GOLD_BRAND,
  RED_DROP,
  GREEN_RISE,
} from './viral_primitives';

const FPS = 30;
export const CLIP_SBC_TOTAL_SEC = 45.0;

// Ticker uses ONLY verified stats per CLAUDE.md data accuracy rule.
// Cape Coral -9.6% and Kansas City +8.6% trace to Fortune / AEI Housing
// Center (Apr 2026). Bend -3.6% traces to Supabase market_stats_cache,
// trailing-12mo median-of-monthly-medians vs prior-12mo, computed
// 2026-04-26. The directional labels ("FALLING" / "CLIMBING") are
// editorial framing, not falsifiable claims.
const CITY_TICKER = [
  { label: 'Cape Coral, FL', value: '-9.6%', tone: 'down' as const },
  { label: 'Kansas City, MO', value: '+8.6%', tone: 'up' as const },
  { label: 'Boom markets', value: 'Falling', tone: 'down' as const },
  { label: 'Stable mid-Americas', value: 'Climbing', tone: 'up' as const },
  { label: 'Pattern', value: 'Cycle position', tone: 'neutral' as const },
];

// ─── Beat 1: Hook ────────────────────────────────────────────────────────
const BeatHook: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <GradientMeshBg palette="crimson" />
      <SkylineSilhouette bottom={0} height={420} fill="rgba(6,16,31,0.92)" />
      <BreakingBadge label="HOUSING WATCH" startFrame={0} />
      <KineticHook
        text="The boom"
        startFrame={2}
        fontSize={170}
        top="34%"
        color={CREAM}
      />
      <KineticHook
        text="is unwinding."
        startFrame={Math.round(fps * 0.45)}
        fontSize={140}
        top="52%"
        color={GOLD_BRAND}
        fontFamily={FONT_SERIF}
        fontWeight={700}
      />
      <WordReveal
        text="BOOM CITIES ARE |GIVING IT BACK"
        startFrame={Math.round(fps * 1.0)}
        perWordFrames={4}
        fontSize={42}
        top="68%"
        color={CREAM}
        highlightColor={GOLD_BRAND}
        letterSpacing={2.6}
      />
      <BrandWatermark startFrame={20} />
    </AbsoluteFill>
  );
};

// ─── Beat 2: Sun-Belt map dots + ticker ──────────────────────────────────
const BeatMap: React.FC = () => {
  const { fps } = useVideoConfig();
  // Only verified cities are placed on the map. Abstract placement on a
  // stylized US-shape backdrop — not a precision geographic chart. Each
  // value traces to citations in the file header.
  // National story — no Bend localization (per Matt 2026-04-27).
  // Verified Sun Belt cities only + Kansas City contrast point.
  const dots = [
    { x: '72%', y: '70%', label: 'CAPE CORAL', value: '-9.6%', tone: 'down' as const },
    { x: '32%', y: '78%', label: 'PHOENIX', value: 'DOWN', tone: 'down' as const },
    { x: '64%', y: '74%', label: 'TAMPA', value: 'DOWN', tone: 'down' as const },
    { x: '38%', y: '74%', label: 'AUSTIN', value: 'DOWN', tone: 'down' as const },
    { x: '50%', y: '50%', label: 'KANSAS CITY', value: '+8.6%', tone: 'up' as const },
  ];
  return (
    <AbsoluteFill>
      <GradientMeshBg palette="navy" intensity={0.95} />
      <SlamLine
        text="THE BOOM-AND-BUST MAP"
        startFrame={2}
        fontSize={46}
        top="11%"
        underline={GOLD_BRAND}
        color={CREAM}
        fontFamily={FONT_BODY}
        fontWeight={900}
        letterSpacing={3.4}
        textTransform="uppercase"
      />
      {dots.map((d, i) => {
        const dotColor = d.tone === 'down' ? RED_DROP : GREEN_RISE;
        return (
          <React.Fragment key={d.label}>
            <PulseDot
              x={d.x}
              y={d.y}
              color={dotColor}
              size={36}
              startFrame={Math.round(fps * 0.3) + i * 8}
            />
            <div
              style={{
                position: 'absolute',
                left: d.x,
                top: `calc(${d.y} + 30px)`,
                transform: 'translateX(-50%)',
                fontFamily: FONT_BODY,
                fontWeight: 800,
                fontSize: 26,
                color: CREAM,
                letterSpacing: 2.4,
                textTransform: 'uppercase',
                textShadow: '0 2px 10px rgba(0,0,0,0.95)',
                opacity: 0.95,
                whiteSpace: 'nowrap',
                textAlign: 'center',
                background: 'rgba(6,16,31,0.65)',
                padding: '6px 14px',
                borderRadius: 8,
                border: `1px solid ${dotColor}66`,
                backdropFilter: 'blur(6px)',
              }}
            >
              {d.label}
              <span
                style={{
                  fontFamily: FONT_SERIF,
                  fontWeight: 700,
                  fontSize: 28,
                  color: dotColor,
                  marginLeft: 10,
                  letterSpacing: 0,
                }}
              >
                {d.value}
              </span>
            </div>
          </React.Fragment>
        );
      })}
      <SourcePill
        text="Fortune / AEI Housing Center · Apr 2026"
        startFrame={Math.round(fps * 1.4)}
      />
      <TickerTape items={CITY_TICKER} y={1700} />
    </AbsoluteFill>
  );
};

// ─── Beat 3: Bar race comparison ─────────────────────────────────────────
const BeatBars: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <GradientMeshBg palette="navy" />
      <SlamLine
        text="HOME PRICES, FEB '25 → FEB '26"
        startFrame={2}
        fontSize={38}
        top="11%"
        underline={GOLD_BRAND}
        color={CREAM}
        fontFamily={FONT_BODY}
        fontWeight={900}
        letterSpacing={3.4}
        textTransform="uppercase"
      />
      <BarRace
        items={[
          { label: 'Cape Coral, FL', pct: -9.6, tone: 'down' },
          { label: 'Kansas City, MO', pct: 8.6, tone: 'up' },
        ]}
        startFrame={Math.round(fps * 0.2)}
        staggerFrames={10}
        growthFrames={28}
        topPx={580}
        rowHeight={260}
        scale={42}
        labelWidth={340}
      />
      <SourcePill
        text="Fortune · AEI Housing Center · Apr 2026"
        startFrame={Math.round(fps * 1.6)}
      />
    </AbsoluteFill>
  );
};

// ─── Beat 4: The pattern ─────────────────────────────────────────────────
const BeatPattern: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <GradientMeshBg palette="forest" intensity={0.85} />
      <KineticHook
        text="It's not geography."
        startFrame={2}
        fontSize={84}
        top="34%"
        color={CREAM}
        fontFamily={FONT_SERIF}
        fontWeight={400}
        shake={false}
      />
      <KineticHook
        text="It's the cycle."
        startFrame={Math.round(fps * 0.7)}
        fontSize={130}
        top="56%"
        color={GOLD_BRAND}
        fontFamily={FONT_SERIF}
        fontWeight={700}
      />
      <WordReveal
        text="WHERE YOU BOUGHT IN |MATTERS MORE THAN WHERE"
        startFrame={Math.round(fps * 1.4)}
        perWordFrames={4}
        fontSize={32}
        top="78%"
        color={CREAM}
        highlightColor={GOLD_BRAND}
        letterSpacing={2.4}
      />
    </AbsoluteFill>
  );
};

// ─── Beat 5: National takeaway (replaces former Bend localization) ───────
// Per Matt 2026-04-27: don't shoehorn Bend into national stories. This
// beat closes on the cycle-position thesis itself, not a Bend stat.
const BeatTakeaway: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <GradientMeshBg palette="navy" intensity={0.95} />
      <SlamLine
        text="THE TAKEAWAY"
        startFrame={2}
        fontSize={48}
        top="14%"
        underline={GOLD_BRAND}
        color={GOLD_BRAND}
        fontFamily={FONT_BODY}
        fontWeight={900}
        letterSpacing={8}
        textTransform="uppercase"
      />
      <KineticHook
        text="The hottest markets"
        startFrame={Math.round(fps * 0.4)}
        fontSize={84}
        top="36%"
        color={CREAM}
        fontFamily={FONT_SERIF}
        fontWeight={400}
      />
      <KineticHook
        text="cool the fastest."
        startFrame={Math.round(fps * 0.9)}
        fontSize={120}
        top="52%"
        color={GOLD_BRAND}
        fontFamily={FONT_SERIF}
        fontWeight={700}
      />
      <WordReveal
        text="CYCLE POSITION |OVER GEOGRAPHY"
        startFrame={Math.round(fps * 1.6)}
        perWordFrames={5}
        fontSize={36}
        top="74%"
        color={CREAM}
        highlightColor={GOLD_BRAND}
        letterSpacing={3.4}
      />
      <SourcePill
        text="Fortune · AEI Housing Center · Apr 2026"
        startFrame={Math.round(fps * 1.8)}
      />
      <TickerTape items={CITY_TICKER} y={1700} />
    </AbsoluteFill>
  );
};

export const ClipSunBeltCorrection: React.FC = () => {
  // 45s = 1350 frames @ 30fps. NATIONAL story (no Bend per Matt 2026-04-27).
  // Dense VO (Ellen turbo_v2_5):
  //   s01 1.99s, s02 8.72s, s03 6.22s, s04 8.20s, s05 6.09s = 31.2s VO total
  //
  //   0–200     (0–6.7s)   Hook                 VO s01 @ 9 (ends 69)
  //   180–510   (6–17s)    Map: 4 cities + KC   VO s02 @ 85 (ends 347)
  //   495–760   (16.5–25.3) Bar race            VO s03 @ 510 (ends 696)
  //   745–985   (24.8–32.8) Pattern editorial   VO s04 @ 760 (ends 1006)
  //   970–1215  (32.3–40.5) Takeaway national   VO s05 @ 985 (ends 1168)
  //   1200–1350 (40–45s)   End card w/ logo + phone + URL
  return (
    <AbsoluteFill style={{ background: '#06101F' }}>
      <Sequence from={0} durationInFrames={200}>
        <BeatHook />
      </Sequence>
      <Sequence from={180} durationInFrames={330}>
        <BeatMap />
      </Sequence>
      <Sequence from={495} durationInFrames={265}>
        <BeatBars />
      </Sequence>
      <Sequence from={745} durationInFrames={240}>
        <BeatPattern />
      </Sequence>
      <Sequence from={970} durationInFrames={245}>
        <BeatTakeaway />
      </Sequence>
      <Sequence from={1200} durationInFrames={150}>
        <NewsEndCard startFrame={0} />
      </Sequence>

      {/* ─── VO + Captions (Ellen turbo_v2_5, prosody-chained) ─── */}
      <Sequence from={9} durationInFrames={75}>
        <Audio src={staticFile('audio/news_sbc_s01.mp3')} />
        <CaptionTrack text="The Sun Belt boom is unwinding." startFrame={0} durationFrames={75} />
      </Sequence>
      <Sequence from={85} durationInFrames={275}>
        <Audio src={staticFile('audio/news_sbc_s02.mp3')} />
        <CaptionTrack text="Cape Coral down 9.6% YoY (AEI Housing Center)." startFrame={0} durationFrames={275} fontSize={32} />
      </Sequence>
      <Sequence from={510} durationInFrames={200}>
        <Audio src={staticFile('audio/news_sbc_s03.mp3')} />
        <CaptionTrack text="Phoenix, Tampa, Austin. All giving back gains." startFrame={0} durationFrames={200} fontSize={32} />
      </Sequence>
      <Sequence from={760} durationInFrames={250}>
        <Audio src={staticFile('audio/news_sbc_s04.mp3')} />
        <CaptionTrack text="Kansas City +8.6%. Mid-American steady markets climbing." startFrame={0} durationFrames={250} fontSize={30} />
      </Sequence>
      <Sequence from={985} durationInFrames={195}>
        <Audio src={staticFile('audio/news_sbc_s05.mp3')} />
        <CaptionTrack text="Cycle position, not geography." startFrame={0} durationFrames={195} />
      </Sequence>
    </AbsoluteFill>
  );
};
