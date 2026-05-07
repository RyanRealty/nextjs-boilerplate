# This Weekend in Bend — Video Project

Self-contained Remotion project that renders one weekend's "top 5 events"
reel into **five aspect ratios** (16:9, 9:16, 1:1, 4:5, 2:3) from a single
BEATS array. Covers every platform Ryan Realty publishes to.

Master skill: [`video_production_skills/weekend-events-video/SKILL.md`](../../video_production_skills/weekend-events-video/SKILL.md).

---

## Quick start (on Mac — where ElevenLabs + Unsplash + Remotion Chrome are reachable)

```bash
cd video/weekend-events
npm install

# One-shot render pipeline (defaults to SLUG=weekend-events-2026-05).
SLUG=weekend-events-2026-05 \
  node --env-file=/Users/matthewryan/RyanRealty/.env.local scripts/build-props.mjs && \
SLUG=weekend-events-2026-05 \
  node --env-file=/Users/matthewryan/RyanRealty/.env.local scripts/fetch-images.mjs && \
SLUG=weekend-events-2026-05 \
  node --env-file=/Users/matthewryan/RyanRealty/.env.local scripts/synth-vo.mjs && \
SLUG=weekend-events-2026-05 \
  node --env-file=/Users/matthewryan/RyanRealty/.env.local scripts/render-all.mjs && \
SLUG=weekend-events-2026-05 \
  node scripts/qa-and-scorecard.mjs
```

Then open the renders in Finder for review:

```bash
open out/16x9/weekend_events_weekend-events-2026-05.mp4
open out/9x16/weekend_events_weekend-events-2026-05.mp4
open out/1x1/weekend_events_weekend-events-2026-05.mp4
open out/4x5/weekend_events_weekend-events-2026-05.mp4
open out/2x3/weekend_events_weekend-events-2026-05.mp4
```

After Matt's explicit approval ("ship it" / "approved" / "publish"):

```bash
SLUG=weekend-events-2026-05 \
  node --env-file=/Users/matthewryan/RyanRealty/.env.local scripts/publish.mjs
```

`publish.mjs` uploads each MP4 to Supabase Storage and fans out to the
platforms listed in [`src/Root.tsx`](src/Root.tsx) → [aspect map below](#aspect-platform-map).

---

## Pipeline stages (what each script does)

| Stage | Script | Reads | Writes |
|---|---|---|---|
| 1 | `build-props.mjs` | `data/<SLUG>/events.json`, `images.json`, `script.json` | `out/<SLUG>/props.json` (seed) |
| 2 | `fetch-images.mjs` | `out/<SLUG>/props.json`, `data/<SLUG>/images.json` | `public/images/*.jpg`, updates `props.json#events[*].photo_credit`, `out/<SLUG>/images.fetched.json` |
| 3 | `synth-vo.mjs` | `data/<SLUG>/script.json`, `out/<SLUG>/props.json` | `public/voiceover.mp3`, updates `props.json#captionWords`, `props.json#beatDurations`, `out/<SLUG>/alignment.json` |
| 4 | `render-all.mjs` | `out/<SLUG>/props.json`, `public/voiceover.mp3`, `public/images/*` | `out/<aspect>/weekend_events_<SLUG>.mp4` × 5 |
| 5 | `qa-and-scorecard.mjs` | `out/<aspect>/*.mp4`, `data/<SLUG>/script.json`, `data/<SLUG>/events.json` | `out/<aspect>/scorecard.json` × 5 |
| 6 | `publish.mjs` (post-approval) | all 5 MP4s + `out/<SLUG>/props.json` | Supabase Storage uploads + `/api/social/publish` calls |

---

## Source-of-truth data (committed under `data/<SLUG>/`)

Each weekend episode has a directory under `data/<slug>/` containing:

- `events.json` — top-5 event slate, weekend window, intro card content
- `script.json` — full VO text, beat sentences (5 entries — beats 1-5),
  voice settings, IPA pronunciation overrides
- `images.json` — Unsplash query specs (primary + fallbacks + rejection
  keywords) per event, attribution pill positions per aspect
- `citations.json` — primary-source verification trace per claim
  (CLAUDE.md §0 mandate)

These files DO ship in git. See `data/weekend-events-2026-05/` for the
canonical example built for May 8-10, 2026.

---

## Working directory (gitignored under `out/<SLUG>/`)

- `props.json` — built by `build-props.mjs`, extended by `fetch-images` and
  `synth-vo`. Final render input.
- `images.fetched.json` — full Unsplash attribution manifest
- `alignment.json` — ElevenLabs forced-alignment word-level timings
- per-aspect `out/<aspect>/weekend_events_<SLUG>.mp4` + `scorecard.json`

---

## Remotion Studio (preview during dev)

```bash
npm run studio
```

Opens all 5 compositions using `src/VideoProps.fixture.ts` (placeholder
data, NOT real verified events).

---

## Aspect → platform map

| Composition ID | Dims | Primary platforms |
|---|---|---|
| `WeekendEvents_16x9` | 1920×1080 | YouTube long-form, X horizontal, Google Business Profile |
| `WeekendEvents_9x16` | 1080×1920 | YouTube Shorts, IG Reels, FB Reels, TikTok, IG/FB Stories, Threads |
| `WeekendEvents_1x1`  | 1080×1080 | LinkedIn, IG Feed, FB Feed, Nextdoor, X square |
| `WeekendEvents_4x5`  | 1080×1350 | IG Feed (alt — taller for more reach) |
| `WeekendEvents_2x3`  | 1080×1620 | Pinterest |

---

## Hard rules (locked — see SKILL.md for full spec)

- **Beat 0 intro is silent.** No VO, no captions. Designed to double as the
  YouTube/Pinterest thumbnail. Static-holds for the last 1.5s of the 3.0s beat.
- **Beat 6 outro is silent.** CTA card with `visitbend.com/events`, no
  brokerage branding.
- **VO covers beats 1-5 only.** Voice: Victoria (`qSeXEcewz7tA0Q0qk9fH`).
  `eleven_turbo_v2_5` model, conversational settings (stability 0.40,
  similarity 0.80, style 0.50, speaker_boost on).
- **Captions: full-sentence active-word highlight** (gold + scale spring).
  No word-by-word fades. 200-300ms crossfade between sentences.
- **Caption safe zone is reserved at the composition level** —
  no other component enters it. Aspect-specific Y bands in `SafeZones.tsx`.
- **Image attribution mandatory.** Pill in bottom-left per `images.json`
  spec. Unsplash trigger-download endpoint hit per Unsplash API guidelines.
- **Zero broker branding in frame.** No logo, no phone, no agent name, no URL
  except the visitbend.com line in the outro.
- **Banned words grep on script + on-screen text** before render
  (`qa-and-scorecard.mjs`).

---

## Fonts

`public/fonts/Amboqia.otf` and `public/fonts/AzoSans-Medium.ttf` are
gitignored (commercial license). Copy from `video/market-report/public/fonts/`
or your local font store before first render.

---

## What gets committed

Source files (`.tsx`, `.ts`, `.mjs`, `package.json`, `tsconfig.json`,
`remotion.config.ts`, `README.md`) plus `data/<SLUG>/*.json` source-of-truth
data. No MP4s, no VO MP3s, no Unsplash JPEGs, no `out/`, no
`public/images/`, no `public/fonts/`.
