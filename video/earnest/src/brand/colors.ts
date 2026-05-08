/**
 * Earnest. brand palette.
 * Mirrors video_production_skills/earnest/brand/palette.css.
 * Locked 2026-05-07. Do not modify without brand-system review.
 */

export const COLORS = {
  ink: '#0B0F14',
  bone: '#E8E2D6',
  bruise: '#3D2E3F',
  ember: '#B25535',
} as const

export const ALPHAS = {
  captionPill: 'rgba(11, 15, 20, 0.70)',
  boneSoft: 'rgba(232, 226, 214, 0.60)',
  boneFaint: 'rgba(232, 226, 214, 0.30)',
} as const

export const FONTS = {
  display: "'Inter Display', 'Inter', 'Söhne', 'Helvetica Neue', system-ui, sans-serif",
  pullQuote: "'Editorial New', 'Tiempos Headline', Georgia, serif",
  body: "'Inter', system-ui, sans-serif",
} as const

/** Frame timings @ 30fps. Convert seconds to frames at the call site. */
export const FPS = 30

/** Convert seconds to frames at the project FPS. */
export const sec = (s: number) => Math.round(s * FPS)
