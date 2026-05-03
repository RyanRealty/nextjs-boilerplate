// Evergreen brand tokens — mirrors video/market-report/src/brand.ts.
// Source of truth for shared brand values: skills/youtube-market-reports/brand-system.md.
//
// Differences from market-report:
//   - Per-pillar segment colors for the StackedEquityChart (Beat 5)
//   - Beat-duration constants tuned for the 4-pillars script

// ---------------------------------------------------------------------------
// Colors (matches video/market-report)
// ---------------------------------------------------------------------------

export const NAVY = '#102742'
export const NAVY_DEEP = '#0A1A2E'
export const NAVY_RICH = '#173356'
export const CREAM = '#faf8f4'
export const CHARCOAL = '#1A1A1A'

export const GOLD = '#D4AF37'
export const GOLD_SOFT = '#C8A864'

export const WHITE = '#FFFFFF'
export const WHITE_SOFT = 'rgba(255,255,255,0.92)'
export const WHITE_DIM = 'rgba(255,255,255,0.72)'

// ---------------------------------------------------------------------------
// Per-pillar segment colors for the stacked-equity chart (Beat 5).
// Order: cash flow (cream) → loan paydown (gold-soft) → tax savings (gold) → appreciation (navy-rich)
// "Least sexy at bottom, biggest contributor at top."
// ---------------------------------------------------------------------------

export const PILLAR_COLORS = {
  cashFlow: CREAM,
  loanPaydown: GOLD_SOFT,
  taxSavings: GOLD,
  appreciation: NAVY_RICH,
} as const

export const PILLAR_LABELS = {
  cashFlow: 'Cash flow',
  loanPaydown: 'Loan paydown',
  taxSavings: 'Tax savings',
  appreciation: 'Appreciation',
} as const

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const FONT_HEAD = "'Amboqia', 'Playfair Display', Didot, Georgia, serif"
export const FONT_BODY = "'Geist', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif"

// ---------------------------------------------------------------------------
// Composition geometry
// ---------------------------------------------------------------------------

export const FPS = 30
export const PORTRAIT_WIDTH = 1080
export const PORTRAIT_HEIGHT = 1920

// Caption safe zone (CLAUDE.md §0.5 — y 1480-1720, no other component renders here)
export const CAPTION_Y_TOP = 1480
export const CAPTION_Y_BOTTOM = 1720
export const SAFE_X_MIN = 90
export const SAFE_X_MAX = 990

// Hero/illustration zone (above captions)
export const HERO_Y_TOP = 320
export const HERO_Y_BOTTOM = 1380

// ---------------------------------------------------------------------------
// Default beat durations for 4-pillars script (seconds)
// Sums to 60s (the format ceiling)
// ---------------------------------------------------------------------------

export const DEFAULT_BEAT_SECS = {
  intro: 4,
  cashFlow: 10,
  appreciation: 11,
  loanPaydown: 11,
  taxBenefits: 13,
  stackedSummary: 8,
  outro: 3,
} as const
