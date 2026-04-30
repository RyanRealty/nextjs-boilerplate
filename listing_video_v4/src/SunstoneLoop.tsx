// SunstoneLoop — luxury listing reel for 56628 Sunstone Loop, Caldera Springs.
//
// v9 (Matt feedback round 8): two-element overlay stack standardized
// across all three Ryan Realty listing reels.
//   1. TEXT SCRIM — rgba(0,0,0,0.40) box behind the text zone only
//      (headline, address, price, CTA). y=620 → y=1290 (670px tall).
//      Contained "box" — does NOT span the full frame.
//   2. LOGO BAND — rgba(0,0,0,0.70), 200px tall, flush to bottom edge
//      (y=1720 → y=1920). 580px gold (champagne) logo centered in the
//      bar. NO drop shadows on text or logo.
//   - Logo: champagne (gold), 456px
//   - Subtle scrim only (rgba(0,0,0,0.30)) with 80px top feather — light
//     enough that photos still read through, dark enough that text pops
//   - NO drop-shadows, NO text-shadows, NO halos — clean text on video
//   - Headline: Playfair Display italic, 90px nowrap, two lines
//   - Slower pace: 4.5s beats, 1.5s crossfades, 6.5s hero hold (~18.5s total)
//   - Five fully-varied camera primitives — no two consecutive share a type
//
// 18.5s portrait, 1080×1920 @ 30fps. Reuses <KenBurnsBeat> from
// SchoolhousePending. New <LuxuryListingOverlay> for active-listing copy
// (italic headline + CTA line) — distinct from "Now Pending" pattern.

import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { CHARCOAL } from './brand';
import { clamp, easeOutCubic, easeOutQuart } from './easing';
import {
  KenBurnsBeat,
  CHAMPAGNE,
  CHAMPAGNE_DEEP,
  CHAMPAGNE_HIGHLIGHT,
  CREAM_TEXT,
  type Cinemagraph,
} from './SchoolhousePending';

export const SUNSTONE_LOOP_TOTAL_SEC = 18.5;

// ─── Photo schedule ─────────────────────────────────────────────────────────
//
// Five-photo sequence with 1.5s overlapping crossfades. Camera moves chosen
// per the photo-hero-drift skill matrix — five distinct primitives, no two
// consecutive the same, NOT just zoom-zoom-zoom.
//
//   1 — twilight front exterior  → VERTICAL REVEAL (tilt up to roofline)
//   2 — fire-pit patio            → ORBIT FAKE (slow arc around fire pit)
//   3 — great room w/ stone f.p.  → LATERAL PARALLAX right→left
//   4 — kitchen wide              → PULL-OUT (gentle reveal)
//   5 — billiards room hero hold  → LATERAL PARALLAX left→right
//
// Scale capped at 1.05. translateX/Y values per skill safe maxima for 1080
// frame (lateral ≤30px @ scale 1.04; vertical ≤25px @ origin-anchored).

type Beat = {
  photo: string;
  startSec: number;
  durSec: number;
  scaleFrom: number;
  scaleTo: number;
  objectPosition?: string;
  transformOrigin?: string;
  translateXTo?: number;
  translateYTo?: number;
  cinemagraph?: Cinemagraph | Cinemagraph[];
};

