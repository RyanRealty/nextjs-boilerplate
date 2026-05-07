/**
 * Brand tokens for the YouTube long-form (1920x1080) market report.
 * Re-exports all tokens from the short-form canonical brand.ts and overrides
 * the safe-zone / caption geometry for landscape.
 *
 * Canonical source: video/market-report/src/brand.ts
 * Long-form overrides: caption zone, hero scale, chart widths — per SKILL.md §4.
 */

export {
  NAVY,
  NAVY_DEEP,
  NAVY_RICH,
  CREAM,
  CHARCOAL,
  FIR,
  SKY,
  GOLD,
  GOLD_SOFT,
  WHITE,
  WHITE_SOFT,
  WHITE_DIM,
  CHART_RAMP,
  SHADOW_NAVY,
  OVERLAY_NAVY,
  FONT_HEAD,
  FONT_BODY,
  FONT_MONO,
  FONT_RIBBON,
  FPS,
  LANDSCAPE_WIDTH,
  LANDSCAPE_HEIGHT,
} from '../../market-report/src/brand'

// Landscape composition dimensions.
export const WIDTH = 1920
export const HEIGHT = 1080

// Safe zone for landscape (per VIRAL_GUARDRAILS + SKILL.md §4):
// 90px margin all sides → inner 1740x900 content area.
export const SAFE_X_MIN = 90
export const SAFE_X_MAX = 1830
export const SAFE_Y_MIN = 90
export const SAFE_Y_MAX = 990

// Caption safe zone — bottom band (y 920-1040) per skill spec §4.
// Nothing else renders inside this zone per CLAUDE.md §0.5 rule.
export const CAPTION_Y_TOP = 920
export const CAPTION_Y_BOTTOM = 1040

// Hero stat zone for landscape (above captions).
export const HERO_Y_TOP = 80
export const HERO_Y_BOTTOM = 880

// Chart dimensions for landscape (wider than portrait).
export const CHART_W = 1620
export const CHART_H = 720

// Hero number scale: 320px per skill spec §4 (vs 220px in portrait).
export const HERO_FONT_SIZE = 320

// Chapter transition gold underline.
export const CHAPTER_LINE_W = 480

// Per-beat duration constants (seconds) for long-form.
export const INTRO_SEC = 45     // Chapter 1 cold open
export const CHAPTER_SEC = 75  // Default chapter duration
export const OUTRO_SEC = 45    // Chapter 10 CTA
