# Tool: Replicate / Kling v2.1 Master

## What it does

Kling v2.1 Master (by Kuaishou AI) is a premium image-to-video and text-to-video model that generates 1080p 5–10 second MP4 clips with advanced 3D motion modeling, cinematic camera choreography, and high prompt adherence — the top-tier tier of the Kling v2.1 family on Replicate.

---

## When to choose Kling v2.1 Master (vs alternatives)

| Signal | Tool |
|--------|------|
| Listing reel needs dramatic camera choreography (dolly-in, crane-up, pull-back reveal) in 9:16 portrait | **Kling v2.1 Master** — best camera-motion fidelity at 1080p with 9:16 support |
| Interior or exterior still → subtle micro-motion (curtains, water, foliage, light shift) on budget | **Hailuo 02 Standard** — 3–5× cheaper, comparable physics accuracy for static scenes |
| Highest output quality for luxury listing ($1M+) where per-clip cost is irrelevant | **Kling v2.1 Master** — outperforms Hailuo 02 and Seedance on cinematic depth and mood |
| Need fastest generation clock time (30–90s) and willing to sacrifice quality ceiling | **Seedance 1 Pro** — significantly faster; use for low-budget batch work or rough cuts |
| Native audio-video joint generation matters (ambient sound synced to motion) | **Seedance 2.0** — unified audio-video generation; Kling 2.1 Master has no audio on Replicate |
| Photorealistic real-world physics (liquid, fabric, organic micro-motion) over cinematic drama | **Hailuo 02** — excels at material physics; Kling leans toward cinematic atmosphere over raw realism |
| 8s clips with broadcast-level color science | **Veo 3** — limited API access via Replicate; cinematic but weaker on camera choreography |
| Long sequences (15s+) or human figures in complex action | **Wan 2.5 i2v** — handles extended durations |

**Positioning summary:** Kling v2.1 Master is the go-to for premium listing reels and market-report hero shots where the shot requires a specific camera move (dolly forward, crane reveal, pull-back) and cinematic atmosphere matters as much as physics accuracy. It costs 3–5× more than Hailuo 02 and ~5× more than Seedance per second of output. Justify with listing price tier: use Master for $800K+ listings and luxury market context; use Hailuo 02 for mid-range inventory batches. Luma Ray 2 is stylized and cinematic but ranked below Kling for architectural/spatial realism. Veo 3 is stronger on color science but has restricted API access in 2026 and weaker camera choreography responsiveness.

**Approximate cost comparison (per 5s clip, verified 2026-05-06):**

| Model | Platform | ~Cost / 5s clip |
|-------|----------|-----------------|
| Kling v2.1 Master (1080p) | Replicate | ~$0.80 |
| Hailuo 02 Standard (768p) | fal.ai | ~$0.23 |
| Hailuo 02 Pro (1080p) | fal.ai | ~$0.40 |
| Seedance 1 Pro | fal.ai | ~$0.11 |
| Luma Ray 2 | Luma API | ~$2.00–$3.00 |
| Veo 3 | Google Vertex | varies, restricted |

---

## Auth + endpoint (verified 2026-05-06)

- **Replicate model slug:** `kwaivgi/kling-v2.1-master`
- **Full model URL:** `https://replicate.com/kwaivgi/kling-v2.1-master`
- **Developed by:** Kuaishou AI (kwaivgi)
- **Endpoint:** `https://api.replicate.com/v1/predictions`
- **Required env var:** `REPLICATE_API_TOKEN`
- **Auth header format:** `Authorization: Token $REPLICATE_API_TOKEN`

**Async/polling pattern:** Yes — Kling v2.1 Master is fully asynchronous. The prediction call returns immediately with a `prediction_id`; you poll until status reaches `succeeded` or `failed`. Generation typically takes **2–5 minutes** (5s clip) at ~300 seconds average run time. Recommended polling interval: **5–10 seconds**. Set timeout to at least 600,000ms (10 minutes) for reliable production operation.

**Python SDK — standard blocking pattern:**

