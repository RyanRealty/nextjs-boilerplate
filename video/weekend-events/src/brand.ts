// Ryan Realty brand tokens — weekend-events project.
// Copied from video/market-report/src/brand.ts and extended with
// multi-aspect safe-zone constants needed by this project.
// Do not import from the market-report project — keep this self-contained.

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export const NAVY        = '#102742'
export const NAVY_DEEP   = '#0A1A2E'
export const NAVY_RICH   = '#173356'
export const CREAM       = '#faf8f4'
export const CHARCOAL    = '#1A1A1A'

export const GOLD        = '#D4AF37'
export const GOLD_SOFT   = '#C8A864'

export const WHITE       = '#FFFFFF'
export const WHITE_SOFT  = 'rgba(255,255,255,0.92)'
export const WHITE_DIM   = 'rgba(255,255,255,0.72)'

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

// Display serif — hero headlines, title cards.
export const FONT_HEAD   = "'Amboqia', 'Playfair Display', Didot, Georgia, serif"
// Body / data / captions / UI.
export const FONT_BODY   = "'AzoSans', 'Geist', 'Inter', system-ui, sans-serif"
// Caption band specifically.
export const FONT_CAPTION = "'AzoSans', 'Geist', 'Inter', system-ui, sans-serif"

// ---------------------------------------------------------------------------
// Playback
// ---------------------------------------------------------------------------

export const FPS = 30

// ---------------------------------------------------------------------------
// Aspect-ratio geometry
// ---------------------------------------------------------------------------

export type Aspect = '16x9' | '9x16' | '1x1' | '2x3' | '4x5'

export type CompositionDims = {
  width: number
  height: number
  // Caption safe zone — dedicated y-band nothing else can enter.
  captionYTop: number
  captionYBottom: number
  // Content safe zone (horizontal margins).
  safeXMin: number
  safeXMax: number
  // Event title font size (scales with height).
  titleFontSize: number
  // Date pill font size.
  pillFontSize: number
  // Photo attribution pill font size.
  creditFontSize: number
}

export const DIMS: Record<Aspect, CompositionDims> = {
  '9x16': {
    width: 1080, height: 1920,
    captionYTop: 1480, captionYBottom: 1720,
    safeXMin: 90, safeXMax: 990,
    titleFontSize: 96,
    pillFontSize: 40,
    creditFontSize: 24,
  },
  '16x9': {
    width: 1920, height: 1080,
    captionYTop: 740, captionYBottom: 980,
    safeXMin: 96, safeXMax: 1824,
    titleFontSize: 80,
    pillFontSize: 34,
    creditFontSize: 20,
  },
  '1x1': {
    width: 1080, height: 1080,
    captionYTop: 740, captionYBottom: 1020,
    safeXMin: 90, safeXMax: 990,
    titleFontSize: 80,
    pillFontSize: 36,
    creditFontSize: 22,
  },
  '2x3': {
    width: 1080, height: 1620,
    captionYTop: 1380, captionYBottom: 1560,
    safeXMin: 90, safeXMax: 990,
    titleFontSize: 88,
    pillFontSize: 38,
    creditFontSize: 22,
  },
  '4x5': {
    width: 1080, height: 1350,
    captionYTop: 1100, captionYBottom: 1280,
    safeXMin: 90, safeXMax: 990,
    titleFontSize: 84,
    pillFontSize: 36,
    creditFontSize: 22,
  },
}
