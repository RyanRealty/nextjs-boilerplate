# Skill 5 — Social Calendar Automation

## When to use

Matt has an active listing on the market and needs sustained social presence without
manually planning each post. This skill generates a content calendar for 3 posts per week
per active listing across a configurable horizon (default 4 weeks = 12 posts).

Run it once when a listing goes active. Re-run if status changes (active -> pending) to
refresh hashtags and caption tone.

---

## Why 3 posts per week

3 posts/week per active listing is the algorithmic floor for IG and TikTok relevance
without triggering the over-posting penalty (which depresses reach on accounts that post
the same listing content more than once per day). Spread across Mon/Wed/Fri or
Tue/Thu/Sat gives 48-hour gaps between posts — enough for each post to fully cycle
through the discovery feed before the next fires.

Fewer than 3/week per listing and the algorithm de-prioritizes the account for that
property's hashtag cluster. More than 1/day on the same listing and reach per post drops
measurably (observed on real estate accounts with 5K-50K followers, 2024-2025 data).

---

## Content mix (3 posts per week)

| Slot | Format | Length | Source |
|------|--------|--------|--------|
| Full-tour video | `full_tour_video` | 45s | The viral cut, generated separately by the listing-video pipeline (VIDEO_PRODUCTION_SKILL.md) |
| Single-room highlight | `single_room_highlight` | 15s | One room from the listing photo set, deterministic Remotion motion only — no AI i2v |
| Neighborhood / lifestyle | `lifestyle_moment` | 10-20s or static | Drone aerial, walking trail nearby, coffee shop, sunset over the property — establishes context, not the home interior |

Across a 4-week run, the opening slot of each week rotates: week 1 opens with
`full_tour_video`, week 2 with `single_room_highlight`, week 3 with `lifestyle_moment`,
week 4 back to `full_tour_video`. This prevents the algorithm from classifying the
account's posting pattern as automated.

---

## Caption rules (mandatory — same source as VIDEO_PRODUCTION_SKILL.md)

### Banned words (never appear in any caption)
- `stunning`
- `nestled`
- `boasts`
- `gorgeous`
- `breathtaking`
- `must-see`
- `welcome to your dream home`
- `worth a serious look`
- `as a Bend homeowner`

### Formatting rules
- No em-dashes (—) in prose
- No hyphenated noun phrases ("4-bedroom" -> "4 bedrooms")
- Numbers carry units: "$3,025,000", "4 bedrooms", "1,380 sqft"
- Caption length: 80-140 characters (TikTok/IG sweet spot)
- Always end: address + `@MattRyanRealty` + emoji-free CTA ("Tour link in bio.")

### Hook variety
Hooks rotate through ~20 templates per content type so the algorithm does not see
repeated openers. The script enforces this deterministically (no LLM). See
`templates/captions.md` for the full template inventory.

---

## Price-tier register

Follows the same register scale as the video pipeline:

| Tier | Style |
|------|-------|
| Under $500K | Upbeat, accessible, "move-in ready" framing |
| $500K-$1M | Balanced, measured, highlight the value story |
| Over $1M | Spare, confident, let the property speak — fewer words |

---

## Usage

```bash
# With a per-listing manifest (preferred — see Listing Manifest Schema below)
python scripts/generate_content_calendar.py \
  --listing-key vandevert_schoolhouse \
  --weeks 4 \
  --start-date 2026-04-28 \
  --output calendar.json

# Inline flags (fallback — no manifest file required)
python scripts/generate_content_calendar.py \
  --address "56111 School House Rd, Bend, OR 97707" \
  --price 3025000 \
  --beds 4 \
  --baths 4.5 \
  --sqft 4900 \
  --lot "1.38 acres" \
  --status active \
  --locale-short "Vandevert Ranch" \
  --weeks 4 \
  --start-date 2026-04-28 \
  --output calendar.json

# Different cadence (Tue/Thu/Sat)
python scripts/generate_content_calendar.py \
  --listing-key vandevert_schoolhouse \
  --cadence-days tue,thu,sat \
  --output calendar.json
```

All flags:

