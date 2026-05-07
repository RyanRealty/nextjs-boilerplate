---
name: weekend-events-video
kind: format
description: >
  30-45s "this weekend in [city]" multi-event social reel rendered to every
  platform aspect (16:9, 9:16, 1:1, 4:5, 2:3). Triggers on: "weekend events",
  "this weekend video", "events reel", "weekend in Bend", "what to do this
  weekend", "Friday Saturday Sunday in [city]". Routes through content_engine.
  Distinct from area_guides (neighborhood B-roll, no time-bound events) and
  social_calendar (per-listing 4-week schedule).
---

# Weekend Events Video — Format Skill

## When to use

Producing a time-bound multi-event social reel for a single weekend (Fri/Sat/Sun)
in a specific city. The video is the antidote to "I'm bored, what's happening?"
— it surfaces the top 5 events with date, time, venue, and one scannable detail
per event, in 30-45 seconds, across every platform aspect.

Run it weekly, on Wednesday or Thursday, for the upcoming weekend. Not for past
events. Not for events more than 4 days out (engagement collapses past the
"plan-this-weekend" window).

## What this format is NOT

- Not a year-round events guide (use `area_guides` for that)
- Not a single-event deep dive (use `news-video` for one big story)
- Not a recurring weekly series with the same hook (rotate hooks; algorithm
  penalizes repetition)
- Not for events that aren't open to the public (e.g., athlete-only camps,
  invite-only fundraisers)

## Mandatory primary-source verification — READ FIRST

Per CLAUDE.md §0, **every event** must be traced to a primary source before it
ships. The verification trace lives in `data/<slug>/citations.json` and is
audited before render.

**Source priority:**

1. Venue's own page (`towertheatre.org`, `bendconcerts.com`, `homegrownfestbend.com`)
2. Official event page (festival sites, organizer sites)
3. Local newspaper of record (Bend Bulletin, The Source Weekly, Central Oregon Daily, KTVZ)
4. Visit Bend / Visit Central Oregon official calendars

**Forbidden:**

- LLM recall ("I remember Brandi Carlile is playing this weekend") — never.
- Aggregator-only citations (Bandsintown, Eventbrite alone) — they're a starting
  point, but the primary venue page must confirm.
- Press releases that haven't been corroborated by a second source for the
  date/time. Press releases get dates wrong.

**Each event needs verified:**

- Date (correct day of week, not just date)
- Time (start time; gate vs show distinction for concerts)
- Venue (full name, city, neighborhood)
- Headliner / lineup (spell every name; double-check)
- Ticket info if relevant (only print if verified)

**Cut, don't fudge.** If an event's time can't be confirmed in 60 seconds of
primary-source checking, drop it. Better 4 verified events than 5 with a wrong
time. A wrong time at a Bend listing under the Ryan Realty brand is a
compliance hit (Matt is a licensed principal broker).

## Top-5 selection

Five events per weekend. Selection bar:

1. **Big music event** (festival, ticketed concert, headliner show)
2. **Big festival or activity** (food fest, art walk, arts crawl, beer fest)
3. **Big race / outdoor event** (run, ride, multisport)
4. **Family event** (kids/family-friendly, holiday-tied if applicable)
5. **Wild card** (one weird-good thing — comedy show, vintage market, art opening)

If a category has no qualifying event that weekend, skip it — don't fill with
something that doesn't belong. A 4-event weekend is fine. 6+ is too many for
30-45s.

**Selection bias to avoid:**

- Don't auto-include every event at a venue Matt likes; the video is for the
  audience, not the broker.
- Don't favor real-estate-adjacent events (open houses, broker mixers); this
  format has zero broker branding by design.
- Don't push paid-event-only; free family events count.

## Format structure

```
BEAT 0  INTRO TITLE  (3.0s)  Silent. Kinetic title. Designed for thumbnail.
BEAT 1  EVENT 1      (~7s)   Image + title + date pill + venue + caption + VO
BEAT 2  EVENT 2      (~6s)   Image + title + date pill + venue + caption + VO
BEAT 3  EVENT 3      (~6s)   Image + title + date pill + venue + caption + VO
BEAT 4  EVENT 4      (~7s)   Image + title + date pill + venue + caption + VO
BEAT 5  EVENT 5      (~7s)   Image + title + date pill + venue + caption + VO
BEAT 6  OUTRO CARD   (2.5s)  Silent. CTA: "MORE EVENTS / visitbend.com/events"
```

Total: 30-45s. The intro and outro are silent — locked design choice (see
"Intro card spec" below).

## Intro card spec (CRITICAL — locked)

**The intro is the most important frame in the video** because it doubles as
the YouTube/Pinterest thumbnail. Three rules:

1. **No voiceover.** Beat 0 is silent. The MP3 starts at Beat 1. The viewer's
   first sound is the first event's hook, not noise over the title.
2. **No captions.** Beat 0 has no caption band. The title text *is* the
   content; layering captions over it crowds the frame and ruins the thumbnail.