```python
import replicate
import os

output = replicate.run(
    "kwaivgi/kling-v2.1-master",
    input={
        "prompt": "Camera slow push-in toward craftsman front entry, morning light rakes across cedar siding, shadows lengthen left to right, still air, 35mm depth of field",
        "image": "https://your-cdn.com/listing-exterior.jpg",   # first frame; max 10MB, min 300×300px, JPG/PNG
        "duration": "5",
        "aspect_ratio": "9:16",
        "negative_prompt": "blur, distortion, watermark, text overlay, oversaturated colors, flickering, motion blur, low resolution, compression artifacts, inconsistent lighting, morphing geometry, camera shake",
        "cfg_scale": 0.5
    }
)
# output is an MP4 URL string (expires 1 hour after generation — download immediately)
print(output)
```

**Python SDK — async polling pattern (recommended for production):**

```python
import replicate
import time

prediction = replicate.predictions.create(
    model="kwaivgi/kling-v2.1-master",
    input={
        "prompt": "...",
        "image": "https://...",
        "duration": "5",
        "aspect_ratio": "9:16",
        "negative_prompt": "...",
        "cfg_scale": 0.5
    }
)

# Poll until complete
while prediction.status not in ("succeeded", "failed", "canceled"):
    time.sleep(5)
    prediction.reload()

if prediction.status == "succeeded":
    video_url = prediction.output   # MP4 URL — download within 1 hour
    print(video_url)
else:
    print(f"Failed: {prediction.error}")
```

**Node.js pattern:**

```javascript
const Replicate = require("replicate");
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

const output = await replicate.run("kwaivgi/kling-v2.1-master", {
  input: {
    prompt: "...",
    image: "https://...",
    duration: "5",
    aspect_ratio: "9:16",
    negative_prompt: "...",
    cfg_scale: 0.5
  }
});
// output: MP4 URL string
```

---

## Pricing (verified 2026-05-06 — pricing changes monthly)

Pricing data sourced from multiple third-party aggregators and cross-referenced against Replicate's model page. Replicate itself says "You'll find estimates for how much any model will cost you on the model's page." The figures below are the most consistent values found across sources as of 2026-05-06:

| Duration | Estimated Cost |
|----------|----------------|
| 5 seconds | ~$0.80 |
| 10 seconds | ~$1.60 |
| Per second | ~$0.16 |

**Notes:**
- Replicate does not publish a public per-model pricing table for Kling v2.1 Master as of 2026-05-06. The model page shows pricing inline when logged in.
- Third-party providers (PiAPI, WaveSpeed) show v2.1-master at $0.96/5s and $1.92/10s. These differ from Replicate-direct by ~20% — use Replicate-direct pricing from the model page for billing calculations.
- **No free tier** for Kling v2.1 Master. Replicate provides $5 free compute credit for new accounts, which covers roughly 6 five-second generations before exhaustion.
- No volume discounts published. Replicate uses pay-as-you-go; enterprise pricing is available via sales contact.
- Eachlabs (a third-party wrapper) cites $1.40/5s with $0.28/additional second — do not use this rate for Replicate-direct budgeting.

**Budget implication for Ryan Realty:** At ~$0.80/clip (5s), a 30-second listing reel requiring 6 Kling clips costs ~$4.80 in generation alone. A full batch of 10 listings costs ~$48. Use Hailuo 02 for mid-market inventory batches to control costs.

---

## Optimal parameters for real-estate cinematic i2v

### Full parameter schema (Replicate `kwaivgi/kling-v2.1-master`)

| Parameter | Type | Required | Default | Allowed Values | Notes |
|-----------|------|----------|---------|----------------|-------|
| `prompt` | string | Yes | — | max 2500 chars | Motion, camera, environment, mood |
| `image` | string (URL) | No* | — | JPG/PNG, max 10MB, min 300×300px, aspect ratio 1:4 to 4:1 | First frame for i2v mode |
| `duration` | string (enum) | No | `"5"` | `"5"`, `"10"` | 5 or 10 seconds only |
| `negative_prompt` | string | No | `"blur, distort, and low quality"` | max 2500 chars | Elements to suppress |
| `cfg_scale` | float | No | `0.5` | 0–1 | Prompt adherence; higher = more literal |
| `aspect_ratio` | string (enum) | No (t2v only) | `"16:9"` | `"16:9"`, `"9:16"`, `"1:1"` | **I2V inherits from input image; for t2v set explicitly** |
| `static_mask` | string (URL) | No | — | Same ratio as image | Defines regions that should not move |
| `dynamic_masks` | array | No | — | Max 6 items; each has mask URL + trajectory coordinates | Fine-grained motion path control |
| `camera_control` | object | No | — | See below | Programmatic camera movement |

