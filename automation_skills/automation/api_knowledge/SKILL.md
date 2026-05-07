---
name: api_knowledge
description: Tool router for all external AI and publishing API calls in Ryan Realty's content engine. Use when any skill needs to generate a video, generate an image, synthesize voice, transcribe audio, run a talking-head avatar, score content, publish to a social platform, or pull MLS data. Covers Replicate (Kling v2.1 Master, Hailuo 02, Seedance 1 Pro, Luma Ray 2, Wan 2.5, Veo 3), Vertex AI (Veo 3, Imagen 4 → Gemini Flash Image, Gemini 2.5 Flash/Pro), ElevenLabs (Victoria VO, forced-alignment captions), Synthesia (avatar video), Grok Imagine (image + video), fal.ai (Kling v3 Pro, Seedance 2.0, Foley), OpenAI (embeddings, photo classification), and publishing APIs (Meta Graph, TikTok, YouTube, LinkedIn, X, Pinterest, Threads, GBP, Buffer). NOT for listing-specific rendering (use listing_reveal) or post queue management (use post_scheduler).
when_to_use: Triggered by phrases: "generate a video", "create an image", "synthesize voice", "publish to Instagram/TikTok/YouTube/LinkedIn", "transcribe audio", "talking head avatar", "market data pull", "MLS listings", "which API should I use", "Replicate vs Vertex", "choose a model", "caption timestamps", "A/B thumbnail grid", "social publishing", "GBP post", "Pinterest", "Buffer".
---

# API Knowledge Router

## Purpose

Single lookup point before any external API call. Identifies the correct tool for a given generation or publishing intent, flags current blockers, and links to the validated per-tool reference doc. Keeps other skills from hard-coding model choices that drift with pricing and availability.

## How to use this skill

1. Identify the intent from the table below.
2. Load the reference doc listed in the "Reference doc" column — do this on-demand, only when needed.
3. Follow the auth, input, and webhook patterns in that doc.
4. On failure, try the tool listed in "Fallback" before escalating.
5. After any run, persist output to Supabase Storage immediately — Replicate URLs expire in 1 hour.

---

## Intent → Tool routing matrix

| Intent | First choice | Env var | Reference doc | Fallback |
|---|---|---|---|---|
| Hero i2v — luxury listing ($800K+), cinematic camera move required | Replicate Kling v2.1 Master | `REPLICATE_API_TOKEN` | `replicate/kling-v2-1-master.md` | Vertex Veo 3.1 Fast |
| i2v — mid-range listing, micro-motion, budget batch | Replicate Hailuo 02 | `REPLICATE_API_TOKEN` | `replicate/hailuo-02.md` | Replicate Seedance 1 Pro |
| i2v — named camera move required (dolly, orbit, crane) | Replicate Seedance 1 Pro | `REPLICATE_API_TOKEN` | `replicate/seedance-1-pro.md` | Replicate Kling v2.1 Master |
| i2v — premium atmospheric/lighting hero shot for luxury | Replicate Luma Ray 2 | `REPLICATE_API_TOKEN` | `replicate/luma-ray-2.md` | Replicate Kling v2.1 Master |
| i2v — high-volume batch (1000+/mo), open-source OK | Replicate Wan 2.5 | `REPLICATE_API_TOKEN` | `replicate/wan-2-5.md` | Replicate Hailuo 02 |
| Text-to-video with native synced audio | Vertex Veo 3.1 Fast | `GOOGLE_APPLICATION_CREDENTIALS` | `vertex/veo-3.md` | Replicate Veo 3 (same price, simpler auth) |
| Text-to-video, B-roll, budget iteration ($0.42/6s) | Grok Imagine video | xAI key (not provisioned — surface to Matt) | `grok/imagine.md` | Replicate Hailuo 02 |
| Talking-head avatar presenter (weekly market pulse) | Synthesia | `SYNTHESIA_API_KEY` | `synthesia/synthesia.md` | ElevenLabs VO + photo b-roll |
| VO narration — all video production | ElevenLabs Victoria | `ELEVENLABS_API_KEY` | `elevenlabs/victoria.md` | No fallback — Victoria is locked |
| Caption timestamps / forced alignment | ElevenLabs forced-alignment | `ELEVENLABS_API_KEY` | `elevenlabs/victoria.md` §Forced alignment | n/a |
| Brand-locked thumbnail, brand-hex color fidelity | Vertex Imagen 4 Standard (until June 30 2026) | `GOOGLE_APPLICATION_CREDENTIALS` | `vertex/imagen-4.md` | Grok Imagine quality ($0.07) |
| A/B thumbnail grid — cheap iteration (10 variants) | Grok Imagine image ($0.02/img) | xAI key (surface to Matt) | `grok/imagine.md` | Flux Schnell via Replicate |
| Depth parallax / depth map from photo | Replicate (Depth Anything v2) | `REPLICATE_API_TOKEN` | `replicate/platform.md` §Model versioning | n/a |
| Bulk text synthesis — caption variants, scoring, classification | Vertex Gemini 2.5 Flash | `GOOGLE_APPLICATION_CREDENTIALS` | `vertex/gemini-2-5.md` | Claude Haiku |
| Long-context research synthesis (>200K tokens) | Vertex Gemini 2.5 Flash or Pro | `GOOGLE_APPLICATION_CREDENTIALS` | `vertex/gemini-2-5.md` | Claude Sonnet (10× cost) |
| Photo classification, listing embeddings | OpenAI (`gpt-4o` vision, `text-embedding-3-small`) | `OPENAI_API_KEY` | `openai/openai.md` | Gemini 2.5 Flash vision |
| MLS active inventory, DOM, real-time status | Spark API (SparkQL v1) | `SPARK_API_KEY` | `mls/spark.md` | Supabase `listings` table |
| Historical close data (reconciled) | Supabase `listings` | Supabase service key | CLAUDE.md §Supabase schema | n/a |
| Publish to Instagram / Facebook / Threads | Meta Graph API v25.0 | `META_ACCESS_TOKEN` (**EXPIRED**) | `publishing/meta-graph.md` | Buffer (if token unavailable) |
| Publish to TikTok | TikTok Content Posting API v2 | `TIKTOK_ACCESS_TOKEN` | `publishing/tiktok.md` | Manual — app may be unaudited |
| Publish to YouTube | YouTube Data API v3 | `YOUTUBE_CLIENT_ID/SECRET` | `publishing/youtube.md` | n/a |
| Publish to LinkedIn | LinkedIn Marketing API | `LINKEDIN_CLIENT_ID/SECRET` | `publishing/linkedin.md` | n/a |
| Publish to X / Twitter | X API v2 | `X_ACCESS_TOKEN` | `publishing/supporting-platforms.md` | n/a |
| Publish to Pinterest / GBP | Pinterest / Google Business Profile | See supporting-platforms.md | `publishing/supporting-platforms.md` | n/a |
| Multi-platform fan-out (scheduling fallback) | Buffer v1 API | `BUFFER_ACCESS_TOKEN` | `publishing/buffer.md` | Native per-platform APIs |
| Video-to-audio Foley (SFX sync) | fal.ai Foley Control | `FAL_KEY` (**balance dry — top up**) | `fal/fal-ai.md` | Manual post-mix in ffmpeg |

