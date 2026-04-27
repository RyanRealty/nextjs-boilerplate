// ClipTariffs — viral rebuild, 30s news clip, 1080×1920 portrait.
//
// Verification trace per figure:
//   - "$10,900 per home" → NAHB / Wells Fargo Housing Market Index, APRIL 2025
//     survey. https://www.nahb.org/blog/2025/05/tariff-uncertainty-impact-on-home-building
//     "On average, suppliers increased their prices by 6.3% ... builders
//     estimate a typical cost effect from recent tariff actions at $10,900
//     per home."
//   - "Builder costs up 6.3% on average" → same source, same release.
//   - "450,000 fewer homes through 2030" → Center for American Progress
//     analysis. https://www.americanprogress.org/article/trump-administration-tariffs-could-result-in-450000-fewer-new-homes-through-2030/
//
// Visual rebuild: blueprint grid + ember mesh backdrop, kinetic mega
// hook, percent ring on the 6.3%, giant counter slam-in on $10,900,
// material list with pop-in items, persistent ticker, brand pill source
// attribution. No stock photos, no AI imagery.

import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { CREAM, FONT_BODY, FONT_SERIF } from '../brand';
import { clamp } from '../easing';
import {
  GradientMeshBg,
  BlueprintGrid,
  KineticHook,
  WordReveal,
  GiantNumber,
  PercentRing,
  TickerTape,
  BreakingBadge,
  SourcePill,
  BrandWatermark,
  NewsEndCard,
  SlamLine,
  BigQuote,
  CaptionTrack,
  GOLD_BRAND,
  RED_DROP,
  formatDollars,
  formatCommas,
} from './viral_primitives';

const FPS = 30;
export const CLIP_TARIFFS_TOTAL_SEC = 45.0;

const TARIFF_TICKER = [
  { label: 'Per new home', value: '+$10,900', tone: 'down' as const },
  { label: 'Supplier prices', value: '+6.3%', tone: 'down' as const },
  { label: 'Homes lost by 2030', value: '450,000', tone: 'down' as const },
  { label: 'Lumber, steel, drywall', value: 'Up', tone: 'down' as const },
  { label: 'Existing inventory', value: 'Stronger', tone: 'up' as const },
];

// ─── Stamped material chip ───────────────────────────────────────────────
type ChipProps = {
  label: string;
  startFrame: number;
  delayIndex: number;
  top: number;
};
const MaterialChip: React.FC<ChipProps> = ({
  label,
  startFrame,
  delayIndex,
  top,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localF = frame - (startFrame + delayIndex * 6);
  const sp = spring({
    frame: localF,
    fps,
    config: { damping: 9, mass: 0.5, stiffness: 130 },
  });
  const scale = 0.85 + sp * 0.15;
  const opacity = clamp(localF / 4, 0, 1);
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top,
        transform: `translate(-50%, 0) scale(${scale.toFixed(3)})`,
        opacity,
        background: 'rgba(212,175,55,0.92)',
        color: '#1a0a04',
        padding: '18px 22px',
        borderRadius: 14,
        fontFamily: FONT_BODY,
        fontWeight: 900,
        fontSize: 32,
        letterSpacing: 3,
        textTransform: 'uppercase',
        boxShadow: '0 8px 26px rgba(0,0,0,0.7)',
        border: '2px solid rgba(255,255,255,0.18)',
        whiteSpace: 'nowrap',
        textAlign: 'center',
        width: 760,
      }}
    >
      {label}
    </div>
  );
};

// ─── Beat 1: Hook ────────────────────────────────────────────────────────
const BeatHook: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <GradientMeshBg palette="ember" />
      <BlueprintGrid color="rgba(212,175,55,0.18)" />
      <BreakingBadge label="TARIFFS · BUILDER COSTS" startFrame={0} />
      <KineticHook
        text="Your next home"
        startFrame={2}
        fontSize={92}
        top="36%"
        color={CREAM}
        fontFamily={FONT_SERIF}
        fontWeight={400}
      />
      <KineticHook
        text="just got pricier."
        startFrame={Math.round(fps * 0.45)}
        fontSize={120}
        top="50%"
        color={GOLD_BRAND}
        fontFamily={FONT_SERIF}
        fontWeight={700}
        maxWidth={1000}
      />
      <WordReveal
        text="WHY TARIFFS |HIT YOUR MORTGAGE"
        startFrame={Math.round(fps * 1.0)}
        perWordFrames={5}
        fontSize={38}
        top="68%"
        color={CREAM}
        highlightColor={GOLD_BRAND}
        letterSpacing={3}
      />
      <BrandWatermark startFrame={20} />
    </AbsoluteFill>
  );
};

