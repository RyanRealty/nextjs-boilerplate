# Tool: Replicate / Luma Ray 2

## What it does

Luma Ray 2 is a cinematic-grade image-to-video and text-to-video model that runs on 10× the compute of its predecessor, producing 5–9 second MP4 clips at 540p–1080p with physically accurate lighting, realistic light-surface interactions, and smooth camera choreography — the go-to model when atmospheric mood and photorealism matter more than generation speed or cost efficiency.

---

## When to choose Luma Ray 2 (vs Kling, Veo, Seedance, Hailuo)

| Signal | Tool |
|--------|------|
| Premium listing needs hero-shot photorealism: interior mixed lighting, golden-hour lens fall-off, blue-hour glow | **Ray 2** — lighting accuracy is its measurable edge over every competitor at this tier |
| Scene mood is the deliverable (Cascades at dusk, snow-flurry ambience, sunrise shaft) | **Ray 2** — atmospheric and environmental rendering; Kling goes flatter in overcast/complex light |
| Need composable cinematic camera control (orbit + crane + push-in in one clip) | **Ray 2** — 15 named camera motion concepts, composable via natural language |
| Budget-constrained batch (multiple listings same week) | **Kling v2.1 Master or Hailuo 02** — Ray 2 costs 3–5× more per clip than Kling on subscription; use Ray 2 for hero only |
| Clip must intercut cleanly with live-action or drone footage | **Ray 2** — photorealism ceiling is closest to real-camera output |
| Need 15s+ duration, native audio sync, or 2-minute long-form | **Kling v2.1 Master** — longer clip support; Ray 2 caps at 9s per generation (extendable to ~30s) |
| Fast turnaround at lowest cost per clip | **Seedance Fast** or **Hailuo 02 Standard** |

**Positioning summary:** Ray 2 is the premium atmospheric-cinematic tier. Budget ~30% of AI video budget here for hero shots on $750K+ listings and mood-driven market-report scenes. Let Kling handle volume. Lighting complexity and intercut-with-live-action fidelity are Ray 2's non-negotiable wins.

**Approximate cost comparison (per clip, verified 2026-05-06):**

| Model | Platform | ~Cost / clip |
|-------|----------|--------------|
| Ray 2 (5s, 540p) | fal.ai | $0.50 |
| Ray 2 (5s, 720p) | fal.ai | ~$1.00 (2× base) |
| Ray 2 (5s, 1080p) | fal.ai | ~$2.00 (4× base) |
| Ray 2 (9s, any res) | fal.ai / Luma API | same tier as 5s — choose 9s when possible |
| Ray 2 Flash (5s) | fal.ai | ~$0.30 ($0.06/s) |
| Kling v2.1 Master (10s) | varies | $0.76–$1.08 |
| Hailuo 02 Standard (6s) | fal.ai | $0.27 |
| Seedance Fast (5s) | fal.ai | $0.13 |

> Cost note: Luma's own API charges $0.32/million pixels (540p 5s ≈ $0.32–$0.45; 720p 5s ≈ $1.30–$1.75). Replicate routes through the same Luma backend; per-pixel pricing applies. Choose 9s clips at no extra cost — more footage per dollar.

---

## Auth + endpoint (verified 2026-05-06)

**Replicate slugs (current):**

```
luma/ray-2-720p          # 720p, text-to-video
luma/ray-2-540p          # 540p, text-to-video
```

**Luma API direct (preferred for i2v + full parameter control):**

```
POST https://api.lumalabs.ai/dream-machine/v1/generations
Authorization: Bearer $LUMA_API_KEY
```

**fal.ai endpoint (i2v, full parameters):**

```
fal-ai/luma-dream-machine/ray-2/image-to-video
fal-ai/luma-dream-machine/ray-2             # text-to-video
```

> Important: Replicate's `luma/ray-2-720p` and `luma/ray-2-540p` slugs note that data is transferred from Replicate to Luma Labs and is subject to Luma's terms. For production pipeline, use Luma's API directly or fal.ai — both support i2v with full parameters. Replicate variants (as of 2026-05-06) are still primarily text-to-video; i2v may be limited.

**Environment variable:**

```
LUMA_API_KEY=<your key>
```

---

## Pricing

**fal.ai (recommended for i2v):**

| Resolution | 5s clip | 9s clip |
|-----------|---------|---------|
| 540p | $0.50 | $0.50 (same price — always choose 9s) |
| 720p | ~$1.00 | ~$1.00 |
| 1080p | ~$2.00 | ~$2.00 |

