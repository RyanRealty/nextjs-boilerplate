# Tool: Replicate / Hailuo 02 (MiniMax)

## What it does

MiniMax Hailuo 02 is an image-to-video (i2v) and text-to-video model that generates 6–10 second MP4 clips at 768p (Standard) or 1080p (Pro) with strong real-world physics — fluid motion, natural lighting shifts, and consistent spatial coherence — at a mid-tier price point.

---

## When to choose Hailuo 02 (vs Kling v2.1 Master, Seedance, Wan)

| Signal | Tool |
|--------|------|
| Interior or exterior still → subtle motion (curtains, water, foliage, light) | **Hailuo 02 Standard** — cheapest path to physics-accurate micro-motion |
| Need 6s clip, fast turnaround, budget-constrained batch (multiple listings per week) | **Hailuo 02 Standard** — $0.23–$0.27/run vs Kling's $0.38–$1.08/run |
| Premium listing needs cinematic drama, complex camera choreography, or 9:16 vertical | **Kling v2.1 Master** — superior fluid motion, richer aspect-ratio support |
| Fastest possible turnaround, lowest cost (30–90s generation) | **Seedance 1 Pro** or Seedance Fast — but at lower quality ceiling |
| Long creative sequence (15s+) or AI-generated people in frame | **Wan 2.5 i2v** — handles longer durations |

**Positioning summary:** Hailuo 02 is the budget-to-mid tier. It costs 3–5x less than Kling v2.1 Master for comparable real-estate micro-motion use cases (curtain drift, pool ripple, morning-light shift). Choose Kling when the listing price justifies premium motion quality or when vertical 9:16 Reels framing is required. Choose Hailuo 02 for mid-range inventory batches, cinemagraph-style interior shots, and lifestyle B-roll where physics matter but budget is constrained.

**Approximate cost comparison (per 6s clip, verified 2026-05-06):**

| Model | Platform | ~Cost / 6s clip |
|-------|----------|-----------------|
| Hailuo 02 Standard (768p) | fal.ai | $0.27 ($0.045/s) |
| Hailuo 02 Standard (768p) | Atlas Cloud | $0.23/run |
| Hailuo 02 Pro (1080p) | fal.ai | $0.48 ($0.08/s) |
| Kling v2.1 Master (1080p) | varies | $0.76–$1.08/10s equiv |
| Seedance Fast | fal.ai | $0.13 ($0.022/s) |
| Wan 2.6 | fal.ai | $0.42 ($0.07/s) |

---

## Auth + endpoint (verified 2026-05-06)

**Replicate slug:** `minimax/hailuo-02`

Full model URL: `https://replicate.com/minimax/hailuo-02`

**Replicate Python SDK — polling pattern:**

```python
import replicate

output = replicate.run(
    "minimax/hailuo-02",
    input={
        "prompt": "Morning light moves across the hardwood floor, shadows shift slowly left",
        "start_image": "https://...",    # first frame
        "duration": 6,
        "resolution": "768P",
        "prompt_optimizer": True
    }
)
# output is a URL string pointing to the generated MP4
print(output)
```

For async polling (recommended for production):

```python
prediction = replicate.predictions.create(
    model="minimax/hailuo-02",
    input={...}
)
# Poll until complete
prediction.wait()   # or poll manually: prediction.reload() in a loop
print(prediction.output)   # MP4 URL
```

**Status progression:** `starting` → `processing` → `succeeded` / `failed`

**fal.ai async pattern** (alternative endpoint):

```python
import fal_client

result = fal_client.subscribe(
    "fal-ai/minimax/hailuo-02/standard/image-to-video",
    arguments={
        "prompt": "...",
        "image_url": "https://...",
        "duration": 6,
        "resolution": "768P",
        "prompt_optimizer": True
    }
)
# Poll via GET /v2/video/generations?generation_id={id}
# Interval: every 10–15 seconds
```

---

## Pricing (verified 2026-05-06)

| Tier | Resolution | Duration | Cost/sec | Cost/clip |
|------|-----------|----------|----------|-----------|
| Standard | 768p | 6s | $0.045 | **$0.27** |
| Standard | 768p | 10s | $0.045 | $0.45 |
| Pro | 1080p | 6s only | $0.08 | **$0.48** |

Source: fal.ai official pricing page (fal.ai/models/fal-ai/minimax/hailuo-02). Replicate direct pricing varies; Atlas Cloud lists Standard at $0.23/run. For production billing, use the Replicate dashboard or fal.ai billing — both charge per-second of generated video, not per compute minute.

**Pro tier (1080p) is limited to 6s.** 10s clips only available at 768p Standard.

---

## Optimal parameters for real-estate i2v

### Aspect ratios available