3. **Ends on a clean static frame.** Kinetic typography animates IN over the
   first 1.5s, then holds STATIC for the remaining 1.5s. The static-hold frame
   is what becomes the thumbnail. If the title is mid-animation when the
   thumbnail-frame is captured, the thumbnail looks broken on YouTube grid.

Title structure (locked):

```
[hero word/line — Amboqia 120-180px]
THIS WEEKEND
IN [CITY]

[dateline — AzoSans 56px gold pill]
MAY 8-10, 2026

[tagline — AzoSans 36px cream]
5 things you don't want to miss
```

Backdrop: iconic city image (intro_card.jpg) at 60% darkened scrim. Title in
center-left composition (rule of thirds, not dead-center).

## Outro card spec

- 2.5s, silent
- Single line: "MORE EVENTS" Amboqia 120px
- Sub: "visitbend.com/events" AzoSans 48px gold
- No logo, no phone, no agent name (per CLAUDE.md video brand rules — viral
  cuts have zero broker branding)

## Per-event card spec

Each event beat (~6-7s) contains:

- **Background image** (full-bleed, aspect-cropped). Pulled from Unsplash via
  `scripts/fetch-images.mjs` per `data/<slug>/images.json` queries. Attribution
  pill mandatory (see below).
- **Top-down gradient scrim:** `linear-gradient(180deg, rgba(0,0,0,0) 0%,
  rgba(16,39,66,0.55) 65%, rgba(16,39,66,0.85) 100%)` — keeps the top of the
  image readable while protecting the title at bottom.
- **Event title** — Amboqia, aspect-aware sizing:
  - 16x9: 96px
  - 9x16: 88px
  - 1x1: 88px
  - 4x5: 84px
  - 2x3: 80px