**Ray 2 Flash (draft/iteration):** ~$0.06/s → $0.30 for 5s, $0.54 for 9s.

**Luma native API:** $0.32/million pixels. A 720p (1280×720) 5s clip at 30 fps = 1,280 × 720 × 150 frames ÷ 1,000,000 ≈ 138M pixels → ~$1.40–$1.75.

**Compared to Kling v2.1 Master:** Ray 2 runs 1.5–3× more expensive per clip depending on resolution. Justified for premium listings; excessive for inventory batches.

---

## Optimal parameters for real-estate cinematic

```json
{
  "model": "ray-2",
  "resolution": "720p",
  "duration": "9s",
  "aspect_ratio": "9:16",
  "loop": false,
  "keyframes": {
    "frame0": {
      "type": "image",
      "url": "<CDN URL of listing photo — must be HTTPS, JPG/PNG>"
    }
  }
}
```

**Parameter notes:**

- `duration`: Always use `"9s"` — same price as `"5s"`, gives more footage per clip to cut from.
- `aspect_ratio`: Use `"9:16"` for Reels/TikTok, `"16:9"` for YouTube/MLS hero, `"1:1"` for square feed.
- `loop`: `false` for listing reels (forward motion feels more cinematic); `true` only for ambient cinemagraph loops on landing pages.
- `resolution`: `720p` is the sweet spot — 4× base price for 1080p is hard to justify unless intercut with 4K drone footage.
- Image input: Must be a public HTTPS CDN URL (no base64, no localhost). Luma recommends uploading to your own CDN first. Ryan Realty: upload to Supabase Storage → get signed URL → pass as `frame0.url`.
- Camera motion: Specify via natural language in the `prompt` field using motion concept strings (see below). A separate `/generations/camera_motion/list` endpoint returns the full supported list.

**15 camera motion concepts (composable in prompt):**

`Push in` · `Pull out` · `Orbit left` · `Orbit right` · `Crane up` · `Crane down` · `Pan left` · `Pan right` · `Tilt up` · `Tilt down` · `Truck left` · `Truck right` · `Pedestal up` · `Pedestal down` · `Zoom in` · `Zoom out` · `Aerial drone` · `Static` · `Elevator` · `Bolt cam` · `Tiny planet` · `Roll right` · `Roll left`

Compose them: `"push in with crane up"` · `"orbit left and zoom in simultaneously"` · `"pull out with tilt down for dramatic reveal"`.

---

## Prompt template (heavy on lighting/atmosphere language)

**Structure (follow this order):**

```
[Subject] [Action/motion beat] [Lighting descriptor] [Atmosphere/air quality] [Camera move] [Lens character]
```

**Lighting tokens that work well with Ray 2:**

- `golden hour light raking across [surface]`
- `blue-hour ambient with interior warmth bleeding through windows`
- `overcast diffused light, soft directionless fill, Pacific Northwest mood`
- `thin snow-flurry haze, cold ambient, flat grey sky`
- `sunrise shaft at 15-degree angle hitting [surface], motes visible in air`
- `lens flare at frame edge as camera moves through threshold`
- `soft falloff from bright zone to shadow, 3-stop contrast ratio`
- `practical lamp sources warm against cool exterior`
- `candle-scale interior glow against pre-dawn exterior`

**Avoid (degrade Ray 2 output):**
- `vibrant`, `whimsical`, `hyper-realistic` — test consistently worsen outputs
- `stunning`, `breathtaking`, `gorgeous` — banned per CLAUDE.md style guide + cause slop
- Vague motion: "things happen" / "life appears" — specify discrete beats instead

---

## 5 worked real-estate examples (Bend, Oregon)

**1. Golden hour reveal — mountain-view luxury home**

```
Slow push-in toward floor-to-ceiling windows, golden hour light raking across wide-plank white oak floors,
long shadow bars extending from window mullions, Cascades snow line visible on horizon, no people,
camera push in with crane up, lens flare at frame left as sun angle shifts, filmic 2.35:1 feel,
warm 3200K interior against 5500K exterior sky.
```

**2. Blue-hour exterior — contemporary high-desert home, Bend OR**

```
Static exterior front elevation, blue-hour transition, interior pendant lights and kitchen warmth
glowing gold through glazing, ambient sky shifting cobalt to deep blue, juniper silhouette in foreground,
no wind motion, subtle light spill on driveway concrete, pull out very slowly, telephoto compression,
cool exterior 7000K against warm 2700K interior.
```