*In image-to-video mode, `image` is functionally required. Without it, the model defaults to text-to-video.

**`camera_control` object structure:**

```json
{
  "type": "simple",
  "config": {
    "horizontal": 0,   // lateral movement: negative=left, positive=right
    "vertical": 0,     // height movement: negative=down, positive=up
    "pan": 0,          // rotation in vertical plane: negative=down tilt, positive=up tilt
    "tilt": 0,         // rotation in horizontal plane: negative=left, positive=right
    "roll": 0,         // z-axis rotation: negative=counterclockwise, positive=clockwise
    "zoom": 0          // focal length: negative=narrower/in, positive=wider/out
  }
}
```

Preset `type` values: `"simple"` (custom, use config), `"down_back"` (pull-back + descend), `"forward_up"` (push-in + crane up), `"right_turn_forward"` (arc right), `"left_turn_forward"` (arc left).

At least one non-zero config value is required for camera_control to take effect. **Note:** In practice, prompt-based camera instructions (e.g., "slow push-in") produce more reliable results for real-estate use cases than the camera_control object — use camera_control for precision programmatic workflows only.

### Recommended real-estate parameter settings

```python
{
    "aspect_ratio": "9:16",          # portrait for Reels/TikTok/Shorts
    "duration": "5",                  # 5s default; 10s for hero/establishing shots
    "cfg_scale": 0.5,                 # balanced: follows prompt without forcing unnatural motion
    "negative_prompt": (
        "blur, distortion, watermark, text overlay, oversaturated colors, "
        "flickering, inconsistent lighting, morphing geometry, camera shake, "
        "jittery movement, compression artifacts, motion blur, low resolution, "
        "extra limbs, warped perspective, glitching, color bleed"
    )
}
```

**`cfg_scale` guidance:**
- `0.3–0.4`: More naturalistic drift; model interprets prompt loosely. Good for cinemagraph-style (water feature, fireplace).
- `0.5` (default): Balanced. Recommended for most real-estate shots.
- `0.7–0.8`: Strict adherence. Use when a specific camera move must be precise and image content is clean.
- Above `0.8`: Risk of stiff, over-literal motion and visible frame-seam artifacts.

**`aspect_ratio` note for i2v:** When providing a `9:16` input image, the model inherits portrait framing automatically. The `aspect_ratio` parameter is primarily used in text-to-video mode. Always shoot or crop source photos to 9:16 (1080×1920) before passing to Kling for listing reels.

**`image_tail` / `end_image`:** Not supported on Kling v2.1 Master. The model supports a single first-frame anchor (`image`). If you need first + last frame interpolation, check Kling Pro (some third-party wrappers document tail_image for Pro mode). Do not pass an end_image parameter — it will be ignored or cause an error.

---

## Prompt template (placeholder slots)

### Image-to-Video (standard listing reel use case)

```
[CAMERA_MOVE], [SPEED] over [DURATION_S] seconds. [SUBJECT_DESCRIPTION], [ACTION_OR_MOTION].
[LIGHT_CONDITION], [TIME_OF_DAY], [ATMOSPHERIC_DETAIL]. [LENS_STYLE], [DEPTH_OF_FIELD].
No people, no text overlays, no distortion.
```

