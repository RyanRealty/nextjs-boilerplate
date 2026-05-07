---
name: area_guides
kind: format
description: >
  30-45s B-roll neighborhood reel with rotating text overlays and no required VO.
  Covers all 19 Bend neighborhoods and surrounding cities. Triggers on: "area guide",
  "neighborhood reel", "B-roll reel for [neighborhood]", "area guide for [city]",
  "neighborhood video no voiceover", "community reel". Routes through content_engine.
  Distinct from neighborhood_tour (which is 60-90s with VO and Earth Studio flythrough).
---

# Area Guides — Neighborhood Reel Format

**When to use.** Producing a neighborhood / area-guide Reel for one of the 19 Bend neighborhoods (Pronghorn, NorthWest Crossing, Awbrey Butte, Old Farm District, Discovery West, etc.) or one of the surrounding cities (Sisters, Redmond, La Pine, Sunriver, Prineville, Tumalo). Format is a 30–45s text-on-B-roll cut with rotating overlay stats — no VO required for the standard batch.

**Read first:** [VIDEO_PRODUCTION_SKILL.md](../VIDEO_PRODUCTION_SKILL.md) §1–§6, then [`scripts.md`](scripts.md) for the 19 pre-written hooks + overlay rotations.

---

## Standard format (every neighborhood)

```
HOOK            (0–3s)   Bold text over best B-roll clip
TITLE CARD      (3–5s)   Neighborhood name + "Bend, Oregon"
LIFESTYLE CLIPS (5–30s)  B-roll with rotating text overlays (3–4s each)
CTA + BRANDING  (30–35s) Ryan Realty logo + ryan-realty.com + 541.213.6706
```

Music: upbeat, warm instrumental from CapCut library (or `audio_sync/` for beat-aligned).
Color grade: warm cinematic LUT, slightly lifted shadows, natural greens enhanced.
Aspect: 9:16 (Reels), 16:9 (YouTube long-form).

## The 19 neighborhood scripts

See [`scripts.md`](scripts.md) for the full per-neighborhood text rotations: Pronghorn, NorthWest Crossing, Awbrey Butte, Old Farm District, Discovery West, plus the rest of the 19 (file is the canonical source — keep updates synchronized).

## B-roll source

**Primary:** Snowdrift Visuals 19-neighborhood library. Drive path: `06_Marketing & Brand > Marketing > Media > Web Site > Area Guides`.
**Fallback:** Unsplash by city — see `../market_report_video/media_asset_catalog.json` for per-city tagged sets.

## Editing notes (locked)

- Color correct all footage with warm cinematic LUT
- Speed-ramp transitions (slow → fast → slow)
- Subtle Ken Burns on photo slides (1.0× → 1.05×, NOT 1.08× — that's market_report's cap)
- Cross-dissolve transitions between clips (clean, not gimmicky)
- Text animation: fade up from bottom, hold 3–4s, fade out
- Background music at 30–40% volume
- **No voiceover** for this batch (music + text only)
- Logo placement: bottom-right corner, small but visible throughout
- CTA text: white on navy overlay or semi-transparent dark background
- Export Reels at 1080×1920 MP4, YouTube at 1920×1080 MP4

## Branding specs

- Logo: Ryan Realty navy circular badge (Canva asset `MAGtznhi3T0`)
- Colors: Navy `#1B2B4B` primary, white secondary
- Fonts in CapCut: clean sans-serif (closest to AzoSans), bold for headlines
- Text style: white text with subtle drop shadow for readability over footage
- Tagline on CTA card: "It's About Relationships"

## Per-neighborhood music vibe (set in CapCut search)

| Neighborhood | Vibe |
|--------------|------|
| Pronghorn | elegant, sophisticated, slow build |
| NorthWest Crossing | warm, community feel, upbeat indie acoustic |
| Awbrey Butte | cinematic, aspirational, building strings |
| Old Farm District | warm, family-friendly, feel-good acoustic |
| Discovery West | modern, forward-looking, energetic |

Other neighborhoods in [`scripts.md`](scripts.md).

## Quality gate (master skill §6 applies)