Hailuo 02 does **not** have an explicit `aspect_ratio` input parameter. Output aspect ratio is determined by the input `image_url` dimensions. The model preserves the source image ratio. Valid input constraint: aspect ratio between **2:5 and 5:2**.

- For 16:9 landscape (listing hero shots, drone pulls): provide a 16:9 source image.
- For 9:16 portrait (Instagram Reels, TikTok): provide a 9:16 crop of the listing photo. The output video will be 9:16.
- Minimum shorter side: 300px. Maximum file size: 20MB. Formats: JPG, JPEG, PNG, WebP, GIF, AVIF.

### Duration options

- `6` — default; available at both 768p and 1080p
- `10` — only available at 768p Standard

For real-estate beats (single-scene micro-motion within a longer Remotion composition), **6s is the right choice**. It matches a 2–4 beat sequence and keeps cost at the lower tier.

### Resolution

- `"768P"` — Standard tier, $0.045/s. Use for mid-market listings, batch production, social content.
- `"1080P"` — Pro tier, $0.08/s. Use for luxury listings, hero clips, featured social posts.

### prompt_optimizer flag

`prompt_optimizer: true` (default) — MiniMax's internal rewriter expands sparse prompts into motion-rich instructions. **Disable** (`false`) when your prompt is already precisely engineered (e.g., you have exact camera language, specific motion timing) and you don't want the model to reinterpret it.

### start_image / end_image

- `image_url` (or `start_image` depending on endpoint) — required for i2v. Anchor frame. Use the hero listing photo (best exterior or key interior).
- `end_image_url` — optional. Provide a second frame to constrain where the motion resolves. Useful for controlled dollies or pan endpoints.

---

## Prompt template

```
[SUBJECT AND SETTING] — [CAMERA MOTION] — [AMBIENT DETAIL] — [LIGHT CONDITION]
```

**Formula rules for Ryan Realty:**
- Lead with the physical subject. Never open with adjectives.
- Camera direction before ambient detail.
- One motion verb per clause. No compound sentences.
- Numbers carry units: "two stories," "three windows."

**Base template:**

```
{subject} at {location}, {camera_motion}, {ambient_detail}, {light_condition}, {no_people_flag}
```

**Example fill:**

```
Living room with floor-to-ceiling windows and concrete fireplace, camera drifts slowly left to right,
afternoon light shifts across oak floors, no people or text in frame
```

---

## 5 worked real-estate examples (Bend, Oregon)

### 1. Quick interior pan, mid-budget listing ($500K–$700K)

**Use case:** 2–3 beat interior clip for a listing reel. Main living area, 768p, 6s, Standard tier.

```python
{
    "image_url": "https://cdn.ryan-realty.com/listings/ABC123/living-room.jpg",
    "prompt": "Open living room with vaulted ceiling and exposed wood beams, "
              "camera pans slowly right, afternoon light from south-facing windows "
              "moves across the wood floor, no people in frame",
    "duration": 6,
    "resolution": "768P",
    "prompt_optimizer": False   # prompt is precise; skip rewriter
}
```

**Cost:** $0.27. **Generation time:** ~3–4 min.

---

### 2. Cinemagraph: curtain moves in breeze, room otherwise still

**Use case:** Lifestyle B-roll for a master bedroom or screened porch. Hook beat in a news clip.

```python
{
    "image_url": "https://cdn.ryan-realty.com/listings/ABC123/bedroom-window.jpg",
    "prompt": "Sheer white curtain moves gently in a light breeze through an open window, "
              "rest of the bedroom is perfectly still, morning light, "
              "no motion outside the curtain, no camera movement",
    "duration": 6,
    "resolution": "1080P",
    "prompt_optimizer": False
}
```

**Cost:** $0.48. **Notes:** Keep `prompt_optimizer: false` — the rewriter may add unwanted camera motion. Source image should be 16:9 bedroom shot with curtain prominently visible.

---

### 3. Drone pullback over neighborhood (Bend, OR)

**Use case:** Area-guide hook, 25% pattern-interrupt beat, neighborhood overview reel.

```python
{
    "image_url": "https://cdn.ryan-realty.com/aerials/northwest-crossing-2026.jpg",
    "prompt": "Aerial view of Northwest Crossing, Bend, Oregon, drone pulls back slowly and upward, "
              "Cascade Range visible on the horizon, late afternoon, no text overlay, "
              "homes and tree-lined streets recede as frame widens",
    "duration": 6,
    "resolution": "1080P",
    "prompt_optimizer": True   # let optimizer enrich the aerial description
}
```

**Cost:** $0.48. **Notes:** Source image must be genuine aerial — Hailuo 02 will flag AI-generated inputs with inconsistent physics. 1080p preferred for drone pulls because downsampled motion looks soft.

---

### 4. Lifestyle: morning coffee on deck with Cascades view

**Use case:** Lifestyle beat in a luxury or move-up listing reel. 50% register shift from interior shots.