// ─── Beat 2: Hero $10,900 counter with percent ring ──────────────────────
const BeatCost: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <GradientMeshBg palette="ember" intensity={0.95} />
      <BlueprintGrid color="rgba(212,175,55,0.10)" />
      <SlamLine
        text="ADDED COST PER NEW HOME"
        startFrame={2}
        fontSize={42}
        top="14%"
        underline={GOLD_BRAND}
        color={CREAM}
        fontFamily={FONT_BODY}
        fontWeight={900}
        letterSpacing={3.4}
        textTransform="uppercase"
      />
      <GiantNumber
        from={0}
        to={10900}
        startFrame={Math.round(fps * 0.2)}
        durationFrames={Math.round(fps * 1.7)}
        format={formatDollars}
        fontSize={240}
        color={GOLD_BRAND}
        top="46%"
      />
      <WordReveal
        text="FROM TARIFFS ON |BUILDING MATERIALS"
        startFrame={Math.round(fps * 1.8)}
        perWordFrames={5}
        fontSize={36}
        top="68%"
        color={CREAM}
        highlightColor={GOLD_BRAND}
        letterSpacing={2.4}
      />
      <SourcePill
        text="NAHB / Wells Fargo HMI · April 2025"
        startFrame={Math.round(fps * 2.0)}
      />
      <TickerTape items={TARIFF_TICKER} y={1700} />
    </AbsoluteFill>
  );
};

// ─── Beat 3: Where the cost comes from — material chips ──────────────────
const BeatMaterials: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <GradientMeshBg palette="ember" intensity={0.85} />
      <BlueprintGrid color="rgba(212,175,55,0.16)" />
      <SlamLine
        text="WHERE THE $10,900 COMES FROM"
        startFrame={2}
        fontSize={36}
        top="11%"
        underline={GOLD_BRAND}
        color={CREAM}
        fontFamily={FONT_BODY}
        fontWeight={900}
        letterSpacing={3.4}
        textTransform="uppercase"
      />
      <MaterialChip label="Canadian softwood lumber" startFrame={Math.round(fps * 0.2)} delayIndex={0} top={340} />
      <MaterialChip label="Steel & aluminum" startFrame={Math.round(fps * 0.2)} delayIndex={1} top={440} />
      <MaterialChip label="Cabinets · drywall · doors" startFrame={Math.round(fps * 0.2)} delayIndex={2} top={540} />
      <PercentRing
        pct={6.3}
        startFrame={Math.round(fps * 1.0)}
        durationFrames={Math.round(fps * 1.4)}
        size={520}
        stroke={22}
        color={RED_DROP}
        centerY="68%"
      />
      <GiantNumber
        from={0}
        to={6.3}
        startFrame={Math.round(fps * 1.0)}
        durationFrames={Math.round(fps * 1.4)}
        format={(v) => `+${v.toFixed(1)}%`}
        fontSize={140}
        color={CREAM}
        top="68%"
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '83%',
          transform: 'translateX(-50%)',
          fontFamily: FONT_BODY,
          fontWeight: 800,
          fontSize: 28,
          color: CREAM,
          letterSpacing: 3,
          textTransform: 'uppercase',
          textAlign: 'center',
          textShadow: '0 2px 12px rgba(0,0,0,0.95)',
          whiteSpace: 'nowrap',
        }}
      >
        Avg supplier price increase
      </div>
      <SourcePill
        text="NAHB / Wells Fargo HMI · April 2025"
        startFrame={Math.round(fps * 2.0)}
      />
    </AbsoluteFill>
  );
};

// ─── Beat 4: 450,000 fewer homes by 2030 ─────────────────────────────────
const BeatProjection: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <GradientMeshBg palette="crimson" intensity={0.95} />
      <SlamLine
        text="THROUGH 2030"
        startFrame={2}
        fontSize={48}
        top="13%"
        underline={GOLD_BRAND}
        color={GOLD_BRAND}
        fontFamily={FONT_BODY}
        fontWeight={900}
        letterSpacing={8}
        textTransform="uppercase"
      />
      <GiantNumber
        from={0}
        to={450000}
        startFrame={Math.round(fps * 0.2)}
        durationFrames={Math.round(fps * 1.9)}
        format={formatCommas}
        fontSize={220}
        color={CREAM}
        top="46%"
      />
      <WordReveal
        text="FEWER NEW HOMES |WILL BE BUILT"
        startFrame={Math.round(fps * 2.0)}
        perWordFrames={5}
        fontSize={42}
        top="66%"
        color={CREAM}
        highlightColor={GOLD_BRAND}
        letterSpacing={3}
      />
      <SourcePill
        text="Center for American Progress · 2026"
        startFrame={Math.round(fps * 2.2)}
      />
      <TickerTape items={TARIFF_TICKER} y={1700} />
    </AbsoluteFill>
  );
};