- Length 30–45s
- First frame has motion engaged by frame 12 (0.4s)
- Hook text on screen by frame 30 (1s)
- No beat over 4s
- Pattern interrupt at the 50% mark (cut from wide → tight, exterior → interior, etc.)
- Reveal in final 15% (CTA card)
- ffmpeg blackdetect strict (`pix_th=0.05`) returns zero sequences
- All on-screen claims (price ranges, acreage, school proximity, etc.) trace to the corresponding `<neighborhood>_facts.md` reference. **Per repo `CLAUDE.md` §0, no figure ships without a verified source trace.**
- No banned words in overlays (no "stunning", "nestled", "boasts", em-dashes)

## Distribution

| Channel | Cadence | Driver |
|---------|---------|--------|
| Instagram Reels | 1 per week | Rotating through the 19 neighborhoods |
| TikTok | Same cut, 24h offset | Matches IG batch |
| YouTube Shorts (16:9) | 1 per neighborhood | Long-tail SEO — title + description carry the location keyword |
| Facebook Reels | Same cut as IG | Wider age demo, contextualize stats |
| Google Business Profile | Photo-only post per neighborhood | One representative still + caption (no video) |

## Pre-Build QA (mandatory)
Before scaffolding the BEATS array or starting any render:
- Verify the format skill itself was loaded (this skill — required by `scripts/preflight.ts`)
- Pull all data from primary sources (Spark MLS, Supabase, Census, NAR, Case-Shiller — never from training data or memory)
- Write `out/<slug>/citations.json` with every figure → primary-source row before scaffolding BEATS
- Banned-words grep on draft VO + on-screen text BEFORE render
- Validate BEATS structure (12+ beats for 30-45s video, 3+ motion types, no beat over 4s)

## Storyboard Handoff (mandatory unless Matt opts out)
Before render, invoke `storyboard_pass` skill with:
- format = area_guides
- topic = <neighborhood or city name>
- target_platforms = IG Reels, TikTok, YT Shorts
- research_data = <data pulled in Pre-Build QA step>

`storyboard_pass` returns the BEATS array, VO script, citation list, music choice, predicted scorecard. Show Matt the 30-second skim. On Matt's "go" → render. On redirect → invoke `feedback_loop` and re-storyboard.

Skip storyboard ONLY when Matt explicitly says "skip storyboard" or "just build it".

## Render
See format-specific render instructions above (B-roll compilation with text overlays — no VO required). Command pattern:
```
cd listing_video_v4 && npx remotion render src/index.ts AreaGuide out/<slug>/area_guide.mp4 --codec h264 --concurrency 1 --crf 22 --image-format=jpeg --jpeg-quality=92
```

## Post-Build QA Pass (mandatory)
After render completes:
- Auto-invoke `qa_pass` skill on the render output at `out/<slug>/area_guide.mp4`
- `qa_pass` runs all hard refuse conditions, auto-iterates up to 2 cycles on failures, writes `out/<slug>/gate.json`
- If `qa_pass` writes `gatePassed: false` after 2 iterations: the asset goes to `out/_failed/<slug>/` and Matt is told the system could not produce a passing draft. DO NOT show Matt the failed draft.

## Publish Handoff (post-approval only)
After Matt explicitly approves the draft in chat ("ship it", "approved", "publish"):
- Invoke `publish` skill with:
  - mediaUrl = <CDN URL after upload to Supabase Storage from out/<slug>/>
  - mediaType = "reel"
  - platforms = ["ig_reels", "tiktok", "yt_shorts", "pinterest"]
  - gate = <out/<slug>/gate.json contents>
  - captionDefault = <approved caption>
  - captionPerPlatform = <variants from publish skill best-practice matrix>
  - metadata = <platform-specific options like TikTok privacyLevel, YouTube tags, LinkedIn visibility>

The `publish` skill validates the gate (all paths exist, humanApprovedAt < 7 days), then calls `/api/social/publish` which fans out to platforms.

## Feedback Capture (on rejection)
If Matt rejects the draft or suggests a change:
- Auto-invoke `feedback_loop` skill with:
  - originating_skill = area_guides
  - asset_path = `out/<slug>/area_guide.mp4`
  - rejection_reason = <Matt's verbatim words>
  - render_metadata = <gate.json contents>

`feedback_loop` extracts an actionable rule, appends it to this SKILL.md under a `## Lessons learned` section (creating it if absent), and writes a row to `rejection_log` Supabase table. Future invocations of this skill read those rules and adapt.

## Lessons learned
[Auto-maintained by `feedback_loop` skill. Each rejection adds an entry below.]
<!-- format: ### YYYY-MM-DD — <asset slug>: <one-line summary> -->