```python
{
    "image_url": "https://cdn.ryan-realty.com/listings/ABC123/deck-cascades.jpg",
    "prompt": "Deck with two Adirondack chairs, steaming coffee mug on the rail, "
              "Mt. Bachelor visible in the distance, light morning breeze moves through "
              "pine trees at the yard edge, camera holds still, no people in frame",
    "duration": 6,
    "resolution": "768P",
    "prompt_optimizer": False
}
```

**Cost:** $0.27. **Notes:** No people in frame — Hailuo 02 drifts on faces during extended motion. The `steaming coffee mug` prompt element drives physics-accurate steam, which reads well as a motion signal on muted feeds.

---

### 5. Hook clip for Reels: 3s of motion as lead-in to price reveal

**Use case:** First beat (0–3s) of a listing Reel. Pairs with a text overlay card at 3.0s. Source image is cropped 9:16 for portrait output.

```python
{
    "image_url": "https://cdn.ryan-realty.com/listings/ABC123/facade-9x16.jpg",   # 9:16 crop
    "prompt": "Modern craftsman exterior in Bend, Oregon, camera pushes slowly forward "
              "toward the front door, late afternoon warm light on cedar siding, "
              "no people, no text",
    "duration": 6,
    "resolution": "768P",
    "prompt_optimizer": False
}
```

**Cost:** $0.27. **Notes:** The first 3s of the generated clip is cut into the Remotion `<Sequence>` as the hook beat; seconds 3–6 are the transition into the price-reveal text overlay. Supply a **9:16 source image** so output is portrait — model preserves input aspect ratio. No `end_image_url` needed; let motion resolve naturally.

---

## Common failure modes

### Motion-too-fast / over-animated
**Symptom:** Smooth surfaces like granite counters or still water develop ripple or shimmer patterns that look artificial. Foliage moves like a wind tunnel instead of a light breeze.
**Fix:** Add "light," "slow," or "subtle" before every motion verb. Specify "camera holds still" if you want zero camera movement. Disable `prompt_optimizer` — the rewriter often amplifies motion energy.

### Subject drift (identity / geometry drift)
**Symptom:** Architectural elements shift between frames — a window multiplies, a roofline warps, a fireplace tile pattern changes mid-clip.
**Fix:** Use high-contrast anchor points in the source image (strong horizontal lines, distinct materials). Avoid source photos with heavy lens distortion or fisheye. Provide an `end_image_url` to constrain the final frame geometry when drift is a risk.

### Face / person artifacts
**Symptom:** Any person in frame develops a melting or morphing face within 2–3 seconds.
**Fix:** Explicit instruction: "no people in frame." If the source photo has a person, crop them out before passing `image_url`. Hailuo 02 is not designed for AI avatar or talking-head use cases — use a dedicated avatar model for that.

### Texture confusion on fine detail
**Symptom:** High-frequency textures (brick, stone, tile grout, wood grain) shimmer or dissolve.
**Fix:** Use source images at full resolution (no heavy JPEG compression). Keep the motion far from fine-texture zones — specify camera motion that moves away from the high-detail surface, not toward it.

### Prompt rewriter conflicts
**Symptom:** Output looks like a different scene than intended — unexpected objects appear or camera moves in the wrong direction.
**Fix:** Set `prompt_optimizer: false` when the prompt is fully engineered. Only enable when prompts are sparse or exploratory.

---

## Output format

- Container: **MP4**
- Resolution: 768p (1366×768 or source-matching) or 1080p (1920×1080 native, not upscaled)
- Frame rate: **25 fps**
- Duration: 6s or 10s (10s Standard only)
- Delivery: URL returned by API (Replicate CDN link or fal.ai storage link). Download immediately — links are time-limited.

**Integration with Remotion:** Download the MP4 to `public/ai-clips/` before render. Reference via `staticFile("ai-clips/filename.mp4")`. Use a `<Video>` component inside a `<Sequence>` with `startFrom={0}` and `durationInFrames={180}` for a 6s clip at 30fps.

---

## Fallback

If Hailuo 02 is unavailable on Replicate (cold-start timeout, capacity limit, or service outage):

1. **Primary fallback:** `fal-ai/minimax/hailuo-02/standard/image-to-video` — same model, separate infrastructure.
2. **Budget fallback:** `fal-ai/bytedance/seedance-1-pro` — $0.05/s, slightly lower physics fidelity, faster turnaround (~30–90s).
3. **Quality fallback:** `kwaivgi/kling-v2.1` via Replicate — 3–5x cost, superior motion quality for premium listings.
4. **No-API fallback:** Use a static Ken Burns push_in on the source image via Remotion `interpolate()` — zero cost, no physics, but maintains beat structure and motion-from-frame-0 requirement.

Check `video_production_skills/API_INVENTORY.md` for current service status before each batch run.
