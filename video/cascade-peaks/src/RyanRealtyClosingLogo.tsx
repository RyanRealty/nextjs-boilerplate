// Inline vector mark for closing card — Remotion headless often fails on
// `<Img src={staticFile('*.svg')}>` (fetch to static server); SVG as React DOM
// renders reliably in Chromium offscreen.

import React from 'react';

type Props = {
  /** CSS width, e.g. 'min(92%, 480px)' */
  width?: string;
  maxHeight?: number;
};

export const RyanRealtyClosingLogo: React.FC<Props> = ({
  width = 'min(92%, 480px)',
  maxHeight = 130,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 520 140"
    role="img"
    aria-label="Ryan Realty"
    style={{
      width,
      height: 'auto',
      maxHeight,
      display: 'block',
      filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.55))',
    }}
  >
    <rect width="520" height="140" fill="none" />
    <text
      x="260"
      y="78"
      textAnchor="middle"
      fontFamily="Georgia, 'Times New Roman', serif"
      fontSize={52}
      fontWeight={600}
      fill="#ffffff"
      letterSpacing={1}
    >
      Ryan Realty
    </text>
    <line
      x1="80"
      y1="98"
      x2="440"
      y2="98"
      stroke="#D4AF37"
      strokeWidth={4}
      strokeLinecap="round"
    />
    <text
      x="260"
      y="128"
      textAnchor="middle"
      fontFamily="system-ui, -apple-system, sans-serif"
      fontSize={18}
      fontWeight={600}
      fill="#e8c964"
      letterSpacing={4}
    >
      BEND · OREGON
    </text>
  </svg>
);
