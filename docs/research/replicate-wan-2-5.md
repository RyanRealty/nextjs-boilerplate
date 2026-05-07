# Tool: Replicate / Wan 2.5 i2v

> Researched 2026-05-06. Sources: Replicate model page, AI/ML API docs, Atlas Cloud i2v guide, Pixazo 2026 model comparison, Promptus Wan 2.5 prompt guide, Spheron GPU cost analysis.

---

## What it does

Alibaba's open-source image-to-video model — latest stable release in the Wan 2.x lineage — animates a reference image into a 5–10s clip with native one-pass audio/visual sync (VO + lip-sync in the same generation call).

---

## When to choose Wan 2.5 (vs Kling, Hailuo, Seedance)

**Choose Wan 2.5 when:**
- Running **high-volume batch jobs** where per-clip cost is the primary constraint. At 1,000 clips/month (8s each), Wan 2.6 Flash costs $144 vs $568 (Kling) vs $2,240 (Hailuo). Wan is the only model where self-hosted marginal cost approaches $0.
- You need a **reliable open-source backbone** — weights are public on HuggingFace (`Wan-AI/Wan2.5-I2V`), pipelines are self-hostable, and the Replicate API is stable.
- The clip needs **audio sync in a single pass** (e.g., VO narration locked to lip movement) without a separate TTS + alignment step.
- Content is **product/feature visualization or architectural b-roll** — Wan's semantic compliance and text rendering are strong for these.
- **Prototyping or A/B testing** visual motion before committing to a Kling or Seedance render budget.

**Choose something else when:**
- **Human performance + micro-expressions** → Hailuo 2.3 (best-in-class for face motion)
- **Style preservation from reference image** (character fidelity across frames) → Seedance v1.5 Pro or Kling 3.0
- **Multi-shot narrative coherence** (scene-to-scene consistency) → Seedance
- **Complex physics interactions** → Veo
- Budget is not constrained and maximum motion quality is required → Kling 2.6+

**Wan's motion profile:** subtle, steady, reliable. Not the leader on cinematic drama or complex body physics. Strong on slow camera moves, gentle environmental animation, and product orbit shots.

---

## Auth + endpoint (verified 2026-05-06)

```
Endpoint slug:  wan-video/wan-2.5-i2v
Replicate URL:  https://replicate.com/wan-video/wan-2.5-i2v
Run count:      ~209,900 (as of 2026-05-06 — most-run Wan 2.5 model)
Model created:  ~2025-10 (7 months prior); last updated ~2025-12 (5 months prior)
```

**Replicate Python client:**
```python
import replicate

output = replicate.run(
    "wan-video/wan-2.5-i2v",
    input={
        "image": open("frame.jpg", "rb"),
        "prompt": "...",
        "duration": 5,
        "resolution": "720p",
        "aspect_ratio": "9:16",
    }
)
```

**REST:**
```
POST https://api.replicate.com/v1/models/wan-video/wan-2.5-i2v/predictions
Authorization: Token $REPLICATE_API_TOKEN
```

---

## Pricing

Replicate bills Wan 2.5 i2v by **GPU-second consumed**, not a flat per-clip fee. The model runs on H100 hardware.

| Hardware | Replicate rate | Est. cost per 5s clip | Est. cost per 10s clip |
|----------|---------------|----------------------|------------------------|
| Nvidia H100 (80GB) | $0.001525/sec | ~$0.46–$0.76\* | ~$0.92–$1.52\* |
| Nvidia A100 (80GB) | $0.001400/sec | ~$0.42–$0.70\* | ~$0.84–$1.40\* |

\* Generation time is not wall-clock equal to clip duration. At 720p on H100, Wan 2.2 generates ~80–100s of finished video per GPU-hour, implying ~$0.029–$0.036/finished second at H100 spot rates. Wan 2.5 with audio is heavier; budget ~$0.04–$0.06/finished second as a working estimate until Replicate publishes a model-specific rate.

**Comparative context (third-party hosted, verified Atlas Cloud 2026):**
- Wan 2.6 Flash (comparable): $0.018/finished second
- Seedance v1.5 Pro: $0.047/finished second
- Kling 3.0 Std: $0.071/finished second
- Hailuo 2.3: $0.28/finished second

Wan is the clear cost leader across all i2v tiers. The 2.5 i2v on Replicate sits between Wan Flash pricing and Seedance pricing depending on GPU utilization efficiency.

**Cost at scale (1,000 clips/month, 8s each, using $0.04/s estimate):**
~$320/month — still 1.8× cheaper than Seedance, 4.4× cheaper than Kling, 17× cheaper than Hailuo.

---

## Optimal parameters for real estate

### Core inputs

