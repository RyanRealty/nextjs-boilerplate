// ClosingCard — Washington photo + contact info. Per
// feedback_market_report_closing_standard.md and the viral-video "no logo
// animation" rule, this is a simple fade-in closing, navy underlay, white
// logo, IG handle + domain + phone on clean rows. No shimmer, no glow, no
// extra CTA.

import React from 'react';
import { staticFile, useCurrentFrame, Img } from 'remotion';
import {
  DOMAIN,
  FONT_BODY,
  GOLD,
  GOLD_SOFT,
  IG_HANDLE,
  NAVY_DEEP,
  PHONE,
  SAFE_BOTTOM_INSET,
  SAFE_LEFT,
  SAFE_RIGHT,
  WHITE,
} from './brand';
import { CLOSING_CARD_SEC, FPS } from './config';
import { clamp, easeOutCubic } from './easing';

type ClosingCardProps = {
  frameOffset: number;
};

export const ClosingCard: React.FC<ClosingCardProps> = ({ frameOffset }) => {
  const frame = useCurrentFrame();
  const local = frame - frameOffset;

  const totalFrames = CLOSING_CARD_SEC * FPS;
  const tEntry = clamp(local / (0.5 * FPS), 0, 1);
  const alpha = easeOutCubic(tEntry);

  const tLogo = clamp((local - 6) / (0.55 * FPS), 0, 1);
  const tC = clamp((local - 18) / (0.65 * FPS), 0, 1);

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: alpha, overflow: 'hidden' }}>
      <Img
        src={staticFile('washington_closer_graded.jpg')}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      {/* Navy fade — heavy at top & bottom for contact-bar legibility */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, rgba(10,23,40,0.65) 0%, rgba(10,23,40,0.12) 35%, rgba(10,23,40,0.18) 60%, rgba(10,23,40,0.92) 100%)',
        }}
      />
      {/* Logo — vector wordmark (replace `ryan_realty_closing_logo.png` in public if you have a raster lockup). */}
      <div
        style={{
          position: 'absolute',
          left: SAFE_LEFT,
          right: 1080 - SAFE_RIGHT,
          top: 380,
          display: 'flex',
          justifyContent: 'center',
          opacity: tLogo,
          transform: `translateY(${(1 - tLogo) * 16}px)`,
        }}
      >
        <Img
          src={staticFile('ryan_realty_closing_logo.svg')}
          style={{
            width: 'min(92%, 480px)',
            height: 'auto',
            maxHeight: 130,
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.55))',
          }}
        />
      </div>
      {/* Contact block — sits above TikTok / IG bottom UI */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: SAFE_BOTTOM_INSET + 40,
          padding: `28px ${SAFE_LEFT}px 20px`,
          background: NAVY_DEEP,
          borderTop: `3px solid ${GOLD}`,
          opacity: tC,
          transform: `translateY(${(1 - tC) * 18}px)`,
        }}
      >
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <ContactLine label="INSTAGRAM" value={IG_HANDLE} />
          <ContactLine label="WEB" value={DOMAIN} />
          <ContactLine label="CALL" value={PHONE} last />
        </div>
        <div
          style={{
            marginTop: 18,
            fontFamily: FONT_BODY,
            fontSize: 18,
            fontWeight: 500,
            color: GOLD_SOFT,
            letterSpacing: 2,
            textAlign: 'center',
          }}
        >
          RYAN REALTY · BEND, OREGON
        </div>
      </div>
    </div>
  );
};

const ContactLine: React.FC<{ label: string; value: string; last?: boolean }> = ({
  label,
  value,
  last,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 18,
      paddingBottom: last ? 0 : 8,
      marginBottom: last ? 0 : 8,
      borderBottom: last ? 'none' : `1px solid ${GOLD}40`,
    }}
  >
    <div
      style={{
        fontFamily: FONT_BODY,
        fontSize: 16,
        fontWeight: 700,
        letterSpacing: 2.6,
        color: GOLD_SOFT,
        width: 120,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: FONT_BODY,
        fontSize: 34,
        fontWeight: 600,
        color: WHITE,
        letterSpacing: 0.4,
      }}
    >
      {value}
    </div>
  </div>
);