| Flag | Default | Notes |
|------|---------|-------|
| `--listing-key` | — | Required unless all inline flags present |
| `--weeks` | 4 | Number of weeks to generate |
| `--start-date` | Next Monday from today | YYYY-MM-DD |
| `--output` | `calendar.json` | Output path |
| `--cadence-days` | `mon,wed,fri` | Comma-separated day abbreviations |
| `--address` | — | Inline fallback |
| `--price` | — | Integer or float (no $ or commas) |
| `--beds` | — | Integer |
| `--baths` | — | Float (4.5 = 4 full + 1 half) |
| `--sqft` | — | Integer |
| `--lot` | — | String e.g. "1.38 acres" |
| `--status` | `active` | "active" or "pending" |
| `--locale-short` | — | Short neighborhood/area name e.g. "Vandevert Ranch" |
| `--property-type` | `home` | e.g. "cabin", "ranch", "home", "estate" |
| `--special-feature` | — | One distinguishing detail e.g. "Little Deschutes frontage" |
| `--architect` | — | Architect name if notable |
| `--room-labels` | — | Comma-separated list of room names for highlight captions |

---

## Output schema

```json
{
  "listing": {
    "key": "vandevert_schoolhouse",
    "address": "56111 School House Rd, Bend, OR 97707",
    "price": "$3,025,000",
    "beds": 4,
    "baths": 4.5,
    "sqft": "4,900 sqft",
    "lot": "1.38 acres",
    "status": "active",
    "locale_short": "Vandevert Ranch",
    "property_type": "home"
  },
  "horizon": {
    "start": "2026-04-28",
    "end": "2026-05-25",
    "weeks": 4,
    "post_count": 12
  },
  "posts": [
    {
      "post_number": 1,
      "date": "2026-04-28",
      "day_of_week": "Tuesday",
      "week": 1,
      "content_type": "full_tour_video",
      "format": "vertical_9_16",
      "assigned_photos": "all",
      "caption": "A Jerry Locati design. 4 bedrooms, Little Deschutes frontage. Vandevert Ranch. 56111 School House Rd @MattRyanRealty Tour link in bio.",
      "hashtags": ["#BendOregon", "#DeschutesCounty", "#LuxuryRealEstate", "#Listed", "#BendRealEstate", "#OregonLuxury"],
      "cta": "Tour link in bio.",
      "posting_notes": "First post of week 1 — use strongest hook. Schedule 7-9am or 6-8pm local time for peak reach."
    }
  ]
}
```

---

## Listing Manifest Schema (per-listing)

When a per-listing manifest exists at
`listing_video_v4/public/v5_library/<key>/manifest.json`, it must contain:

```json
{
  "listing": {
    "key": "vandevert_schoolhouse",
    "address": "56111 School House Rd, Bend, OR 97707",
    "price": 3025000,
    "beds": 4,
    "baths": 4.5,
    "sqft": 4900,
    "lot": "1.38 acres",
    "status": "active",
    "locale_short": "Vandevert Ranch",
    "property_type": "home",
    "special_feature": "Little Deschutes frontage",
    "architect": "Jerry Locati",
    "room_labels": ["great room", "kitchen", "primary suite", "office", "bunk room"]
  },
  "photos": [
    {
      "key": "exterior_hero",
      "src": "v5_library/modern/1-web-or-mls-_DSC1050.jpg",
      "category": "exterior",
      "room_label": null
    },
    {
      "key": "great_room_01",
      "src": "v5_library/modern/5-web-or-mls-_DSC0771.jpg",
      "category": "interior",
      "room_label": "great room"
    }
  ]
}
```

If this file is absent, the script accepts inline flags (all required fields above).
If the file is absent AND inline flags are incomplete, the script exits with a clear error.

---

## Data accuracy (mandatory — per CLAUDE.md)

Every stat in every caption (address, price, beds, baths, sqft, lot) must come from
the listing manifest or inline flags passed to the script. The script never invents,
estimates, or approximates any figure. The banned-word filter runs after every caption
is generated and kills the process loudly if any banned term is present.

---

## Posting schedule notes

- Best times: 7-9am or 6-8pm Pacific for Bend audience (Deschutes County skews
  outdoorsy, early-morning and post-workday engagement).
- `full_tour_video` posts perform best Tuesday and Thursday (higher IG/TikTok engagement
  mid-week for real estate content, per 2024-2025 platform data).
- `lifestyle_moment` posts perform best on weekend-adjacent days (Friday, Saturday) when
  buyers are dreaming about their next home.
- Hashtag count: 5-8. More than 10 has been shown to reduce reach on IG Reels (2024
  algorithm update). Quality over quantity.
