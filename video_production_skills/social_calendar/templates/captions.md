# Caption Hook Templates

Source of truth for `scripts/generate_content_calendar.py`.
These templates are embedded as Python dicts in the script; this file documents them
for human reference, review, and editing.

All templates must comply with the Ryan Realty brand-voice rules:
- No banned words: stunning, nestled, boasts, gorgeous, breathtaking, must-see,
  welcome to your dream home, worth a serious look, as a Bend homeowner
- No em-dashes (—) in prose
- No hyphenated noun phrases (use "4 bedrooms" not "4-bedroom")
- Numbers carry units
- Caption length target: 80-140 characters (hook + address + handle + CTA)

Placeholder keys (substituted from listing data at generation time):
- `{address}` — full address string
- `{locale_short}` — neighborhood/area short name e.g. "Vandevert Ranch"
- `{price}` — formatted price e.g. "$3,025,000"
- `{beds}` — integer e.g. 4
- `{baths}` — float e.g. 4.5
- `{sqft}` — formatted e.g. "4,900 sqft"
- `{lot}` — lot size string e.g. "1.38 acres"
- `{status}` — "active" or "pending"
- `{architect}` — architect name if provided, else empty string
- `{property_type}` — "home", "cabin", "ranch", "estate"
- `{special_feature}` — one distinguishing detail
- `{room}` — room label for highlight posts (rotates)
- `{one_detail}` — brief room detail (derived from room label)
- `{distance_to}` — nearest landmark distance e.g. "20 minutes to downtown Bend"
- `{time_of_day}` — "morning", "midday", "golden hour", "dusk"

---

## full_tour_video hooks

Used for 45-second full-tour video posts. Over $1M tier: spare, confident.
$500K-$1M tier: balanced. Under $500K: upbeat.

```
LUXURY (over $1M):
  1.  "A {architect} design. {locale_short}."
  2.  "{beds} bedrooms. {special_feature}. {locale_short}."
  3.  "Inside the {locale_short} {property_type} no one has seen yet."
  4.  "{price}. {beds} bedrooms on {lot}. {locale_short}."
  5.  "This is what {locale_short} looks like from the inside."
  6.  "The full tour. {locale_short}. {beds} bedrooms."
  7.  "{special_feature}. {beds} bedrooms. {locale_short}."
  8.  "On the market now. {beds} bedrooms. {locale_short}."

MID ($500K-$1M):
  9.  "{beds} bedrooms, {baths} baths. {locale_short}."
  10. "See the whole thing. {address}."
  11. "Full tour: {beds} bedrooms, {sqft}. {locale_short}."
  12. "Listed. {locale_short}. {beds} bedrooms, {baths} baths."
  13. "The one in {locale_short}. {beds} bedrooms, {sqft}."
  14. "{price}. {beds} bedrooms. {locale_short}."

ENTRY (under $500K):
  15. "Finally listed. {beds} bedrooms in {locale_short}. {price}."
  16. "{beds} bedrooms, {baths} baths, {sqft}. {price}."
  17. "This is what {price} looks like in {locale_short}."
  18. "Fresh to market. {beds} bedrooms. {price}."
  19. "Full walkthrough. {address}. {price}."
  20. "Come see it. {beds} bedrooms, {sqft}. {locale_short}."
```

---

## single_room_highlight hooks

Used for 15-second single-room spotlight posts. Keep it tight.
One room, one detail, one reason to care.

```
  1.  "The {room} that runs the house."
  2.  "Where mornings happen."
  3.  "{room}: {one_detail}."
  4.  "This {room}. {locale_short}."
  5.  "The {room} alone is worth the drive."
  6.  "See the {room}."
  7.  "15 seconds in the {room}."
  8.  "{room} details. {address}."
  9.  "In the {room}. {locale_short}."
  10. "The {room}. Nothing else to say."
  11. "Every detail in the {room}."
  12. "Start here. The {room}."
  13. "{room} at {locale_short}."
  14. "One room. The {room}. {locale_short}."
  15. "This is the {room} people ask about."
  16. "Inside the {room}. {address}."
  17. "The {room} on {one_detail}."
  18. "Walk through the {room}."
  19. "{beds} bedrooms. This is the {room}."
  20. "You asked about the {room}. Here it is."
```

---

## lifestyle_moment hooks

Used for neighborhood/lifestyle context posts. Establishes the place, not the home.

```
  1.  "What it actually looks like at {time_of_day} on {locale_short}."
  2.  "{distance_to} from the front door."
  3.  "The view from {locale_short}."
  4.  "This is the neighborhood."
  5.  "Where this {property_type} actually sits."
  6.  "{locale_short} on a {time_of_day} in April."
  7.  "The setting. {locale_short}."
  8.  "Outside the front door. {locale_short}."
  9.  "The context most listings skip."
  10. "This is what the area looks like."
  11. "The land around {locale_short}."
  12. "Aerial. {locale_short}."
  13. "{locale_short} from above."
  14. "The reason people move to {locale_short}."
  15. "This is the place."
  16. "Life at {locale_short}."
  17. "The {time_of_day} light in {locale_short}."
  18. "What surrounds this {property_type}."
  19. "The {property_type} sits here. {locale_short}."
  20. "The neighborhood. {locale_short}."
```

---

## Hashtag pools by tier

### Luxury (over $1M)
```
#BendOregon #DeschutesCounty #LuxuryRealEstate #OregonLuxury #BendRealEstate
#PNWRealEstate #LuxuryLiving #Listed #Pending
```

### Mid ($500K-$1M)
```
#BendOregon #DeschutesCounty #BendRealEstate #OregonRealEstate #VisitBend
#CentralOregon #LuxuryRealEstate #Listed #Pending
```

### Entry (under $500K)
```
#BendOregon #CentralOregon #BendRealEstate #OregonRealEstate #FirstTimeHomeBuyer
#BendHomes #HomeSearch #Listed #Pending
```

Use `#Listed` when status is active, `#Pending` when status is pending. Never both.
Cap at 8 hashtags per post.

---

## Caption assembly formula

```
[hook] [address] @MattRyanRealty [cta]
```

Example (luxury, full_tour_video, hook #1):
```
A Jerry Locati design. Vandevert Ranch. 56111 School House Rd, Bend, OR 97707 @MattRyanRealty Tour link in bio.
```

Character count target: 80-140. Trim the address to street + city if over 140.

---

## Notes for script maintainers

- The script embeds these templates as Python dicts. Any edits here must be mirrored
  in `scripts/generate_content_calendar.py` under the `CAPTION_TEMPLATES` constant.
- Template selection is deterministic: `template_index = post_number % len(templates)`.
  This means the same input always produces the same output (reproducible, auditable).
- The banned-word filter runs after template substitution, before writing output.
  If a generated caption contains a banned word, the script raises SystemExit with
  a clear error message identifying the offending term and template index.
- The placeholder `{one_detail}` is derived from `{room}` via a lookup dict in the
  script. If no match, it falls back to the room label itself.
- The placeholder `{distance_to}` defaults to "20 minutes to downtown Bend" if not
  provided in the manifest or inline flags.
- The placeholder `{time_of_day}` is derived from the post date: posts before
  Wednesday = "morning", Wednesday-Thursday = "golden hour", Friday+ = "dusk".