---

## Hard constraints

- **ElevenLabs Victoria voice ID `qSeXEcewz7tA0Q0qk9fH` is locked.** No exceptions. Model: `eleven_turbo_v2_5`. Settings: stability 0.50, similarity 0.75, style 0.35, speaker boost true.
- **Replicate output URLs expire in 1 hour.** Fetch and persist to Supabase Storage (`v5_library` bucket) inside the webhook handler before returning 200.
- **Meta Page token is LIVE** (verified 2026-05-06 against Graph API v25.0): never-expires long-lived Page token, 19 active scopes including `pages_manage_posts`, `instagram_content_publish`, `pages_manage_engagement`. IG/FB are publish-ready. Threads requires its OWN OAuth at `graph.threads.net` (separate from Meta Graph despite the `threads_business_basic` scope on the Page token).
- **TikTok / Pinterest / Threads tokens not yet connected** — `*_auth` Supabase rows empty. First-time OAuth at `/api/<platform>/authorize` before publishing. TikTok additionally needs app audit-status verification (unaudited apps force `SELF_ONLY` on Direct Posts).
- **fal.ai balance dry as of 2026-04-27.** Top up `FAL_KEY` account before routing any job there. Until topped up, route fal-exclusive models (Kling v3 Pro, Seedance 2.0) to Replicate equivalents.
- **Imagen 4 / `@google-cloud/vertexai` EOL: 2026-06-30.** Migrate Imagen 4 calls to `gemini-2.5-flash-image` via `@google/genai` before that date. See `vertex/imagen-4.md` §Migration path.
- **Veo 3.0 EOL: 2026-06-30.** Use `veo-3.1-generate-001` / `veo-3.1-fast-generate-001` now.
- **Pin Replicate version hashes in production.** Never use versionless slugs for content-engine models. Track current hashes in `video_production_skills/API_INVENTORY.md`.

---

## Cost-aware routing

