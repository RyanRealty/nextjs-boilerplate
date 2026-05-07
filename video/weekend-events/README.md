# This Weekend in Bend — Video Project

Self-contained Remotion project. Five aspect ratios from one BEATS array.

## Quick start (on Mac)

```bash
cd video/weekend-events
npm install
```

Then, for each weekend episode, create the data files in `out/<slug>/` (see below), then run:

```bash
SLUG=weekend-events-2026-05 node scripts/fetch-images.mjs
SLUG=weekend-events-2026-05 node --env-file=/Users/matthewryan/RyanRealty/.env.local scripts/synth-vo.mjs
SLUG=weekend-events-2026-05 node --env-file=/Users/matthewryan/RyanRealty/.env.local scripts/render-all.mjs
SLUG=weekend-events-2026-05 node scripts/qa-and-scorecard.mjs
```

Then present the renders to Matt. Only after explicit approval:

```bash
SLUG=weekend-events-2026-05 node --env-file=/Users/matthewryan/RyanRealty/.env.local scripts/publish.mjs
```

## Data files (provided separately, NOT in this repo)

All data files live in `out/weekend-events-2026-05/` (gitignored). They are written manually or by the data-build step:

### `out/<slug>/events.json`

Array of `EventData` objects (see `src/VideoProps.ts`):

```json
[
  {
    "slug": "homegrown-music-fest",
    "title": "Homegrown Music Festival",
    "date_time": "Friday–Saturday · 5 PM",
    "venue": "Hayden Homes Amphitheater",
    "description": "Local and regional artists. Two-day outdoor festival.",
    "photo_credit": "Photo: (filled by fetch-images.mjs)",
    "unsplash_query": "outdoor music festival crowd"
  },
  ...
]
```

### `out/<slug>/script.json`

```json
{
  "fullText": "Five things you don't want to miss this weekend in Bend. ...",
  "beatSentences": [
    { "id": "beat1", "sentence": "Homegrown Music Festival kicks off Friday night..." },
    { "id": "beat2", "sentence": "Portland Cello Project hits the Tower Theatre Friday..." },
    ...
  ]
}
```

`beatSentences` has exactly 5 entries (one per event beat). Beats 0 (intro) and 6 (outro) are silent and NOT included here.

### `out/<slug>/props.json`

Remotion composition props. Seeded by you before `synth-vo.mjs` runs, then updated by `synth-vo.mjs` with `captionWords` and `beatDurations`. Minimum seed:

```json
{
  "aspect": "9x16",
  "dateline": "MAY 8-10, 2026",
  "outroCta": "MORE AT VISITBEND.COM/EVENTS",
  "voPath": "",
  "captionWords": [],
  "beatDurations": [3.0, 5.0, 5.0, 5.0, 5.0, 5.0, 2.5],
  "events": [ ...same as events.json... ]
}
```

### `out/<slug>/citations.json`

Write this manually. One line per figure claimed in the video (event details sourced from visitbend.com or the venue's official page). No verified stat = no stat in the video.

## Remotion Studio

```bash
npm run studio
```

Opens all 5 compositions (`WeekendEvents_16x9`, `WeekendEvents_9x16`, `WeekendEvents_1x1`, `WeekendEvents_2x3`, `WeekendEvents_4x5`) using the placeholder fixture data.

## Composition IDs → aspect → platform

| Composition ID        | Dims        | Primary platforms                      |
|-----------------------|-------------|----------------------------------------|
| WeekendEvents_9x16    | 1080×1920   | IG Reels, FB Reels, TikTok, YouTube Shorts, Threads |
| WeekendEvents_16x9    | 1920×1080   | YouTube, X                             |
| WeekendEvents_1x1     | 1080×1080   | FB Feed, LinkedIn                      |
| WeekendEvents_4x5     | 1080×1350   | IG Feed                                |
| WeekendEvents_2x3     | 1080×1620   | Pinterest                              |

## Fonts

`public/fonts/Amboqia.otf` and `public/fonts/AzoSans-Medium.ttf` are gitignored (commercial license). Copy them from `video/market-report/public/` or your local font store.

## What gets committed

Source files only (`.tsx`, `.ts`, `.mjs`, `package.json`, `tsconfig.json`, `remotion.config.ts`). No MP4s, no VO, no images, no `out/`, no `public/images/`, no `public/fonts/`.
