// AnimatedInfoCard — info-panel layout for event / listing / market details.
//
// Renders:
//   - Optional eyebrow (small uppercase label, e.g. "FRIDAY · 7PM")
//   - Headline (large serif)
//   - Optional subhead
//   - 0..N detail rows (label + value) — stagger-animated in
//   - 0..N pills (price, time, location chips)
//
// The whole card has a built-in dark scrim so text is legible regardless of
// what's behind it. Position with the `placement` prop or absolute-style
// overrides.

import React from 'react';
import {
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  applyEasing,
  clamp,
  EasingName,
  SPRING_PRESETS,
  SpringPresetName,
} from './easing';

export type InfoCardDetail = {
  label: string;
  value: string;
};

export type InfoCardPill = {
  text: string;
  /** Optional foreground color override. */
  color?: string;
  /** Optional background color override. */
  background?: string;
};

export type AnimatedInfoCardProps = {
  /** Tiny uppercase eyebrow above the headline. */
  eyebrow?: string;
  headline: string;
  subhead?: string;
  details?: InfoCardDetail[];
  pills?: InfoCardPill[];

  /** When the card content begins animating in (s). Default 0. */
  delaySec?: number;
  /** Stagger between each animated child (s). Default 0.12. */
  staggerSec?: number;
  /** Spring config for the entrance. Default 'snappy'. */
  spring?: SpringPresetName;

  /** Where in the frame to anchor the card. Default 'bottom'. */
  placement?: 'top' | 'center' | 'bottom' | 'free';
  /** Used when placement === 'free'. */
  style?: React.CSSProperties;

  /** Maximum width for the card content (px). Default 900. */
  maxWidth?: number;

  /** Background scrim under the card. Default semi-translucent navy. */
  background?: string;
  /** Optional border / accent color. Default brand gold. */
  accent?: string;
  /** Easing curve for the panel slide-in. Default 'easeOutQuart'. */
  easing?: EasingName;
};

const DEFAULT_GOLD = '#D4AF37';
const DEFAULT_NAVY = 'rgba(10,18,30,0.78)';
const DEFAULT_OFF_WHITE = '#F2EBDD';

export const AnimatedInfoCard: React.FC<AnimatedInfoCardProps> = ({
  eyebrow,
  headline,
  subhead,
  details = [],
  pills = [],
  delaySec = 0,
  staggerSec = 0.12,
  spring: springName = 'snappy',
  placement = 'bottom',
  style: outerStyle,
  maxWidth = 900,
  background = DEFAULT_NAVY,
  accent = DEFAULT_GOLD,
  easing = 'easeOutQuart',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delayFrames = delaySec * fps;
  const localFrame = Math.max(0, frame - delayFrames);

  // Whole-card slide-in
  const cardSpring = spring({
    frame: localFrame,
    fps,
    config: SPRING_PRESETS[springName],
  });
  const cardSlideEased = applyEasing(clamp(localFrame / Math.max(1, 0.5 * fps), 0, 1), easing);
  const cardTy = (1 - cardSlideEased) * 40;
  const cardOp = clamp(cardSpring, 0, 1);

  // Per-child animation: we stagger eyebrow → headline → subhead → details → pills.
  let childIndex = 0;
  const animateChild = (): { opacity: number; transform: string } => {
    const childDelayFrames = (childIndex + 1) * staggerSec * fps;
    childIndex += 1;
    const cf = Math.max(0, localFrame - childDelayFrames);
    const t = clamp(cf / Math.max(1, 0.4 * fps), 0, 1);
    const eased = applyEasing(t, 'easeOutCubic');
    return {
      opacity: eased,
      transform: `translateY(${((1 - eased) * 14).toFixed(2)}px)`,
    };
  };

  const placementStyle: React.CSSProperties =
    placement === 'top'
      ? { top: '8%', left: 0, right: 0, bottom: 'auto' }
      : placement === 'center'
        ? { top: '50%', left: 0, right: 0, transform: `translateY(calc(-50% + ${cardTy.toFixed(2)}px))` }
        : placement === 'bottom'
          ? { bottom: '6%', left: 0, right: 0, top: 'auto' }
          : {};

  const combinedTransform =
    placement === 'center' ? placementStyle.transform : `translateY(${cardTy.toFixed(2)}px)`;

  return (
    <div
      style={{
        position: 'absolute',
        display: 'flex',
        justifyContent: 'center',
        opacity: cardOp,
        ...placementStyle,
        transform: combinedTransform,
        ...outerStyle,
      }}
    >
      <div
        style={{
          maxWidth,
          width: '90%',
          padding: '36px 44px',
          background,
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderTop: `2px solid ${accent}`,
          borderRadius: 22,
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
          color: DEFAULT_OFF_WHITE,
          fontFamily: 'AzoSans, system-ui, sans-serif',
        }}
      >
        {eyebrow ? (
          <div
            style={{
              ...animateChild(),
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: accent,
              marginBottom: 14,
            }}
          >
            {eyebrow}
          </div>
        ) : null}

        <div
          style={{
            ...animateChild(),
            fontFamily: 'Amboqia, Georgia, serif',
            fontSize: 64,
            lineHeight: 1.05,
            letterSpacing: '-0.01em',
            color: '#fff',
            marginBottom: subhead ? 18 : 0,
          }}
        >
          {headline}
        </div>

        {subhead ? (
          <div
            style={{
              ...animateChild(),
              fontSize: 28,
              lineHeight: 1.35,
              color: 'rgba(255,255,255,0.86)',
              marginBottom: details.length || pills.length ? 26 : 0,
            }}
          >
            {subhead}
          </div>
        ) : null}

        {details.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              columnGap: 24,
              rowGap: 10,
              marginBottom: pills.length ? 24 : 0,
            }}
          >
            {details.map((d, i) => {
              const anim = animateChild();
              return (
                <React.Fragment key={`detail-${i}`}>
                  <div
                    style={{
                      ...anim,
                      fontSize: 20,
                      fontWeight: 700,
                      letterSpacing: 3,
                      textTransform: 'uppercase',
                      color: accent,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {d.label}
                  </div>
                  <div
                    style={{
                      ...anim,
                      fontSize: 26,
                      color: '#fff',
                    }}
                  >
                    {d.value}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        ) : null}

        {pills.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {pills.map((p, i) => {
              const anim = animateChild();
              return (
                <span
                  key={`pill-${i}`}
                  style={{
                    ...anim,
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '10px 22px',
                    borderRadius: 999,
                    background: p.background ?? `${accent}1F`,
                    border: `1.5px solid ${p.color ?? accent}`,
                    color: p.color ?? accent,
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: 1,
                  }}
                >
                  {p.text}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
};
