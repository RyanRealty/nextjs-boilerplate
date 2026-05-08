# Earnest. — Remotion Project

The video build pipeline for **Earnest.**, the Ryan Realty serialized anthology AI drama. This Remotion project assembles the Veo 3.1 / Kling 3.0 / Hedra Character-3 hero shots, ElevenLabs / Hume Octave audio, and the Earnest. brand-system overlays into final 1080×1920 vertical episode MP4s.

The skill spec, character bibles, episode treatments, and brand system live in [`/video_production_skills/earnest/`](../../video_production_skills/earnest/). Read that first.

## Layout

```
video/earnest/
├── package.json              Per-project Remotion deps
├── tsconfig.json
├── remotion.config.ts        h264, jpeg-92, concurrency=1, public/ asset dir
├── data/
│   └── cast.json             Voice ID registry (Hume Octave narrator + ElevenLabs cast)
├── public/
│   └── fonts/                Inter Display + Inter (loaded at Remotion mount)
└── src/
    ├── index.ts              registerRoot
    ├── Root.tsx              Composition registry; loads fonts
    ├── brand/                Brand-system primitives (locked)
    │   ├── colors.ts         Ink / Bone / Bruise / Ember tokens, FPS, sec()
    │   ├── Wordmark.tsx      Static wordmark + horizon mark (props for animation)
    │   ├── ColdOpen.tsx      2.0s cold open (every episode opens with this)
    │   ├── EndCard.tsx       4.0s end card (every episode closes with this)
    │   ├── TitleCard.tsx     3.3s pull-quote + episode-tag (50% mark of every episode)
    │   ├── CaptionBand.tsx   Forced-alignment captions w/ active-word highlight
    │   ├── loadFonts.ts      Inter Display + Inter @font-face injection
    │   └── index.ts          Barrel export
    ├── scenes/               (Episode-shared scene helpers — TBD)
    └── episodes/
        └── Episode1.tsx      "The Empty Room" composition (placeholder body)
```

## Running

```bash
cd video/earnest
npm install                     # one-time
npm run studio                  # open Remotion Studio for preview
npm run render:wordmark         # render the static wordmark PNG
npm run render:coldopen         # render 2s cold open MP4
npm run render:endcard          # render 4s end card MP4
npm run render:e01              # render full Episode 1 (placeholder body)
```

Output goes to `video/earnest/out/` (gitignored).

## What's Locked vs. What's Placeholder

**Locked** (do not modify without brand-system review):
- `src/brand/colors.ts` — palette, fonts, FPS.
- `src/brand/Wordmark.tsx` — geometry of the wordmark + horizon mark.
- `src/brand/ColdOpen.tsx` — 2.0s timing per BRAND_SYSTEM.md.
- `src/brand/EndCard.tsx` — 4.0s timing per BRAND_SYSTEM.md.
- `src/brand/TitleCard.tsx` — 3.3s timing per BRAND_SYSTEM.md.
- `src/brand/CaptionBand.tsx` — caption rules per CLAUDE.md §0.5.
- `data/cast.json` — once a Voice ID is locked for a character, it is locked for the run.

**Placeholder** (replace as production lands):
- All 14 character Voice IDs in `cast.json` are `TBD_*`. Cast voices on first appearance, fill in.
- `src/episodes/Episode1.tsx` body shots are an Ink slate awaiting Higgsfield Soul 2.0 + Veo 3.1 renders.
- The caption alignment in `Episode1.tsx` is hand-stubbed; replace with the real ElevenLabs `/v1/forced-alignment` JSON for the Hume Octave Voice rendering of Linda's two narration lines.
- Cold-open piano note (C# minor) and end-card string drone (low D) are NOT YET rendered. Generate via Suno once and reuse forever (per BRAND_SYSTEM.md §"Audio Brand").

## Workflow Order for a New Episode

1. Read the episode treatment in [`SEASON_1_TREATMENTS.md`](../../video_production_skills/earnest/SEASON_1_TREATMENTS.md).
2. Generate / verify all character + location refs in Higgsfield Soul 2.0 per [`PRODUCTION_PIPELINE.md`](../../video_production_skills/earnest/PRODUCTION_PIPELINE.md).
3. Render hero shots in Veo 3.1, save to `public/episodes/eXX/shotN.mp4`.
4. Render audio: The Voice via Hume Octave, character dialogue via ElevenLabs Eleven v3 (using locked Voice IDs from `cast.json`), score via Suno. Save to `public/episodes/eXX/audio/`.
5. Generate forced-alignment JSON (ElevenLabs endpoint or WhisperX) into `public/episodes/eXX/alignment/`.
6. Build the episode composition in `src/episodes/EpisodeN.tsx` — replace placeholder body with `<Sequence>`s referencing the hero shots, drop in the alignment JSON, place audio tracks.
7. Render via `npm run render:eXX` to `out/`.
8. Run QA gate per `EPISODE_ARCHITECTURE.md`.
9. Show Matt the local MP4. Wait for explicit approval.
10. On approval: copy to publish location, commit, push, queue distribution.

Draft-first. Nothing ships unreviewed.