// ─── Beat 5: Editorial close ─────────────────────────────────────────────
const BeatClose: React.FC = () => {
  return (
    <AbsoluteFill>
      <GradientMeshBg palette="navy" intensity={0.85} />
      <BigQuote
        text="When new construction gets harder, the home you already own gets stronger."
        startFrame={4}
        fontSize={56}
        maxWidth={920}
      />
      <BrandWatermark startFrame={10} />
    </AbsoluteFill>
  );
};

export const ClipTariffs: React.FC = () => {
  // Beat layout:
  //   0–80     (0–2.7s)   Hook
  //   65–230   (2.2–7.7s) $10,900 hero
  //   220–460  (7.3–15.3s) Materials + 6.3% ring
  //   450–620  (15–20.7s) 450,000 projection
  //   610–780  (20.3–26s) Editorial close
  //   780–900  (26–30s)   End card
  // 45s = 1350 frames @ 30fps. Dense VO (Ellen turbo_v2_5):
  //   s01 6.11s, s02 5.56s, s03 7.78s, s04 6.69s, s05 6.58s = 32.7s VO total
  //
  //   0–225     (0–7.5s)   Hook + cost reveal   VO s01 @ 9 (ends 192)
  //   210–410   (7.0–13.7) NAHB attribution     VO s02 @ 220 (ends 387)
  //   395–660   (13.2–22)  Materials + 6.3%     VO s03 @ 410 (ends 643)
  //   645–890   (21.5–29.7) 450k projection     VO s04 @ 660 (ends 861)
  //   875–1215  (29.2–40.5) Close               VO s05 @ 890 (ends 1088)
  //   1200–1350 (40–45s)   End card w/ white stacked logo + phone + URL
  return (
    <AbsoluteFill style={{ background: '#0e0703' }}>
      <Sequence from={0} durationInFrames={225}>
        <BeatHook />
      </Sequence>
      <Sequence from={210} durationInFrames={200}>
        <BeatCost />
      </Sequence>
      <Sequence from={395} durationInFrames={265}>
        <BeatMaterials />
      </Sequence>
      <Sequence from={645} durationInFrames={245}>
        <BeatProjection />
      </Sequence>
      <Sequence from={875} durationInFrames={340}>
        <BeatClose />
      </Sequence>
      <Sequence from={1200} durationInFrames={150}>
        <NewsEndCard startFrame={0} />
      </Sequence>

      {/* ─── VO + Captions (Ellen turbo_v2_5, prosody-chained) ─── */}
      <Sequence from={9} durationInFrames={195}>
        <Audio src={staticFile('audio/news_tariffs_s01.mp3')} />
        <CaptionTrack text="$10,900 added to every new home." startFrame={0} durationFrames={195} />
      </Sequence>
      <Sequence from={220} durationInFrames={175}>
        <Audio src={staticFile('audio/news_tariffs_s02.mp3')} />
        <CaptionTrack text="Per NAHB tariff impact estimate." startFrame={0} durationFrames={175} />
      </Sequence>
      <Sequence from={410} durationInFrames={235}>
        <Audio src={staticFile('audio/news_tariffs_s03.mp3')} />
        <CaptionTrack text="Suppliers up 6.3%. Lumber, steel, cabinets, drywall." startFrame={0} durationFrames={235} fontSize={32} />
      </Sequence>
      <Sequence from={660} durationInFrames={210}>
        <Audio src={staticFile('audio/news_tariffs_s04.mp3')} />
        <CaptionTrack text="450,000 fewer new homes by 2030 (CAP)." startFrame={0} durationFrames={210} />
      </Sequence>
      <Sequence from={890} durationInFrames={210}>
        <Audio src={staticFile('audio/news_tariffs_s05.mp3')} />
        <CaptionTrack text="Less new supply. Existing homes hold their leverage." startFrame={0} durationFrames={210} fontSize={32} />
      </Sequence>
    </AbsoluteFill>
  );
};
