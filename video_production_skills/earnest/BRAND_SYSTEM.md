# Brand System — Earnest.

The complete visual, typographic, and motion system for Earnest. Locked 2026-05-07. The discipline is restraint: four colors, two typefaces, one mark, one wordmark. Everything else flows from these decisions.

This system is fully separate from Ryan Realty corporate identity. Earnest. is its own world. The Ryan Realty connection lives off-frame on the microsite About page for the people who go looking. A24 model.

## The Wordmark

**"Earnest."** — Inter Display Black, 200pt at 1080×1920 frame, tight tracking (-12px), period in Ember, everything else in Bone, on Ink ground. The period IS the brand mnemonic. It is the declarative full stop that says: this is a finished sentence, this is a statement, this is the truth.

Canonical asset: [brand/wordmark.svg](video_production_skills/earnest/brand/wordmark.svg)
Square crop (avatars, podcast covers): [brand/wordmark-square.svg](video_production_skills/earnest/brand/wordmark-square.svg)
Landscape crop (YouTube, microsite hero): [brand/wordmark-landscape.svg](video_production_skills/earnest/brand/wordmark-landscape.svg)

## The Mark

A single horizontal line, 4px stroke, square caps, Bone on Ink. 280px wide (~26% of a 1080-wide frame). Sits 60px above the wordmark in the canonical lockup.

It reads as: a horizon, a doorway threshold, a property line, the moment before a character crosses into the next chapter of their life. It is the whole show in one mark.

It can stand alone as: avatar (with the horizon centered in a square), section divider on the microsite, end-of-essay typographic ornament, podcast cover detail, social-card watermark.

Canonical asset: [brand/mark.svg](video_production_skills/earnest/brand/mark.svg)

## The Palette

Four colors. No additions. No gold. No navy-corporate. No cream.

| Token | Hex | Use |
|---|---|---|
| Ink | `#0B0F14` | Background. The void. Every frame opens and closes on Ink. |
| Bone | `#E8E2D6` | Foreground. The wordmark, captions, all primary text. Warm off-white, never pure white. |
| Bruise | `#3D2E3F` | Secondary surface. Pull-quote backgrounds, second-tier elements, microsite section blocks. |
| Ember | `#B25535` | Accent. The period in the wordmark. Active-word highlight in captions. Used sparingly — earned, never decorative. |

CSS tokens: [brand/palette.css](video_production_skills/earnest/brand/palette.css)

The palette is melancholic, literary, anti-corporate. Reads cleanly against any photographic backplate. Verified against Severance (cold blue + industrial gold), The Leftovers (washed beige + bruised purple), the 2026 "Obsidian" prestige aesthetic. Specifically rejects the warm humanist real-estate-marketing palette.

## Typography

| Use | Typeface | Weight / Size | Tracking |
|---|---|---|---|
| Wordmark | Inter Display | Black / 200pt | -12px |
| Pull-quote (episode titles) | Editorial New | Italic / 72pt | 0 |
| Episode tag (E01, E02) | Inter Display | Medium / 32pt | +1px |
| Captions (spoken lines) | Inter | Regular / 56pt | 0 |
| Body (microsite long-form) | Inter | Regular / 40pt | 0 |