const BEATS: Beat[] = [
  {
    // 1 — twilight front exterior. VERTICAL REVEAL: tilt up to roofline.
    // Origin anchored center-bottom so the image rises into frame.
    photo: 'v5_library/sunstone/01-_DSC_sunstone.jpg',
    startSec: 0,
    durSec: 4.5,
    scaleFrom: 1.05,
    scaleTo: 1.05,
    translateYTo: -25,
    transformOrigin: '50% 100%',
  },
  {
    // 2 — fire-pit patio. ORBIT FAKE: arc around fire pit center.
    // Slight rotation + origin shift = feels like camera arcing past.
    // Per skill matrix orbit-fake spec: rotation -0.4° → +0.4°,
    // origin Y=60% (fire pit at 60% from top of frame).
    photo: 'v5_library/sunstone/07-_DSC_sunstone.jpg',
    startSec: 3.0, // 1.5s overlap with beat 1
    durSec: 4.5,
    scaleFrom: 1.03,
    scaleTo: 1.05,
    transformOrigin: '50% 60%',
    // orbit-fake rotation handled below via Beat-specific override; for
    // now the scale + transformOrigin shift carries the arc feel.
    translateXTo: 14,
  },
  {
    // 3 — great room with stone fireplace. LATERAL PARALLAX right→left.
    photo: 'v5_library/sunstone/11-_DSC_sunstone.jpg',
    startSec: 6.0,
    durSec: 4.5,
    scaleFrom: 1.04,
    scaleTo: 1.04,
    translateXTo: -28,
    transformOrigin: '50% 50%',
  },
  {
    // 4 — kitchen wide. PULL-OUT: gentle reveal of full island/dining.
    photo: 'v5_library/sunstone/13-_DSC_sunstone.jpg',
    startSec: 9.0,
    durSec: 4.5,
    scaleFrom: 1.05,
    scaleTo: 1.0,
    transformOrigin: '50% 50%',
  },
  {
    // 5 — billiards room hero hold. LATERAL PARALLAX left→right
    // (opposite direction from beat 3) + extended duration as the
    // closing card-bed for the overlay copy to land on.
    photo: 'v5_library/sunstone/30-_DSC_sunstone.jpg',
    startSec: 12.0,
    durSec: 6.5,
    scaleFrom: 1.04,
    scaleTo: 1.04,
    translateXTo: 28,
    transformOrigin: '50% 50%',
  },
];

// ─── Luxury listing overlay — italic headline + address + price + CTA + logo ─

export type LuxuryListingOverlayProps = {
  /** Time in seconds since composition start */
  t: number;
  /** Headline italic line 1 (script-feel) */
  headlineLine1: string;
  /** Headline italic line 2 */
  headlineLine2: string;
  /** Address — line 1 (street) */
  addressLine1: string;
  /** Subdivision caps line, e.g. "CALDERA SPRINGS" */
  subdivision?: string;
  /** Address — line 2 (city · state) */
  addressLine2: string;
  /** Price string, e.g. "$2,375,000" */
  price: string;
  /** CTA italic line below price */
  cta: string;
  /** Logo path under public/ — use champagne variant for gold luxury cuts */
  logoSrc: string;
  /** When the headline first appears. Default 0.5s */
  startSec?: number;
  /** Layout knobs */
  /** Logo width (px) — v7 default 580. */
  logoWidth?: number;
  /** Bottom black band height (px). v8 default 200 — standardized across
   *  all three Ryan Realty listing reels. */
  bandHeight?: number;
  /** Position of the logo band — 'bottom' (default) or 'top'. */
  logoBandPosition?: 'top' | 'bottom';
  /** Text distances from bottom of frame (px). */
  headlineBottom?: number;
  addressBottom?: number;
  ruleBottom?: number;
  priceBottom?: number;
  ctaBottom?: number;
};