**Placeholder definitions:**
- `[CAMERA_MOVE]`: one move only — "slow push-in", "slow pull-back", "slow tilt up", "slow crane up", "slow pan right", "slow dolly left"
- `[SPEED]`: "slow" (default), "moderate" — never "fast" (produces warping)
- `[DURATION_S]`: match your `duration` parameter (5 or 10)
- `[SUBJECT_DESCRIPTION]`: specific architectural elements visible in the source image
- `[ACTION_OR_MOTION]`: what moves in the scene (light shifts, shadows track, trees sway, curtains drift)
- `[LIGHT_CONDITION]`: "morning light", "golden hour", "overcast natural light", "soft interior light"
- `[TIME_OF_DAY]`: "morning", "late afternoon", "dusk" — match actual photo lighting
- `[ATMOSPHERIC_DETAIL]`: "still air", "light breeze moves juniper", "dust motes in afternoon sun"
- `[LENS_STYLE]`: "35mm", "24mm wide", "50mm editorial", "cinematic anamorphic"
- `[DEPTH_OF_FIELD]`: "shallow depth of field", "deep focus", "foreground sharp"

### Full prompt example:

```
Slow push-in over 5 seconds. Craftsman front entry with cedar siding and stone veneer base,
morning light rakes across the porch, shadows lengthen left to right, still air.
35mm, shallow depth of field, foreground juniper sharp. No people, no text overlays, no distortion.
```

---

## 5 worked real-estate examples

All examples use Bend, Oregon context. All prompts are brand-safe (no banned words).

---

### 1. Interior dolly forward through living room of $475K Tumalo home

**Use case:** Lead beat in a listing reel for a 3/2 Tumalo ranch. Source image: wide-angle interior showing open living room, wood floors, sliding door to back yard, Cascade views through glass.

**Full prompt:**
```
Slow push-in over 5 seconds, starting from the entryway threshold, advancing toward the sliding glass door framing a backyard and high-desert sage. Warm afternoon light cuts across engineered oak floors, casting long shadow stripes. Dusty light motes in the air. Interior wood walls visible left frame. 35mm, shallow depth of field. No people, no camera shake, no distortion.
```

**Parameters:**
```python
{
    "image": "https://cdn.ryan-realty.com/listings/tumalo-ranch-living.jpg",
    "prompt": "<above>",
    "duration": "5",
    "aspect_ratio": "9:16",
    "negative_prompt": "blur, distortion, watermark, text overlay, oversaturated colors, flickering, inconsistent lighting, morphing geometry, camera shake",
    "cfg_scale": 0.5
}
```

**Expected output:** 5-second clip starting at entryway, camera moves toward the glass door at a steady slow rate, floor reflections shift, Cascade ridgeline visible through the glass in the background. Motion is cinematic — not robotic or sped-up.

**Why this works:** Single-move prompt (push-in only) with depth layers (entry threshold → wood floor → glass door → exterior view) gives Kling the spatial parallax it needs for credible dolly motion. Light mote detail rewards the model's 3D motion system without requiring it to generate complex physics.

---

### 2. Exterior reveal of mountain-view home in Awbrey Butte

**Use case:** Opening hero shot for a $1.2M Awbrey Butte listing. Source image: aerial-perspective photo showing home roofline, Three Sisters visible in background, high-desert landscape.

**Full prompt:**
```
Slow pull-back over 5 seconds, starting close on the metal roof and timber beam entry, retreating to reveal the full front elevation and driveway curve, Three Sisters range visible on the horizon. Late afternoon light, long shadows across basalt rock landscaping. Wide 24mm, deep focus, everything sharp. No people, no text, no motion blur.
```

**Parameters:**
```python
{
    "image": "https://cdn.ryan-realty.com/listings/awbrey-exterior-aerial.jpg",
    "prompt": "<above>",
    "duration": "5",
    "aspect_ratio": "9:16",
    "negative_prompt": "blur, distortion, watermark, text overlay, oversaturated colors, flickering, inconsistent lighting, morphing geometry, handheld shake, glitching",
    "cfg_scale": 0.6
}
```

**Expected output:** 5-second reveal starting tight on the roofline, camera pulls back and slightly up, full facade comes into frame over the pull, mountain range remains stable in background throughout. Color grading inherits the warm late-afternoon tones from the source photo.

**Why this works:** Pull-back is Kling's most reliable move for exterior architecture — it matches the model's training on establishing shots. `cfg_scale: 0.6` nudges it toward the specific mountain-reveal narrative without over-constraining motion fluidity. "Deep focus, everything sharp" prevents the common failure of blurring the Cascades into an impressionistic smear.

---

### 3. Slow tilt up at front entry, $1.2M luxury craftsman

