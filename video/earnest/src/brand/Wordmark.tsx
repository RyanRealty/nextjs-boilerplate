import React from 'react'
import { COLORS, FONTS } from './colors'

/**
 * The Earnest. wordmark, static.
 *
 * The horizon line floats above the wordmark.
 * The period is the only colored element (Ember).
 * Includes the Ink background so the component is self-contained for
 * Still rendering and standalone composition.
 *
 * Used as a building block for ColdOpen, EndCard, and any static
 * brand surface. ColdOpen / EndCard wrap with AbsoluteFill of Ink for
 * full-frame coverage; the SVG's own Ink rect ensures the wordmark
 * surface is always Ink even when used standalone.
 *
 * Props let the parent control opacity and the horizon-mark draw
 * progress (0 = invisible, 1 = fully drawn).
 */
export const Wordmark: React.FC<{
  /** 0..1, where 0 = no horizon visible, 1 = full horizon drawn. Default 1. */
  horizonProgress?: number
  /** 0..1, opacity of the wordmark text only. Default 1. */
  wordmarkOpacity?: number
  /** 0..1, opacity of the entire mark group. Default 1. */
  groupOpacity?: number
  /** If true, renders without the Ink background rect (for use inside an
   *  already-Ink AbsoluteFill where the rect would be redundant). Default false. */
  transparent?: boolean
}> = ({
  horizonProgress = 1,
  wordmarkOpacity = 1,
  groupOpacity = 1,
  transparent = false,
}) => {
  // Horizon line geometry (matches brand/wordmark.svg).
  const horizonY = 900
  const horizonCenterX = 540
  const horizonHalfWidth = 140 // 280px total

  const drawHalf = horizonHalfWidth * Math.max(0, Math.min(1, horizonProgress))
  const horizonX1 = horizonCenterX - drawHalf
  const horizonX2 = horizonCenterX + drawHalf

  return (
    <svg
      viewBox="0 0 1080 1920"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ opacity: groupOpacity, display: 'block' }}
    >
      {/* Ink background (suppressed when embedded inside another Ink fill). */}
      {!transparent && (
        <rect width="1080" height="1920" fill={COLORS.ink} />
      )}

      {/* Horizon mark. Draws from center outward. */}
      <line
        x1={horizonX1}
        y1={horizonY}
        x2={horizonX2}
        y2={horizonY}
        stroke={COLORS.bone}
        strokeWidth={4}
        strokeLinecap="square"
      />

      {/* Wordmark "Earnest." */}
      <text
        x="540"
        y="1100"
        fontFamily={FONTS.display}
        fontWeight={900}
        fontSize={200}
        letterSpacing={-12}
        textAnchor="middle"
        fill={COLORS.bone}
        opacity={wordmarkOpacity}
      >
        Earnest
        <tspan fill={COLORS.ember}>.</tspan>
      </text>
    </svg>
  )
}