| Parameter | Type | Default | Options | Notes |
|-----------|------|---------|---------|-------|
| `image` | file/URL | — | JPEG, PNG, WEBP, max 10 MB | First frame; use highest-res photo available |
| `prompt` | string | — | — | See template below |
| `duration` | integer | 10 | `5`, `10` | Use 5s for IG Reel beats, 10s for walkthroughs |
| `resolution` | string | `1080p` | `480p`, `720p`, `1080p` | Use 720p for volume runs; 1080p for hero clips |
| `aspect_ratio` | string | `16:9` | `16:9`, `9:16`, `1:1` | **Always `9:16` for Reels/TikTok/Shorts** |
| `negative_prompt` | string | — | — | Use to exclude camera shake, blur, distortion |
| `enhance_prompt` | boolean | `true` | — | Leave `true` for short prompts; set `false` if prompt is already detailed |
| `seed` | integer | random | 0–2147483647 | Set for reproducibility across A/B runs |

### Recommended negative prompt for real estate
```
camera shake, handheld jitter, lens breathing, motion blur, overexposed windows, dark interiors, fisheye distortion, visible people, watermark, text overlay, logo
```

### Resolution recommendation by use case
- **Volume batch (neighborhood b-roll, lifestyle filler):** `720p` — cuts cost ~40%, quality difference imperceptible at social compression rates
- **Hero listing clips, market report reveals:** `1080p` — worth the cost for the primary deliverable
- **Preview/QA:** `480p` — fastest, cheapest, for visual approval before the full-res render

---

## Prompt template

Structure: `[subject/entity] + [environment] + [camera move] + [motion description] + [lighting/atmosphere] + [style tag] + [audio cue if needed]`

```
[SUBJECT: what is in frame], [ENVIRONMENT: brief setting], [CAMERA: exact move — slow push-in / gentle orbit / subtle parallax / slow pan left], [MOTION: what physically moves in frame], [ATMOSPHERE: lighting quality, time of day, mood], cinematic, 4K quality, smooth motion, no camera shake
```

**Keep prompts under 150 words.** Wan 2.5 responds better to explicit motion verbs than abstract adjectives. Name the camera move. Name what moves. Avoid banned words (stunning, gorgeous, nestled, etc.).

---

## 5 worked real-estate examples

### 1. Quick cinemagraph — entryway lighting, IG Reel beat
**Use case:** Single beat in a listing reel. Duration 5s, 9:16, 720p. Highest-volume scenario — run dozens per listing batch.

**Prompt:**
```
Elegant entryway with hardwood floors and a large pendant light, late-afternoon light streaming through side windows, camera holds perfectly still, chandelier sways very slightly, light plays across the floor in slow shifting patterns, warm amber tones, architectural interior photography, no motion blur, no people
```
**Negative prompt:** `camera shake, fast movement, overexposed windows, dark shadows, people, watermark`
**Duration:** 5 | **Resolution:** 720p | **Aspect:** 9:16

---

### 2. Volume tier — bulk render, 20+ neighborhood-overview clips
**Use case:** Automated pipeline for neighborhood content. 20 clips = ~$8–15 at Wan pricing vs $60–100 at Kling pricing.

**Prompt:**
```
[NEIGHBORHOOD NAME] street with mature trees lining sidewalk, Pacific Northwest afternoon light, camera slow push-in along the street, tree leaves move gently in a light breeze, parked cars still, golden hour light, residential neighborhood, no people, cinematic
```
**Settings:** `enhance_prompt: false` (prompts are already detailed), `resolution: 720p`, `duration: 5`, `seed: [fixed per neighborhood]` for consistency across the batch.

**Pipeline note:** Wan 2.5's open weights mean you can self-host for this tier and drive GPU cost to ~$0.029/finished second. For Replicate-hosted pipeline, budget $0.04–0.06/s.

---

### 3. Stylized motion — artistic intent vs photo-real
**Use case:** Market report or trend video where the visual should feel editorial, not photographic.

**Prompt:**
```
Aerial view of a Bend Oregon residential neighborhood in autumn, warm ochre and amber foliage, camera very slow pull-back revealing the broader mountain skyline, clouds drift slowly overhead, soft cinematic grade, desaturated teal shadows, no sharp cuts, no text, no logos
```
**Note:** Wan 2.5 handles aerial/landscape stylization well. For human-performance stylization (faces, expressions), use Hailuo instead. For pure artistic abstraction, Wan holds up better than photo-real models which flatten style.

---

### 4. Lifestyle b-roll filler
**Use case:** Supporting beat in a market report video — coffee shop, trail, outdoor scene. Runs at 720p for cost efficiency.

**Prompt:**
```
Outdoor dining patio at a Bend Oregon coffee shop, mid-morning light, camera slow pan right across empty tables with chairs, dappled tree shadow moves across the surface, warm natural light, no people in frame, documentary style, smooth motion, no camera shake
```
**Duration:** 5 | **Resolution:** 720p | **Aspect:** 9:16

---

### 5. A/B test variant alongside Kling
**Use case:** Before committing Kling budget to a hero listing clip, render Wan 2.5 first. If motion quality passes QA, ship Wan. If not, escalate to Kling.

**Decision gate:**
- Wan passes → save $0.03–0.04/s vs Kling
- Wan fails on subject fidelity or motion → render Kling; document the failure pattern in `.auto-memory/`