- **Default synthesis (captions, scoring, classification):** Gemini 2.5 Flash — $0.30/$2.50 per MTok, 10× cheaper than Claude Sonnet. Batch mode saves 50% for non-time-sensitive jobs.
- **Architecture, final code review, complex debugging:** Claude Sonnet (kept on Opus/Sonnet per CLAUDE.md orchestrator policy).
- **Image generation — brand accuracy:** Imagen 4 Standard ($0.04/img). **Cheap iteration:** Grok Imagine ($0.02/img) or Flux Schnell ($0.003/img).
- **Video generation — premium:** Kling v2.1 Master (~$0.80/5s clip). **Budget:** Hailuo 02 (~$0.23/6s) or Seedance 1 Pro (~$0.74/run).
- **VO:** ElevenLabs only. No Vertex TTS. No OpenAI TTS.

---

## Failure handling

1. **Tool returns HTTP 429 (rate limit):** exponential backoff starting at 5s. Cap at 3 retries.
2. **Tool returns HTTP 402 (out of credits):** surface to Matt. Do not route to fallback without telling Matt the cost implication.
3. **Tool returns HTTP 5xx:** retry once after 5s. If still failing, route to the listed fallback.
4. **Replicate webhook never fires:** sweep `video_jobs` where `status = 'pending'` and `created_at < now() - 30 min`. Poll `GET /v1/predictions/{id}` directly. Process any succeeded ones.
5. **Vertex GCS write fails silently:** check service account has `roles/storage.objectCreator` on the output bucket before any Veo run.
6. **Meta token returns 190 / OAuthException:** the long-lived Page token has been invalidated (rare — never-expires by default but can be revoked manually or by app permission change). Stop IG/FB publishing, follow `publishing/meta-graph.md` §Token refresh (the two-step exchange), test with `/me?fields=id,name` before re-enabling.

---

## When to update this router

- A new model launches on Replicate, Vertex, or fal.ai.
- Pricing changes materially (>20% shift on a frequently-used model).
- A publishing API deprecates an endpoint or requires an API version bump.
- A new social platform is added to the content engine.
- The fal.ai balance is topped up (remove the "balance dry" flag on the fal row).
- A platform OAuth gets connected for the first time (TikTok, Pinterest, Threads — these auth rows currently empty in Supabase).
- A platform token is invalidated and must be refreshed (Meta Page tokens are never-expires by default but can be manually revoked).

---

## Sibling reference docs (load on demand — not all at once)

All paths are relative to `automation_skills/automation/api_knowledge/`.

| Doc | Summary |
|---|---|
| `replicate/platform.md` | Auth, async patterns, webhook HMAC verification, 1-hour URL expiry, rate limits, error codes |
| `replicate/kling-v2-1-master.md` | i2v for luxury listing reels; camera choreography; ~$0.80/5s clip |
| `replicate/hailuo-02.md` | i2v micro-motion batch; ~$0.23/6s clip |
| `replicate/seedance-1-pro.md` | Named camera-move tokens; ~$0.74/run |
| `replicate/luma-ray-2.md` | Atmospheric lighting hero shots; ~$0.50–$2.00/clip |
| `replicate/wan-2-5.md` | High-volume batch i2v; open-source weights |
| `replicate/veo-3.md` | Veo 3 via Replicate pass-through (same price as Vertex direct) |
| `vertex/veo-3.md` | Veo 3.1 direct; GCS output; $0.15/s Fast; 50 RPM; i2v + t2v with audio |
| `vertex/imagen-4.md` | Text-to-image; brand-hex fidelity; EOL June 30 2026; migration to Gemini Flash Image |
| `vertex/gemini-2-5.md` | Gemini 2.5 Flash/Pro for bulk synthesis; $0.30/$2.50 MTok; 1M context |
| `elevenlabs/victoria.md` | Victoria VO settings; phoneme IPA library; forced-alignment pattern; number spelling |
| `synthesia/synthesia.md` | Avatar video for recurring presenter; API endpoints; AI disclosure requirement |
| `grok/imagine.md` | xAI image ($0.02) + video ($0.05–$0.07/s) with native audio; 720p max |
| `fal/fal-ai.md` | Speed-first platform; exclusive: Kling v3 Pro, Seedance 2.0, Foley Control; balance dry |
| `openai/openai.md` | `text-embedding-3-small` for listing search; `gpt-4o` photo classification |
| `publishing/meta-graph.md` | IG + FB + Threads; token EXPIRED; v22 → v25 API version migration needed |
| `publishing/tiktok.md` | Direct post + chunked upload; audit status check before public posting |
| `publishing/youtube.md` | Resumable upload; missing: thumbnail, scheduled publish, playlist |
| `publishing/linkedin.md` | LinkedIn share scopes reality-check; video + image post flow |
| `publishing/buffer.md` | Legacy v1 API (no new apps); multi-platform fan-out fallback |
| `publishing/supporting-platforms.md` | X, Pinterest, Threads, Google Business Profile endpoints |
| `mls/spark.md` | Spark API auth; SparkQL v1 vs OData v3; active inventory + DOM; Supabase reconciliation gate |