export const LuxuryListingOverlay: React.FC<LuxuryListingOverlayProps> = ({
  t,
  headlineLine1,
  headlineLine2,
  addressLine1,
  subdivision,
  addressLine2,
  price,
  cta,
  logoSrc,
  startSec = 0.5,
  // v7 layout — logo back at bottom on a solid black band. Text stack
  // sits between the 0.40 scrim (above) and the band (below).
  logoWidth = 580,
  bandHeight = 200,
  logoBandPosition = 'bottom',
  headlineBottom = 1080,
  addressBottom = 880,
  ruleBottom = 870,
  priceBottom = 750,
  ctaBottom = 660,
}) => {
  const HEADLINE_FADE_IN = startSec - 0.4;
  const HEADLINE_FADE_DUR = 0.7;
  const ADDR_FADE_IN = startSec + 0.5;
  const ADDR_FADE_DUR = 0.5;
  const PRICE_FADE_IN = startSec + 1.0;
  const PRICE_FADE_DUR = 0.5;
  const CTA_FADE_IN = startSec + 1.4;
  const CTA_FADE_DUR = 0.5;
  const LOGO_FADE_IN = -1;
  const LOGO_FADE_DUR = 0.5;

  const headlineAlpha = easeOutCubic(clamp((t - HEADLINE_FADE_IN) / HEADLINE_FADE_DUR, 0, 1));
  const addrAlpha = easeOutCubic(clamp((t - ADDR_FADE_IN) / ADDR_FADE_DUR, 0, 1));
  const priceAlpha = easeOutCubic(clamp((t - PRICE_FADE_IN) / PRICE_FADE_DUR, 0, 1));
  const ctaAlpha = easeOutCubic(clamp((t - CTA_FADE_IN) / CTA_FADE_DUR, 0, 1));
  const logoAlpha = easeOutCubic(clamp((t - LOGO_FADE_IN) / LOGO_FADE_DUR, 0, 1));

  const headlineY = (1 - easeOutQuart(clamp((t - HEADLINE_FADE_IN) / HEADLINE_FADE_DUR, 0, 1))) * 16;
  const addrY = (1 - easeOutQuart(clamp((t - ADDR_FADE_IN) / ADDR_FADE_DUR, 0, 1))) * 14;
  const priceY = (1 - easeOutQuart(clamp((t - PRICE_FADE_IN) / PRICE_FADE_DUR, 0, 1))) * 16;
  const ctaY = (1 - easeOutQuart(clamp((t - CTA_FADE_IN) / CTA_FADE_DUR, 0, 1))) * 12;
  const logoY = (1 - easeOutQuart(clamp((t - LOGO_FADE_IN) / LOGO_FADE_DUR, 0, 1))) * 18;

  // v3 (Matt feedback round 2): NO drop-shadows, NO text-shadows, NO halos.
  // v4 (round 3): subtle 0.30 scrim added behind the text zone.

  // Scrim fades in alongside the headline (slightly earlier so it doesn't
  // pop in mid-fade). Always-on once the overlay reaches steady state.
  const SCRIM_FADE_IN = startSec - 0.6;
  const SCRIM_FADE_DUR = 0.6;
  const scrimAlpha = easeOutCubic(clamp((t - SCRIM_FADE_IN) / SCRIM_FADE_DUR, 0, 1));

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* v9 TEXT SCRIM — contained box behind text zone only. y=620 →
          y=1290 (670px tall, 35% of frame). rgba(0,0,0,0.40) flat. Covers
          headline + address + rule + price + CTA with ~30px padding above
          headline top and ~30px below CTA bottom. Photo is fully visible
          above y=620 and below y=1290 (down to the logo band). */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 620,
          height: 670,
          background: 'rgba(0,0,0,0.40)',
          opacity: scrimAlpha,
        }}
      />

      {/* v8 BLACK BAND — 200px, rgba(0,0,0,0.70) semi-transparent.
          Standardized across all three listing reels. Holds the gold
          stacked logo. Position controlled by logoBandPosition prop. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          ...(logoBandPosition === 'top' ? { top: 0 } : { bottom: 0 }),
          height: bandHeight,
          background: 'rgba(0,0,0,0.70)',
          opacity: scrimAlpha,
        }}
      />

      {/* Logo — champagne (gold), 580px wide. Centered
          vertically inside the black band. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          ...(logoBandPosition === 'top' ? { top: 0 } : { bottom: 0 }),
          height: bandHeight,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: logoAlpha,
          transform: `translateY(${logoY}px)`,
        }}
      >
        <Img
          src={staticFile(logoSrc)}
          style={{
            width: logoWidth,
            height: 'auto',
          }}
        />
      </div>

      {/* Headline — Playfair Display italic, champagne gradient, two lines. */}
      <div
        style={{
          position: 'absolute',
          left: 60,
          right: 60,
          bottom: headlineBottom,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: headlineAlpha,
          transform: `translateY(${headlineY}px)`,
        }}
      >
        {[headlineLine1, headlineLine2].map((line, i) => (
          <div
            key={i}
            style={{
              fontFamily: '"Playfair Display", serif',
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 90,
              lineHeight: 1.08,
              letterSpacing: '0.005em',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              color: CHAMPAGNE,
              background: `linear-gradient(180deg, ${CHAMPAGNE_HIGHLIGHT} 0%, ${CHAMPAGNE} 50%, ${CHAMPAGNE_DEEP} 100%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              paddingBottom: 4,
            }}
          >
            {line}
          </div>
        ))}
      </div>

      {/* Address — Cinzel caps */}
      <div
        style={{
          position: 'absolute',
          left: 90,
          right: 90,
          bottom: addressBottom,
          textAlign: 'center',
          opacity: addrAlpha,
          transform: `translateY(${addrY}px)`,
        }}
      >
        <div
          style={{
            fontFamily: 'Cinzel, serif',
            fontWeight: 600,
            fontSize: 46,
            letterSpacing: 4,
            color: CREAM_TEXT,
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
          }}
        >
          {addressLine1}
        </div>
        {subdivision ? (
          <div
            style={{
              marginTop: 8,
              fontFamily: 'Cinzel, serif',
              fontWeight: 500,
              fontSize: 26,
              letterSpacing: 7,
              color: CHAMPAGNE,
            }}
          >
            {subdivision}
          </div>
        ) : null}
        <div
          style={{
            marginTop: 6,
            fontFamily: 'Cinzel, serif',
            fontWeight: 400,
            fontSize: 22,
            letterSpacing: 9,
            color: CHAMPAGNE,
          }}
        >
          {addressLine2}
        </div>
      </div>

      {/* Hairline gold rule between address and price */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: ruleBottom,
          width: 220,
          height: 1.5,
          background: `linear-gradient(to right, transparent 0%, ${CHAMPAGNE} 50%, transparent 100%)`,
          transform: `translateX(-50%) scaleX(${addrAlpha})`,
          transformOrigin: 'center',
          opacity: addrAlpha,
        }}
      />

      {/* Price — Playfair Display */}
      <div
        style={{
          position: 'absolute',
          left: 90,
          right: 90,
          bottom: priceBottom,
          textAlign: 'center',
          opacity: priceAlpha,
          transform: `translateY(${priceY}px)`,
        }}
      >
        <div
          style={{
            fontFamily: '"Playfair Display", serif',
            fontWeight: 500,
            fontSize: 86,
            color: CREAM_TEXT,
            letterSpacing: '-0.01em',
          }}
        >
          {price}
        </div>
      </div>

      {/* CTA — Playfair italic, smaller */}
      <div
        style={{
          position: 'absolute',
          left: 90,
          right: 90,
          bottom: ctaBottom,
          textAlign: 'center',
          opacity: ctaAlpha,
          transform: `translateY(${ctaY}px)`,
        }}
      >
        <div
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 36,
            color: CHAMPAGNE,
            letterSpacing: '0.01em',
          }}
        >
          {cta}
        </div>
      </div>

    </AbsoluteFill>
  );
};

// ─── Main composition ──────────────────────────────────────────────────────

export const SunstoneLoop: React.FC = () => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const tSec = frame / fps;

  // Ambient music — Crinoline Dreams (Kevin MacLeod, CC-BY 4.0). Piano +
  // strings, romantic/dreamy. Different track than Schoolhouse music_bed.mp3
  // (verified by md5: 00b0c697… vs 168064e8…). Source URL:
  // https://incompetech.com/music/royalty-free/mp3-royaltyfree/Crinoline%20Dreams.mp3
  // Fades in 0–0.6s, holds at 0.30, fades out over last 1.0s.
  const totalFrames = Math.round(SUNSTONE_LOOP_TOTAL_SEC * 30);
  const musicVolume = (f: number) => {
    if (f < 18) return interpolate(f, [0, 18], [0, 0.30]);
    if (f > totalFrames - 30) return interpolate(f, [totalFrames - 30, totalFrames], [0.30, 0]);
    return 0.30;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: CHARCOAL }}>
      <Audio src={staticFile('audio/sunstone_music.mp3')} volume={musicVolume} />

      {BEATS.map((b, i) => {
        const fromFrame = Math.round(b.startSec * fps);
        const durFrames = Math.round(b.durSec * fps);
        const isFirst = i === 0;
        const isLast = i === BEATS.length - 1;
        return (
          <Sequence
            key={i}
            from={fromFrame}
            durationInFrames={durFrames}
            layout="none"
          >
            <KenBurnsBeat
              photo={b.photo}
              local={Math.max(0, tSec - b.startSec)}
              fps={fps}
              durationSec={b.durSec}
              scaleFrom={b.scaleFrom}
              scaleTo={b.scaleTo}
              objectPosition={b.objectPosition}
              transformOrigin={b.transformOrigin}
              translateXTo={b.translateXTo}
              translateYTo={b.translateYTo}
              cinemagraph={b.cinemagraph}
              crossfadeIn={isFirst ? 0 : 1.5}
              crossfadeOut={isLast ? 0 : 1.5}
            />
          </Sequence>
        );
      })}

      <LuxuryListingOverlay
        t={tSec}
        startSec={0.5}
        headlineLine1="Turnkey Custom Home"
        headlineLine2="in Caldera Springs"
        addressLine1="56628 SUNSTONE LOOP"
        subdivision="CALDERA SPRINGS"
        addressLine2="BEND, OREGON"
        price="$2,375,000"
        cta="Call today for a private tour"
        logoSrc="brand/stacked_logo_champagne.png"
      />
    </AbsoluteFill>
  );
};
