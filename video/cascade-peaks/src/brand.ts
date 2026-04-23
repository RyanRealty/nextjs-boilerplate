// Brand tokens for the Cascade Peaks viral video — per CLAUDE.md design
// system. Navy + gold + cream are the Ryan Realty core palette; the extended
// cool/warm ramps below are used inside the 3D tile scenes for atmospheric
// fog, HUD chrome, and peak label callouts.

export const NAVY = '#102742';
export const NAVY_DEEP = '#0a1a2e';
export const NAVY_SOFT = '#1d3a5c';

export const GOLD = '#D4AF37';
export const GOLD_SOFT = '#e8c964';
export const GOLD_DEEP = '#a88526';

export const CREAM = '#F5EFE2';
export const WHITE = '#FFFFFF';
export const WHITE_SOFT = 'rgba(255,255,255,0.92)';
export const WHITE_GLASS = 'rgba(255,255,255,0.12)';

// HUD + callout text shadow for legibility over bright snow / dark sky.
export const TEXT_SHADOW =
  '0 0 12px rgba(10,23,40,0.95), 0 0 24px rgba(10,23,40,0.75), 0 2px 4px rgba(0,0,0,0.9)';

// IG + TikTok safe zones (1080×1920): keep copy out from under native UI
// (handles, captions, side rails). Vertical band is the “readable” window.
export const SAFE_TOP = 420;
/** Lowest Y (from top) where anchored text/layout should comfortably end. */
export const SAFE_BOTTOM = 1180;
export const SAFE_LEFT = 72;
export const SAFE_RIGHT = 1008;
/** Reserve this many px from the physical bottom for TikTok/IG caption + controls. */
export const SAFE_BOTTOM_INSET = 300;

// Fonts — match Cowork / jackstraw pattern (local files in `public/`).
export const FONT_SERIF = 'Amboqia Boriango';
export const FONT_BODY = 'Azo Sans';

// Ryan Realty contact line (appears on the closing card only — NOT on
// interior scenes per the "no branding in viral video" rule, though the
// closing card is where it's expected and accepted).
export const IG_HANDLE = '@MattRyanRealty';
export const DOMAIN = 'ryan-realty.com';
export const PHONE = '541.213.6706';