- **Date pill** — gold (#D4AF37) background, navy text, AzoSans 32-44px,
  pill-shaped (corner-radius 999px). Format: "Fri May 8 · 7:30 PM".
- **Venue line** — AzoSans cream, 36-48px, single line, truncated with ellipsis.
- **Photo attribution pill** — AzoSans 22px cream, navy 60% pill,
  position per `images.json#attribution_pill_spec.position_per_aspect`.

## Captions (mandatory, per master skill §0.5)

- Caption band STARTS at Beat 1 (silent intro has no captions).
- Full-sentence with active-word highlight (gold + scale 1.0→1.08 spring).
- Word timing from `props.captionWords` (ElevenLabs forced alignment).
- 200-300ms crossfade between sentences. No hard cuts.
- Caption safe zone is reserved at the composition level — no other component
  can enter it. See `images.json` and `SafeZones.tsx` for per-aspect bands.

## Voiceover (locked, per master skill)

- Voice: **Victoria** (`qSeXEcewz7tA0Q0qk9fH`). Locked.
- Settings: `stability=0.40`, `similarity_boost=0.80`, `style=0.50`,
  `use_speaker_boost=true`, `model=eleven_turbo_v2_5`. (Conversational tuning
  per Matt directive 2026-05-07.)
- Single ElevenLabs `/with-timestamps` call for the entire VO. NO chunked
  per-beat calls (causes choppiness — see `synth-vo.mjs` rewrite note).
- Numbers spelled out for ingestion ("seven thirty" not "7:30 PM"). Captions
  display the numerics — VO speaks the words.
- IPA phoneme tags for tricky local names: Deschutes (`dəˈʃuːts`), Tumalo
  (`TUM-uh-low` per Matt verified pronunciation 2026-05-06).
- Total VO target: 35-45s spoken. Plus 3.0s intro + 2.5s outro = 40.5-50.5s
  total. Stay inside the 30-60s viral window.

## Banned content

Inherits the master banned list from `ANTI_SLOP_MANIFESTO.md` and CLAUDE.md.
Format-specific additions:

- **No "the best [city] has to offer this weekend"** — generic, AI-pattern.
- **No "from [music] to [food], there's something for everyone"** — same.
- **No "make sure to mark your calendar"** — instruction-deck cliche.
- **No category-stuffing** ("over 40 events to choose from!"). Pick 5, name 5.
- **No paid-event-only language** ("ticketed", "VIP") unless it's the actual
  defining feature of the event.

## Transitions

Three approved transitions, randomized but never repeating consecutively:

1. **Wipe-reveal** — mask grows from edge (left, right, top, bottom — randomize)
2. **Crossfade with subtle scale** — outgoing scales 1.0→1.04, incoming
   scales 1.04→1.0, opacity crossfade 200ms.
3. **Card flip-in with motion blur** — hard rotate-Y on incoming card, blur
   on outgoing, 240ms.

No hard cuts, no slide-only, no whip-pan. Whip-pan is overused in the format
elsewhere; we want clean and confident.

## Image sourcing (Unsplash → Shutterstock fallback)

Every event card needs an image that **pertains to the event**. See
`data/<slug>/images.json` for the canonical contract.

Rules:

- Unsplash first. Shutterstock only if Unsplash returns nothing usable after
  primary + 3 fallback queries.
- **Trigger the Unsplash download endpoint** when an image is selected
  (`/photos/<id>/download`) — required by Unsplash API guidelines.
- **Attribution is mandatory.** Pill format: "Photo: {name} / Unsplash".
  Photographer name + profile URL must include `utm_source=ryan_realty&utm_medium=referral`.
- **Reject inappropriate matches.** If the Unsplash result is a stock-cliche
  ("happy people pointing at laptop"), reject and fall back. The image must
  set the mood for the actual event.
- **No press-photo lifting.** Do not use band/comedian/venue press photos
  unless we have explicit license. Stock illustrative imagery only.

## Aspects (every platform)

One BEATS array → five renders → fan-out:

| Aspect | Resolution | Platforms |
|---|---|---|
| 16:9 | 1920×1080 | YouTube long-form, X horizontal, GBP |
| 9:16 | 1080×1920 | YouTube Shorts, IG Reels, FB Reels, TikTok, IG/FB Stories, Threads vertical |
| 1:1 | 1080×1080 | LinkedIn, IG Feed, FB Feed, Nextdoor, X square |
| 4:5 | 1080×1350 | IG Feed (alt — taller), FB Feed |
| 2:3 | 1080×1620 | Pinterest |

Layout-aware components reframe per aspect — text size, image crop focal
point, safe-zone Y bands all parameterized in `SafeZones.tsx`.

## Pre-build QA (mandatory)

Before scaffolding the BEATS array or starting any render:

- Verify this skill was loaded
- Pull all event data from primary sources (per "Mandatory primary-source
  verification" above) and write `data/<slug>/citations.json` BEFORE BEATS
- Banned-words grep on draft VO + on-screen text BEFORE render
- Validate BEATS structure: 7 beats (intro + 5 events + outro), 30-45s total,
  no beat over 8s, intro 3.0s and outro 2.5s exact

## Render

Pipeline (all on the same machine — Mac or any host with ElevenLabs + Unsplash
network access):

```bash
cd video/weekend-events
npm install
node scripts/fetch-images.mjs --slug=weekend-events-2026-05-08-to-10
node scripts/synth-vo.mjs    --slug=weekend-events-2026-05-08-to-10
node scripts/render-all.mjs  --slug=weekend-events-2026-05-08-to-10
node scripts/qa-and-scorecard.mjs --slug=weekend-events-2026-05-08-to-10
```

`render-all.mjs` renders all 5 aspects to `out/<slug>/<aspect>/weekend.mp4`.

## Post-build QA (mandatory)

After render completes for ALL aspects:

- ffprobe each MP4: duration in [30s, 60s]
- ffmpeg blackdetect strict (`pix_th=0.05`) returns ZERO sequences per file
- Frame at 0s shows the static title hold (thumbnail validation)
- Banned-words grep on captions, VO script, on-screen pills
- Every figure on screen traces to citations.json
- Photo attribution pill present in every event beat
- Auto-invoke `qa_pass` skill — writes `out/<slug>/<aspect>/gate.json`
- If `gatePassed: false` after 2 iterations: file goes to `out/_failed/`,
  Matt is told the system could not produce a passing draft. DO NOT show
  Matt the failed draft.

## Viral scorecard

Format minimum: **80** (per master `VIRAL_GUARDRAILS.md`). Auto-zero hits
(banned word, unverified date/time, AI without disclosure, fair-housing hit)
= ship-blocker regardless of headline score.

## Storyboard handoff

Skip the standalone storyboard pass for this format — the BEATS structure is
locked (intro + 5 events + outro). Storyboard is built into `events.json`
and `script.json`. Re-invoke storyboard only if Matt requests a structural
deviation.

## Publish handoff (post-approval only)

After Matt explicitly approves the draft in chat ("ship it", "approved",
"publish"):

- Upload approved MP4s to Supabase Storage bucket `weekend-events/<slug>/`
- Invoke `publish` skill OR call `/api/social/publish` directly with:
  - One call per platform with the matching aspect MP4
  - `mediaType = "reel" | "video"` per platform
  - `captionDefault` + per-platform variants
  - `gate = <out/<slug>/qa.gate.json>`
- Platform → aspect map:

| Platform | Aspect file | mediaType |
|---|---|---|
| YouTube long | `16x9` | `video` |
| YouTube Shorts | `9x16` | `short` |
| IG Reels | `9x16` | `reel` |
| IG Feed | `4x5` | `feed_video` |
| IG Stories | `9x16` | `story` |
| FB Reels | `9x16` | `reel` |
| FB Feed | `1x1` | `feed_video` |
| TikTok | `9x16` | `video` |
| LinkedIn | `1x1` | `feed_video` |
| Pinterest | `2x3` | `idea_pin` |
| X | `16x9` | `tweet_video` |
| Threads | `9x16` | `reel` |
| Google Business Profile | `16x9` | `gbp_post` |
| Nextdoor | `1x1` | `feed_video` |

## Cadence

Run weekly, Wednesday/Thursday, for the upcoming Fri-Sun. Past-weekend videos
have ~3% the engagement of upcoming-weekend videos.

## Lessons learned
[Auto-maintained by `feedback_loop` skill. Each rejection adds an entry below.]
<!-- format: ### YYYY-MM-DD — <slug>: <one-line summary> -->