**A/B prompt (same prompt, both models):**
```
Luxury kitchen with waterfall island and Sub-Zero refrigerator, morning light, camera very slow push-in toward the island, light shifts subtly across the stone countertop, no people, architectural photography style, sharp focus, no motion blur
```
**QA check:** Does the countertop material hold consistent texture? Does the camera move feel intentional or drift? Wan 2.5 should pass on static subjects; may fail on reflective surfaces. Document results.

---

## Common failure modes

| Failure | Cause | Fix |
|---------|-------|-----|
| Subject identity drift mid-clip | Duration too long (10s) or complex multi-element scene | Drop to 5s; simplify the scene — one focal subject |
| Camera jitter / handheld artifact | Prompt doesn't specify smooth camera move | Add explicit "camera holds perfectly still" or "smooth dolly" + add `camera shake` to negative prompt |
| Reflective surface flickering | Wan handles speculars inconsistently | Use Kling for scenes with large glass, polished marble, or water reflections |
| Overexposed windows / interior too dark | Real estate photo with high dynamic range | Pre-process the source image with Lightroom before ingest; Wan does not correct exposure |
| Audio desync (when using audio feature) | Frontal angle not maintained; subject turns away | Use frontal-facing source image; specify "subject faces camera" in prompt |
| Motion too subtle to read on muted feed | Wan defaults to conservative motion amplitude | Add explicit motion magnitude: "visibly ripples," "leaves sway noticeably," "light shifts distinctly" |
| Aspect ratio crop artifacts | Feeding a landscape photo into 9:16 | Pre-crop source image to 9:16 before ingest — do not rely on model to reframe |

---

## Output format

- **Container:** MP4 (H.264)
- **Frame rate:** 16 fps native; post-process with ffmpeg to 30 fps for Remotion compatibility if needed: `ffmpeg -i input.mp4 -vf fps=30 output.mp4`
- **Audio:** AAC stereo when audio generation is enabled; silent track otherwise
- **Resolution:** Matches `resolution` parameter (480p / 720p / 1080p)
- **Duration:** Matches `duration` parameter (5s or 10s)
- **Delivery:** Replicate returns a URL to the output file; download via `wget` or `requests.get()`

**Remotion integration note:** Wan 2.5 output at 16 fps will show slight motion stuttering inside a 30 fps Remotion composition. Always transcode to 30 fps before bringing into the Remotion pipeline.

---

## Fallback

**If Replicate is down or returns 429/503:**
1. **fal.ai Wan i2v** (`fal-ai/wan-i2v`) — same model family, different host. Note: fal.ai balance may be dry; check `API_INVENTORY.md` before routing.
2. **Atlas Cloud Wan 2.5** (`atlascloud.ai/collections/wan2.5`) — unified API, competitive pricing at $0.018/s for Flash tier.
3. **Self-hosted** (H100 80GB required for 720p; H200 for 1080p) — weights at `Wan-AI/Wan2.5-I2V` on HuggingFace. Only viable if Replicate is down for an extended window.
4. **Escalate to Kling via Replicate** (`kling-ai/kling-video`) — costs 4× more, but available when Wan is degraded and the clip must ship.

**Do not queue more than 5 concurrent Wan 2.5 predictions on Replicate** — cold-start latency spikes under heavy load; stagger with 30s delays between batch submissions.

---

## Sources

- [Replicate Wan 2.5 i2v model page](https://replicate.com/wan-video/wan-2.5-i2v)
- [Replicate Wan video collection](https://replicate.com/collections/wan-video)
- [Replicate hardware pricing](https://replicate.com/pricing)
- [AI/ML API — Wan 2.5 preview i2v parameters](https://docs.aimlapi.com/api-references/video-models/alibaba-cloud/wan-2.5-preview-image-to-video)
- [Atlas Cloud i2v model comparison guide 2026](https://www.atlascloud.ai/blog/guides/ai-image-to-video-models-compared)
- [Pixazo 2026 model comparison — Wan 2.5 vs Kling 2.6 vs Hailuo 2.3 vs Seedance Pro](https://www.pixazo.ai/blog/veo-3-1-vs-sora-2-pro-vs-kling-2-6-vs-wan-2-5-vs-hailuo-2-3-vs-ltx-2-pro-vs-seedance-pro)
- [Spheron GPU cost analysis — Wan 2.2 I2V on H100](https://www.spheron.network/blog/image-to-video-gpu-cloud-ltx-wan-hunyuan/)
- [Promptus — Wan 2.5 prompt guide](https://www.promptus.ai/blog/wan-2-5-prompt-guide)
- [Segmind — Wan i2v prompts guide 2026](https://blog.segmind.com/wan-i2v-prompts-tips-guide/)
- [aifreeapi — MiniMax vs Kling vs Wan vs Veo vs Seedance comparison](https://www.aifreeapi.com/en/posts/minimax-vs-kling-vs-wan-vs-veo-vs-seedance)
