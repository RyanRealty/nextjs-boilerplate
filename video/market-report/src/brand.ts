// Ryan Realty brand tokens. Canonical source: skills/youtube-market-reports/brand-system.md.
// Do not change without updating that spec.
//
// 2026-05-01 refactor:
//   - CREAM updated to #faf8f4 (canonical) — was deprecated #F2EBDD.
//   - FONT_BODY changed from AzoSans to Geist (Geist is the body/data/caption font;
//     AzoSans is rare, only for arched ribbon sub-labels under the wordmark).
//   - Added FIR (Central Oregon forest), SKY (Deschutes water), CHART_RAMP
//     (five-step blue ramp for multi-series charts), SHADOW_NAVY (navy-tinted
//     elevation shadow), and OVERLAY_NAVY (navy hero protection overlay).
//   - Added composition geometry for landscape (1920x1080 YouTube long-form)
//     alongside the existing portrait (1080x1920 Reels/Shorts) constants.

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export const NAVY = '#102742'                  // Brand primary navy.
export const NAVY_DEEP = '#0A1A2E'             // Deeper navy for radial backgrounds.
export const NAVY_RICH = '#173356'             // Lifted navy for highlights.
export const CREAM = '#faf8f4'                 // Canonical cream (heritage). NOT #F2EBDD.
export const CHARCOAL = '#1A1A1A'              // Body text on light backgrounds.

export const FIR = '#2e4a3a'                   // Central Oregon forest accent.
export const SKY = '#8fb8d4'                   // Deschutes water accent / data ramp top.

export const GOLD = '#D4AF37'                  // News-clip / market-report accent.
export const GOLD_SOFT = '#C8A864'             // Listing-reel accent (slightly softer).

export const WHITE = '#FFFFFF'
export const WHITE_SOFT = 'rgba(255,255,255,0.92)'
export const WHITE_DIM = 'rgba(255,255,255,0.72)'

// Five-step blue ramp for multi-series area / bar charts (pale -> navy).
export const CHART_RAMP: readonly string[] = [
  '#dbe7f2',
  '#a7c1dc',
  '#6f97c0',
  '#3b6ea3',
  NAVY,
] as const

// Navy-tinted shadow per brand-system.md §9. Never generic grey.
export const SHADOW_NAVY = 'rgb(16 39 66 / 0.08)'
// Navy protection overlay on hero imagery — the only permitted gradient.
export const OVERLAY_NAVY = 'rgba(16,39,66,0.75)'

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

// Display serif. Hero H1, title cards, end-card headlines, pull quotes.
// Fallback chain: Playfair Display -> Didot -> Georgia (Section 3.1).
export const FONT_HEAD = "'Amboqia', 'Playfair Display', Didot, Georgia, serif"

// Body / data / captions / UI. Tabular nums mandatory on numeric surfaces.
// Fallback chain: Inter -> system-ui -> sans-serif (Section 3.3).
export const FONT_BODY = "'Geist', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif"

// Geist Mono for code or technical readouts (rare — kept for completeness).
export const FONT_MONO = "'Geist Mono', 'JetBrains Mono', 'Menlo', monospace"

// Arched / ribbon sub-labels under the wordmark only. Uppercase. Rare usage.
export const FONT_RIBBON = "'AzoSans', 'Geist', sans-serif"

// ---------------------------------------------------------------------------
// Composition geometry
// ---------------------------------------------------------------------------

export const FPS = 30

// Portrait — Reels / YouTube Shorts.
export const PORTRAIT_WIDTH = 1080
export const PORTRAIT_HEIGHT = 1920

// Landscape — YouTube long-form market report.
export const LANDSCAPE_WIDTH = 1920
export const LANDSCAPE_HEIGHT = 1080

// Legacy aliases — many existing portrait components import WIDTH/HEIGHT.
export const WIDTH = PORTRAIT_WIDTH
export const HEIGHT = PORTRAIT_HEIGHT

// Safe zone (portrait): 900x1400 centered (per VIRAL_GUARDRAILS).
export const SAFE_X_MIN = 90
export const SAFE_X_MAX = 990
export const SAFE_Y_MIN = 260

// Captions zone — bottom band, no graphics overlap above.
export const CAPTION_Y_TOP = 1480
export const CAPTION_Y_BOTTOM = 1720

// Hero stat zone (above captions, with margin).
export const HERO_Y_TOP = 360
export const HERO_Y_BOTTOM = 1380

// Per-beat duration in seconds (legacy portrait short-form).
export const INTRO_SEC = 3
export const STAT_SEC = 4
export const OUTRO_SEC = 4