**Use case:** Second beat in a luxury listing reel. Source image: ground-level shot of craftsman entry — stone columns, cedar shake siding, custom iron lanterns, arched timber door.

**Full prompt:**
```
Slow tilt up over 5 seconds, starting at the stone base columns, moving upward past the cedar shake siding and iron lanterns to the arched timber gable peak. Overcast morning light, flat diffuse shadow, stone texture reads clearly. No wind, no movement except the camera. 50mm editorial, moderate depth of field. No people, no distortion, no watermark.
```

**Parameters:**
```python
{
    "image": "https://cdn.ryan-realty.com/listings/craftsman-entry-ground.jpg",
    "prompt": "<above>",
    "duration": "5",
    "aspect_ratio": "9:16",
    "negative_prompt": "blur, distortion, watermark, text overlay, oversaturated colors, flickering, inconsistent lighting, morphing geometry, camera shake, color bleed",
    "cfg_scale": 0.5
}
```

**Expected output:** Camera pivots vertically up the facade from stone base to gable peak. Stone texture and woodgrain details are preserved frame-to-frame. Diffuse overcast lighting stays consistent — no artificial highlights appear mid-tilt.

**Why this works:** Tilt up is a simple single-axis move Kling handles reliably. Overcast lighting spec eliminates the common "golden glow" hallucination that sometimes appears when light condition is unspecified. "No movement except the camera" prevents the model from animating foliage or shadows that aren't in the source image.

---

### 4. Drone-style pull-back from high-desert listing

**Use case:** Opening hook for a market-report segment or area-guide video. Source image: elevated angle on a cluster of NW Bend homes against high-desert landscape, buttes and sage in foreground.

**Full prompt:**
```
Slow aerial pull-back over 10 seconds, starting from a medium altitude showing the rooflines of a residential cluster, retreating upward and back to reveal the surrounding high-desert landscape, volcanic buttes on the horizon, and the bend in the Deschutes River. Golden hour, warm light on the sage-covered flats, long shadows east-to-west. Cinematic wide, anamorphic feel. No distortion, no text, no flickering.
```

**Parameters:**
```python
{
    "image": "https://cdn.ryan-realty.com/area/nw-bend-aerial.jpg",
    "prompt": "<above>",
    "duration": "10",
    "aspect_ratio": "16:9",
    "negative_prompt": "blur, distortion, watermark, text overlay, oversaturated colors, flickering, inconsistent lighting, morphing geometry, camera shake, jittery movement",
    "cfg_scale": 0.4
}
```

**Expected output:** 10-second aerial pull-back starting mid-frame on rooflines, camera retreats smoothly revealing the high-desert surround, Deschutes corridor visible, volcanic skyline locks in. Warm golden-hour palette from source photo is maintained.

**Why this works:** Lower `cfg_scale` (0.4) gives the model latitude to interpret "aerial pull-back" naturally rather than forcing a literal algorithm. 10-second duration is appropriate for complex aerial reveals — 5s would rush this move. 16:9 aspect fits market-report and area-guide formats where the landscape width matters.

---

### 5. Cinemagraph-style: water feature in motion, rest of frame still

**Use case:** Luxury amenity beat in a $2M+ listing reel. Source image: courtyard with stone water feature, still water spilling over basalt ledge into a pool, surrounding plantings and walls completely static.

**Full prompt:**
```
Static frame, camera locked, no camera movement. Only the water moves: it spills steadily over the basalt ledge into the pool below, surface ripples propagate outward, subtle light reflections shift on the wet stone. Surrounding juniper, gravel, and stone walls are completely still. Overcast natural light, flat shadows, no wind. Macro depth of field. No camera drift, no distortion, no morphing geometry.
```

**Parameters:**
```python
{
    "image": "https://cdn.ryan-realty.com/listings/luxury-courtyard-water.jpg",
    "prompt": "<above>",
    "duration": "5",
    "aspect_ratio": "9:16",
    "negative_prompt": "camera movement, camera drift, panning, tilting, zooming, distortion, watermark, text overlay, flickering, morphing, blur, inconsistent lighting",
    "cfg_scale": 0.7,
    "static_mask": "https://cdn.ryan-realty.com/masks/courtyard-static-zone.png"   # optional: mask the walls/plants for hard-freeze
}
```