**3. Overcast Cascades backdrop — moody Pacific Northwest interior**

```
Living room with floor-to-ceiling view of pine-covered ridge under flat grey overcast,
diffused directionless fill, no hard shadows, rain-damp exterior visible on deck boards,
curtain micro-drift from HVAC, push in toward view glass very slowly, muted palette,
cool 6500K ambient, low contrast, cinematic Pacific Northwest mood.
```

**4. Snow-flurry ambient — high-desert listing exterior**

```
Exterior elevation of contemporary desert home, light snow flurry falling at slow rate,
flat grey winter sky, warm interior glow through windows, dusting of snow on patio furniture,
static camera or very slow orbit left, cold ambient 8000K, breath-visible temperature feel,
no people, no wind, Bend high desert winter.
```

**5. Sunrise shaft — kitchen island, atmosphere**

```
Kitchen island with waterfall-edge stone counter, sunrise shaft entering at 10-degree angle
from east-facing window, air motes visible in beam, warm 2400K shaft against cool ambient pre-dawn fill,
steam rising from espresso cup in foreground (soft focus), slow push-in, no people, no motion except motes
and steam, lens character warm and slightly soft.
```

---

## Common failure modes

| Failure | Trigger | Mitigation |
|---------|---------|------------|
| Excessive atmospheric haze | Overuse of fog/mist/haze descriptors; complex particle systems | Specify quantity: `"light snow flurry, sparse"` not `"heavy snow"` |
| Lighting drift mid-clip | Long (9s) clips with dynamic lighting change described | Anchor one primary light source; avoid `"shifting from X to Y"` constructions |
| Scene over-stylized (painting/render look) | Style words: `"cinematic"`, `"film noir"`, `"dramatic"` stacked | Use one style word; anchor to real-world light sources instead |
| Physics inconsistency (water, cloth) | Complex fabric, water surface, full-body physics | Simplify — curtain micro-drift yes; flowing waterfall no |
| 4K upscaling artifacts | Text, sharp edges, mullion detail in upscaled output | Stay at 720p native; avoid 4K upscale for listing videos with sharp architectural lines |
| Quality degradation in extensions | Extending past ~20s via chained generations | Cap individual generations at 9s; splice in editing rather than chaining 4+ extensions |
| Motion artifacts at beat boundaries | Complex composed camera moves (3+ concepts) | Combine max 2 motion concepts per clip; `"push in with crane up"` works; triple combos break |
| Floaty physics (objects drift unrealistically) | Abstract scene composition, no grounded anchor | Include a grounded surface in every shot: floor, countertop, patio, exterior ground plane |

---

## Output format

- Container: MP4 (H.264)
- Native resolution: 540p, 720p, or 1080p (4K via upscale only)
- Aspect ratios: 16:9, 9:16, 1:1, 4:3, 3:4, 21:9, 9:21
- Duration: 5s or 9s per generation; extendable to ~30s via chained generations (quality degrades past 20s)
- Frame rate: 24 fps (cinematic default) — confirm at render; some outputs are 24, some 30
- Loop: clean loop flag for seamless endpoint blending (use for ambient cinemagraph loops, not listing reveals)
- Audio: not natively generated (unlike Kling) — add ambient bed in Remotion post-mix via `scripts/mix_news_audio.sh`

---

## Fallback

If Ray 2 is unavailable, rate-limited, or cost is prohibitive for a given clip:

| Scenario | Fallback |
|----------|---------|
| Atmospheric exterior / moody PNW mood | **Hailuo 02 Pro (1080p)** via fal.ai — physics-accurate lighting at $0.48/clip |
| Premium interior, complex mixed lighting | **Kling v2.1 Master** — slightly less atmospheric but reliable physics |
| Budget-constrained batch of same scene type | **Hailuo 02 Standard (768p)** — $0.27/clip, acceptable for mid-range listings |
| Draft / iteration loop before hero render | **Ray 2 Flash** — same prompt, 1/3 cost, use to confirm framing before committing to Ray 2 Standard |

---

*Verified 2026-05-06. Sources: Replicate model pages (luma/ray-2-720p, luma/ray-2-540p), fal.ai Ray 2 i2v API, Luma Labs changelog (Camera Motion Concepts, Ray2 release), Luma learning hub (Ray2 FAQ), Awesome Agents AI video pricing April 2026, Flowith Luma vs Kling comparison 2026, MindStudio Ray 2 analysis.*