Inter Display: free, https://rsms.me/inter/. Variable font. Install in `public/fonts/` for Remotion + microsite.
Inter (text companion): same family, https://rsms.me/inter/.
Editorial New: Pangram Pangram, free for trial use, paid for production (https://pangrampangram.com/products/editorial-new). Approve before commit.

Optional upgrade if budget appears later: Söhne (Klim, ~$90/yr personal) replaces Inter Display for the wordmark; Tiempos Headline (Klim) replaces Editorial New for pull-quotes. Same lineage, more refined ink-traps. Both are drop-in replacements with no other system changes.

## The Cold Open (every episode opens identically)

```
0:00.0 - 0:00.3   Black hold. Silence.
0:00.3 - 0:00.8   Horizon mark draws left and right from center, simultaneously, ease-out. 0.5s.
0:00.8 - 0:01.3   "Earnest." wordmark fades in beneath. 0.5s ease-out.
0:01.3 - 0:01.7   Hold. Single piano note (C# minor, sustained, soft attack) lands as wordmark settles. 0.4s.
0:01.7 - 0:02.0   Hard cut to first content beat. 0.3s.
```

Total cold open: 2.0 seconds.

The single piano note is the sonic mnemonic. Same note every episode, every season, forever. C# minor on a felted upright. Recorded once, used always.

## The End Card (every episode closes identically)

```
T-4.0s  Hard cut from final content beat to Ink.
T-3.5s  "Earnest." wordmark fades in (with horizon mark already in place above it). 0.5s ease-in.
T-3.0s  Hold. Single sustained string drone (low D, warm) underneath. 2.5s.
T-0.5s  Cross-fade to black. 0.5s.
```

Total end card: 4.0 seconds.

The string drone is the closing breath. Same note every episode. Recorded once, used always.

NO Ryan Realty mark in the frame. NO "A Ryan Realty Production" tag. NO logo. NO URL. The brand association lives off-frame, on the microsite, for people who care enough to look.

## Episode Title Card (50% mark of every episode)

The breath between halves. Pull-quote → wordmark mark → resume.

```
0:00.0 - 0:00.3   Cross-dissolve from previous beat to Ink. 0.3s.
0:00.3 - 0:00.7   Pull-quote fades in. Editorial New Italic, 72pt, Bone on Ink, centered.
                  Max 12 words, single sentence. 0.4s ease-in.
0:00.7 - 0:02.2   Hold pull-quote. 1.5s.
0:02.2 - 0:02.6   Pull-quote dissolves out. Episode tag (e.g., "E01") fades in
                  in Inter Display Medium, 32pt, Bone-soft, top-right corner. 0.4s.
0:02.6 - 0:03.0   Hold tag. 0.4s.
0:03.0 - 0:03.3   Cross-dissolve to next content beat. 0.3s.
```

Total title card: 3.3 seconds.

Pull-quotes per episode are pre-written in `SEASON_1_TREATMENTS.md`. Examples:
- Episode 1, "The Empty Room": *"She told her kids to live their own lives."*
- Episode 2, "The Garage": *"The fight is not about the woodshop."*
- Episode 3, "The Counter": *"He is not arguing about fifteen thousand dollars."*

## Captions

Per CLAUDE.md §0.5 hard rules, with Earnest. styling:

- Safe zone: y 1480-1720, x 90-990. Reserved. No other element enters.
- Pill: Ink at 70% opacity (`var(--earnest-caption-pill)`), 24px corner radius, 16px padding.
- Text: Inter Regular 56px, Bone (`#E8E2D6`).
- Active word highlight: Ember (`#B25535`) + scale 1.0→1.08 spring, synced to ElevenLabs forced-alignment timestamps.
- Sentence transitions: 250ms cross-fade, never hard cut.
- Format: full sentence on screen with active-word highlight (NOT word-by-word reveal).

## Motion Language

The system has three motion primitives, used in this order across the cold-open and end-card sequence:

- **Draw** (the horizon mark). Two stroke-paths animate from center outward, simultaneously, ease-out. 0.5s. Used only for the horizon mark.
- **Fade** (everything else). All text fades in/out via opacity. Never slides. Never scales (except active-word caption highlight). Never rotates.
- **Cross-dissolve** (between content beats and title card). 250-300ms. Never hard cuts within an episode body except at the cold-open hand-off and the end-card hand-off (both intentional).

No bouncing. No springs (except the caption active-word highlight). No camera sweeps over titles. The motion is restrained. The drama is in the silence.

## Audio Brand

- **Cold-open piano note.** C# minor, felted upright, single note, soft attack, 1.5s decay. Recorded once via Suno or live capture, used in every episode.
- **End-card string drone.** Low D, warm sustained, 2.5s, fades to silence. Same source forever.
- **Episode score.** Sparse atmospheric. Reference: Max Richter (*Cantos*), Olafur Arnalds, Nils Frahm. NEVER a Lego Movie pop drop. The score is a bed under The Voice, dropped 12dB whenever she speaks. Some episodes carry no score at all (Episode 1 "The Empty Room" runs on ambient SFX and footsteps).

## Don't

- Don't add a fifth color.
- Don't pair Inter Display with Helvetica or Gotham. Use only Inter Display + Editorial New.
- Don't put a Ryan Realty logo in any frame.
- Don't put a phone number, URL, agent name, or brokerage mention in any frame.
- Don't slide the wordmark in. Fade only.
- Don't skip the cold-open piano note. Even on silent episodes, the cold open carries it.
- Don't add a sub-line beneath the wordmark ("a series about real estate," "from Ryan Realty," etc.). The wordmark stands alone.
- Don't use AzoSans, Amboqia, navy `#102742`, gold `#D4AF37`, or cream `#F2EBDD` anywhere in Earnest. Those are Ryan Realty corporate. Earnest. is a different world.

## Production Touchpoints

- **Remotion components** (when scaffolded): `<EarnestColdOpen />`, `<EarnestEndCard />`, `<EarnestTitleCard pullQuote="…" episodeTag="E01" />`, `<EarnestCaptionBand alignmentJson={…} />`. All render from this brand system.
- **Microsite** (earnest.show): inherits palette via `palette.css`, uses Inter Display + Editorial New as web fonts, episode pages use the wordmark-landscape.svg as hero, mark.svg as section dividers.
- **Social avatars**: wordmark-square.svg.
- **Podcast cover** (if Discord paid tier ever ships an audio companion): wordmark-square.svg with optional Bruise frame.
- **Festival submission masters**: 1920×1080 landscape with wordmark-landscape.svg as cold open, full episode in 1080×1920 letterboxed inside the landscape frame.

## Living Document

This brand system is locked 2026-05-07. Changes require an explicit brand-system review. Not every Friday. Not every season finale. Locked means locked.