**Expected output:** 5-second clip where water flows continuously over the basalt ledge, pool surface ripples, light catches the wet stone — while all surrounding elements (walls, gravel, plantings, sky) remain completely still. Appears as a high-end cinemagraph.

**Why this works:** "Camera locked, no camera movement" in the prompt combined with `"camera movement, camera drift"` in the negative prompt suppresses Kling's default tendency to add subtle parallax motion. Higher `cfg_scale` (0.7) enforces the strict still-vs-motion boundary. The optional `static_mask` parameter can hard-freeze designated zones at the pixel level if prompt-based stillness isn't sufficient.

---

## Common failure modes + fixes

### 1. Oversaturated colors (skin tones, sky, foliage)

**Symptom:** Output video has unnaturally vivid colors compared to the source photograph — sky turns electric blue, wood tones go amber-orange, grass turns lime green.

**Cause:** Kling's 3D motion model has a known tendency to boost saturation during frame synthesis, particularly on organic materials and sky. More pronounced at `cfg_scale > 0.7`.

**Fix:**
- Add `"oversaturated colors, overexposed highlights, blown highlights"` to `negative_prompt`
- Reduce `cfg_scale` to `0.4–0.5`
- Pre-process the source image with a slight desaturation pass (-10 to -15%) before submission — Kling then shifts back toward "normal" rather than overshoot

---

### 2. Geometry morphing / architectural distortion at beat boundaries

**Symptom:** Window frames warp mid-clip, rooflines subtly bend, stone patterns shift — especially in the final 1–2 seconds of a 5-second clip.

**Cause:** The model's motion system extends beyond what the source image can support when camera movement is too aggressive or clip length is insufficient for the requested move.

**Fix:**
- Reduce motion speed: replace "moderate push-in" with "slow push-in"
- Use `"morphing geometry, warped perspective, distorted architecture"` in `negative_prompt`
- Switch from 5s to 10s duration when the move requires more time to complete naturally
- Simplify to a single camera move — combining pan + zoom in one prompt reliably produces warping

---

### 3. Unwanted text or watermark artifacts in output

**Symptom:** Faint watermark-like text appears in a corner of the generated video, or blurry text-like patterns appear on walls/surfaces.

**Cause:** Source image contains embedded text (photographer watermarks, listing overlays), or the model hallucinates text patterns on flat surfaces.

**Fix:**
- Always submit clean source images with no watermarks, agent branding, or text overlays
- Add `"watermark, text, text overlay, visible text, caption"` to `negative_prompt`
- If the source image has a logo/watermark, inpaint it out before submission

---

### 4. Incorrect aspect ratio / black bars

**Symptom:** Output arrives in 16:9 when 9:16 was requested, or has black bars on sides.

**Cause:** The `aspect_ratio` parameter applies primarily in text-to-video mode. In image-to-video mode, the output aspect ratio follows the input image's native ratio.

**Fix:**
- For 9:16 portrait output, crop the source image to 1080×1920 before submission
- Do not rely on `aspect_ratio: "9:16"` alone to reframe a landscape photo
- Pre-crop in Remotion or ffmpeg: `ffmpeg -i input.jpg -vf "crop=1080:1920:(iw-1080)/2:(ih-1920)/2" output.jpg`

---

### 5. Motion too fast / jerky for slow-camera real-estate use

**Symptom:** A requested "slow push-in" arrives as a rapid zoom, or a "slow pan" stutters.

**Cause:** Ambiguous speed language, or source image lacks sufficient depth layers for the model to generate credible parallax. Also occurs when the requested move exceeds what 5 seconds can support at the correct speed.

**Fix:**
- Be explicit: "slow push-in over 5 seconds" not just "push-in"
- Add foreground/midground/background depth layers in the prompt: "foreground stone path, midground facade, background pine ridge"
- Use 10s duration for complex reveals and wide-angle pull-backs
- Reduce `cfg_scale` to `0.4` to give the model more latitude on motion interpretation rather than forcing a literal translation of "fast"

---

## Output format

- **File format:** MP4 (H.264, AAC audio container — note: Kling v2.1 Master on Replicate does **not** include audio; the audio track is silent/absent)
- **Resolution:** 1080p (1920×1080 for 16:9, 1080×1920 for 9:16)
- **Frame rate:** 30fps
- **File size:** Typical range 10–40MB per 5-second clip depending on motion complexity
- **URL format:** `https://replicate.delivery/.../<hash>/output.mp4` (Replicate CDN delivery domain)
- **URL expiration:** Output URLs expire **1 hour** after generation for API-created predictions. Files are automatically deleted from Replicate's storage after 1 hour. **Download the MP4 to local/persistent storage immediately** upon receiving the URL.
- **Web UI predictions:** If generated via the Replicate web playground, files are kept indefinitely until manually deleted.

**Download pattern (immediately after prediction succeeds):**

```python
import requests

def download_clip(video_url: str, local_path: str):
    """Download Kling output before 1-hour expiry."""
    response = requests.get(video_url, stream=True)
    response.raise_for_status()
    with open(local_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    print(f"Saved: {local_path}")

# Call immediately after prediction.status == "succeeded"
download_clip(prediction.output, "out/listing-reel-beat-1.mp4")
```

---

## Fallback when Kling fails

**Primary fallback:** `minimax/hailuo-02` (Replicate slug) — same i2v pattern, similar prompt structure, ~3–5× cheaper per clip.

**When to trigger fallback:**
- Kling prediction returns `failed` status after 2 retries
- Generation time exceeds 15 minutes (server overload condition)
- Output consistently fails quality gate (warped geometry, oversaturation not fixable via prompt)
- Budget constraint: mid-market listing inventory where $0.80/clip is unjustified

**Fallback call pattern:**

```python
output = replicate.run(
    "minimax/hailuo-02",
    input={
        "prompt": same_prompt,               # reuse Kling prompt verbatim — Hailuo reads camera language similarly
        "start_image": image_url,
        "duration": 6,                       # Hailuo default is 6s, not 5
        "resolution": "1080P",
        "prompt_optimizer": True             # Hailuo-specific: improves prompt interpretation
    }
)
```

**Secondary fallback for specific use cases:**
- Cinemagraph-style (water/fire/foliage only moving): **Hailuo 02** — stronger physics accuracy for organic micro-motion
- Aerial pull-back where Kling consistently warps: **Seedance 1 Pro** — better large-scale camera movement on landscape scenes, significantly faster generation
- Ultra-premium listing where quality ceiling must be absolute highest: **Luma Ray 2** — strongest cinematic color grading, but ~3× more expensive than Kling and accessible only via Luma's own API (not Replicate as of 2026-05-06)

---

*Verified 2026-05-06. Sources: [replicate.com/kwaivgi/kling-v2.1-master](https://replicate.com/kwaivgi/kling-v2.1-master), [Replicate output files docs](https://replicate.com/docs/topics/predictions/output-files), [fal.ai Kling 2.1 Master i2v API schema](https://fal.ai/models/fal-ai/kling-video/v2.1/master/image-to-video/api), [Novita AI schema](https://novita.ai/docs/api-reference/model-apis-kling-v2.1-i2v-master), [PiAPI schema](https://piapi.ai/docs/kling-api/create-task), [ComfyUI camera controls](https://docs.comfy.org/built-in-nodes/partner-node/video/kwai_vgi/kling-camera-controls), [Eden AI Hailuo vs Kling comparison](https://www.edenai.co/post/hailuo-ai-2-0-vs-kling-ai-2-1-master-who-really-won), [PixelMotion comparison](https://www.pixelmotion.io/blog/luma-vs-kling-vs-hailuo-comparison), [Artlist negative prompts](https://artlist.io/blog/negative-prompts-ai-video/), [Apidog Replicate guide](https://apidog.com/blog/use-kling-ai-api-via-replicate/), [VIDEOAI.ME camera prompts](https://videoai.me/blog/kling-ai-camera-movement-prompts), [WaveSpeed Kling i2v Master](https://wavespeed.ai/models/kwaivgi/kling-v2.1-i2v-master). Pricing figures are estimates from third-party aggregators; verify against the Replicate model page before committing to a budget.*
