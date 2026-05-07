# Tool: Buffer API

**Research date:** 2026-05-06  
**Sources:** Buffer developer docs (developers.buffer.com), Buffer Help Center, Buffer pricing page, TikTok Content Posting API docs, Meta Graph API docs, postproxy.dev developer analysis

---

## Current API Status (Critical Context)

Buffer's API situation is fragmented across two distinct APIs:

**v1 REST API (legacy):** Deprecated 2019. Base URL `https://api.bufferapp.com/1/`. Still documented at buffer.com/developers/api. Auth: OAuth Bearer token (`Authorization: Bearer <ACCESS_TOKEN>`). Rate limit: **60 req/min per access token**. This is what `automation_skills/automation/buffer_poster/SKILL.md` describes — it still works for existing connected accounts but Buffer is no longer accepting new OAuth app registrations.

**v2 GraphQL API (new, beta):** Announced July 2025. Base URL `https://api.buffer.com`. Auth: personal API key (Bearer). Currently **beta / early access only** — not publicly available on a self-serve basis. No published rate limits. No published SLA. No GA timeline confirmed as of 2026-05-06. The old v1 SDK (`@bufferapp/api`, last release 2019) is not compatible with v2.

**Practical implication for Ryan Realty:** The `BUFFER_ACCESS_TOKEN` env var in `.env.local` and `.env.example` targets the v1 REST API. That token works for connected accounts but cannot be obtained for new third-party apps — Buffer no longer creates new developer apps. If the existing token were revoked, re-obtaining it through OAuth would require Buffer to whitelist a new app, which they currently don't do. For automation built today, plan for native API fallback.

---

## What Buffer Adds (vs Direct Native APIs)

| Capability | Detail |
|---|---|
| Single endpoint for all platforms | One POST to `/updates/create.json` (v1) or one GraphQL mutation (v2) fans out to multiple channels |
| Built-in scheduling queue | Calendar-based scheduling UI; posts queue up and drain on schedule without cron management per platform |
| Cross-post fan-out | Send same asset to 8+ platforms in one API call; Buffer handles per-platform delivery |
| Human review UI | Buffer's web dashboard gives Matt a visual queue to approve/edit/reorder before posts fire |
| Analytics aggregation | Rolled-up engagement across platforms in one dashboard (Essentials+) |
| Asset resize routing | Buffer handles transcoding/resizing to per-platform specs internally (with caveats — see below) |
| Team approval workflow | Drafts → approvals → publish without sharing platform credentials (Team plan only) |

---

## What Buffer Takes Away (vs Native APIs)

### Platform-specific fields Buffer cannot pass through

**TikTok gaps (confirmed via TikTok Content Posting API docs):**
- `privacy_level` — required by TikTok native API (`PUBLIC_TO_EVERYONE` / `MUTUAL_FOLLOW_FRIENDS` / `FOLLOWER_OF_CREATOR` / `SELF_ONLY`). Buffer does not expose this; defaults to whatever TikTok assigns.
- `video_cover_timestamp_ms` — frame-level thumbnail selection. Not exposed in Buffer. Users get TikTok's auto-selected cover.
- `disable_duet` / `disable_stitch` / `disable_comment` — interaction controls. Not exposed in Buffer.
- `brand_content_toggle` / `brand_organic_toggle` — paid partnership / own-brand disclosure. Not in Buffer.
- `is_aigc` — AI-generated content flag (required disclosure in some markets). Not in Buffer.
- TikTok music/audio library — API limitation; no third-party tool including Buffer can add TikTok native audio. Must bake audio into video file before upload.
- TikTok polls and stickers — in-app only; API does not expose. Buffer inherits this gap.
- Caption line-break formatting — Buffer's TikTok caption field does not preserve line breaks natively.
- Maximum 5 hashtags enforced by Buffer (TikTok allows more through native app).
- Buffer TikTok daily limit: 25 posts per 24 hours.
- TikTok "best time to post" analytics: not available in Buffer.
- TikTok engagement features (comment reply, community inbox): not available in Buffer.

**Instagram gaps (confirmed via Meta Graph API docs and Buffer Help Center):**
- `cover_url` for Reels — the native Graph API lets you specify a custom cover image URL for a Reel. Buffer does not expose this; cover is auto-selected from the video.
- `share_to_feed` — Reels can be set to appear in feed, not feed, or both. Buffer does not expose this flag.
- Instagram Stories — Buffer supports Stories scheduling but requires each image/video as a separate scheduled post (no batch story sequence). Stickers, polls, links, and story music require notification-based publishing (manual completion in app).
- Carousel mixed media — Buffer cannot post carousels that mix images and video in the same carousel post.
- Carousel max — Buffer enforces 10-image max per carousel (Instagram's API limit); native app allows up to 20.
- Collab posts — cannot be scheduled via Buffer. Native app required.
- Trending music on Reels — API limitation. No third-party tool (including Buffer) can add IG-native music. Bake audio into the video file.
- User tagging in images — supported for auto-published posts only, not notification-based.
- `firstComment` via API — documented as not persisted in Buffer's v2 GraphQL roadmap (works for Facebook/LinkedIn but not Instagram).
- Location tagging — not documented as available via Buffer API.
- Personal Instagram accounts — notification-based publishing only. No auto-publish.

**Facebook gaps:**
- Facebook Reels chunked upload — required for large Reel files; Buffer handles this internally but without control over `rupload.facebook.com` parameters.
- Fine-grain `scheduled_publish_time` — Buffer's scheduling rounds to Buffer's own queue windows, not arbitrary second-precision times.
- Facebook Stories — not clearly supported for auto-publish.

**LinkedIn gaps:**
- Org vs. personal post control — limited; Buffer does not always distinguish between LinkedIn personal and org page targeting.
- LinkedIn document posts (PDF carousels) — available on Essentials+ but not via API.
- User tagging in LinkedIn posts — not supported via Buffer API.
- LinkedIn article posts — not supported via Buffer.

**YouTube gaps:**
- YouTube Shorts vs. YouTube long-form — Buffer routes both through the same channel ID. Need explicit `youtube_shorts` vs `youtube` platform designation in the queue to differentiate.
- `notify_subscribers` flag — not exposed in Buffer.
- YouTube chapter markers, cards, end screens — post-publish only, not schedulable.

**Pinterest gaps (confirmed in Buffer v2 roadmap as known bug):**
- Destination URL field is silently dropped when creating Pinterest posts via Buffer v2 API. This is a documented bug (roadmap item, status "released" meaning acknowledged). The URL is not posted. Pins created via Buffer API have no destination link until fixed.

**Cross-platform:**
- Latest platform features: Buffer typically adds support 2–4 weeks after platforms ship new API parameters. High-velocity feature releases (TikTok, IG) create a lag window.
- Analytics via API: v2 explicitly states "analytics data is not available via the API." Only post creation and idea management.
- Edit mutations: Buffer v2 has no update mutation — editing a queued post requires delete + recreate.
- Story-specific posting: feed-only for most platforms. Stories require separate handling.
- `addToQueue` share mode: documented as not supported in v2 (roadmap item).

---

## Auth + Endpoints (Verified 2026-05-06)

### v1 REST API (active for existing tokens)
```
Base URL: https://api.bufferapp.com/1/
Auth:     Authorization: Bearer <BUFFER_ACCESS_TOKEN>
Format:   Content-Type: application/x-www-form-urlencoded
Response: JSON only
```

| Endpoint | Method | Use |
|---|---|---|
| `/profiles.json` | GET | List connected channel IDs and service names |
| `/updates/create.json` | POST | Schedule or publish a post (multipart for media) |
| `/updates/<id>.json` | GET | Read status, sent_at, service_update_id |
| `/updates/<id>/update.json` | POST | Edit text/scheduled_at on a queued post |
| `/updates/<id>/destroy.json` | POST | Cancel a scheduled post |

Rate limit: **60 req/min per access token**. Returns HTTP 429 on exceed.

### v2 GraphQL API (beta — early access only)
```
Base URL: https://api.buffer.com
Auth:     Authorization: Bearer <API_KEY>  (personal API key, not OAuth)
Protocol: GraphQL
```

Key GraphQL operations available (beta):
- `createPost` — create draft or scheduled post
- `deletePost` — delete a post
- `posts(...)` — query posts with filtering and cursor pagination
- `channels(...)` — query connected channels
- `createIdea` — create an idea (text + image only)
- `organizations(...)` — query org info

Not available in v2 API: analytics queries, engagement metrics, edit/update mutation (delete + recreate required), `addToQueue` mode.

**API keys:** Generated at `publish.buffer.com/settings/api`. Expiry configurable: 7 / 30 / 60 / 90 days or 1 year. Only organization owners can generate keys. Keys are personal (user-scoped), not org-scoped.
- Free: 1 API key
- Essentials: up to 5 API keys  
- Team: up to 5 API keys

**OAuth (third-party apps):** Buffer is not accepting new developer app registrations as of 2026-05-06. Existing OAuth apps (including any using `BUFFER_ACCESS_TOKEN` from the v1 era) continue to work. New integrations that need to post on behalf of other users cannot use Buffer OAuth.

---

## Pricing (Verified 2026-05-06 against buffer.com/pricing)

Buffer restructured pricing in December 2025, eliminating the legacy Agency tier. Three plans:

| Plan | Monthly (mo-to-mo) | Monthly (annual billing) | Channels | Queue/channel | Users | API keys |
|---|---|---|---|---|---|---|
| **Free** | $0 | $0 | 3 max | 10 posts | 1 | 1 |
| **Essentials** | $6/ch (ch 1–10), ~$2/ch (ch 11–25) | $5/ch (ch 1–10), ~$1.67/ch (ch 11–25) | Unlimited | 5,000 (fair use) | 1 | 5 |
| **Team** | $12/ch (ch 1–10), ~$4/ch (ch 11–25) | $10/ch (ch 1–10), ~$3.33/ch (ch 11–25) | Unlimited | 5,000 (fair use) | Unlimited | 5 |

**Volume discount structure (December 2025 restructure):** Channels 1–10 at standard rate. Channels 11–25 at ~$3.33/mo (Team, annual). No separate Agency tier.

**Fair use at 5,000/channel:** Requires ~66 posts/day to a single channel. Practically unlimited for Ryan Realty volumes.

**For Ryan Realty at 8 platforms (IG, FB, TikTok, YT, LinkedIn, X, Pinterest, Threads):**
- Free: hard stop at 3 channels — does not cover 8 platforms.
- Essentials annual: 8 channels × $5/mo = **$40/mo** ($480/yr). Covers scheduling, analytics, hashtag manager, first comment, API access. No team approval workflow.
- Team annual: 8 channels × $10/mo = **$80/mo** ($960/yr). Adds approval workflow, branded reports, unlimited collaborators.

**Current tier unknown** — needs verification against Matt's Buffer account. The `BUFFER_ACCESS_TOKEN` in `.env.local` suggests an account exists; check `buffer.com/manage` for current plan.

---

## Decision Tree: Buffer vs Native

```
Does the post need platform-specific fields?
├── YES → Use native API
│   ├── TikTok: privacy_level, cover_timestamp, duet/stitch controls, brand_content, is_aigc
│   ├── Instagram: custom Reel cover_url, share_to_feed, mixed carousel, Collab post
│   ├── Pinterest: destination URL (Buffer silently drops this — known bug)
│   └── LinkedIn: document posts, user tagging
│
└── NO → Does the post need Story format?
    ├── YES → Use native API (Buffer Stories = notification-only for most platforms)
    │
    └── NO → Is this a cross-post to 4+ platforms with same/similar caption?
        ├── YES → Use Buffer (v1 REST, existing token)
        │   └── Is it a high-volume automation (>60 API calls/min)?
        │       ├── YES → Use native (Buffer rate limit is 60/min)
        │       └── NO → Buffer is fine
        │
        └── NO → Is it 1–2 platforms?
            ├── YES → Use native API (skip Buffer's indirection)
            └── NO → Buffer for scheduling convenience
```

**Concrete rule for the content engine:**

- **Buffer (v1 REST, `BUFFER_ACCESS_TOKEN`):** Standard cross-posts where caption is the same or adapted across 5+ platforms and no platform-specific parameters are needed. Example: market update video posted to IG Reels, FB, LinkedIn, TikTok, X, Threads simultaneously with the same caption block. Use for human-review-gated posts where Matt wants to see the queue before it fires.

- **Native APIs:** Any post requiring TikTok `privacy_level`, IG custom cover, Pinterest destination URL, Instagram Stories, carousel mixed media, or Facebook Reels chunked upload with precise timing. Also use native when Buffer's v1 token is unavailable (e.g., token revoked, new platform added that isn't in the existing Buffer account).

- **Fallback rule (from `SKILL.md`):** If Buffer returns 5xx for >10 min, native `post_scheduler` takes over for IG/FB/TikTok/YouTube/LinkedIn. X/Pinterest/Threads remain queued (no native fallback built yet).

---

## Recommended Pattern for Ryan Realty Content Engine

```
Content type → Publisher decision
─────────────────────────────────────────────────────
Market update video (standard 6-platform drop)  → Buffer (cross-post fan-out)
Listing reveal reel                              → Native IG (need cover_url control)
TikTok content with privacy/duet/stitch control → Native TikTok
Pinterest property pin (needs destination URL)  → Native Pinterest (Buffer drops URL)
Instagram Story sequence                        → Native IG (Buffer can't batch stories)
LinkedIn document post (PDF carousel)           → Native LinkedIn
High-volume batch (>60 API calls/min)           → Native (Buffer rate-limited)
Human-review queue (Matt approves before fire)  → Buffer (queue UI)
```

---

## Worked Examples

### 1. Cross-post a market data video to 6 platforms via Buffer (v1 REST)

```python
import os, requests

TOKEN = os.environ["BUFFER_ACCESS_TOKEN"]
PROFILES = {
    "instagram": os.environ["BUFFER_PROFILE_INSTAGRAM"],
    "facebook":  os.environ["BUFFER_PROFILE_FACEBOOK"],
    "tiktok":    os.environ["BUFFER_PROFILE_TIKTOK"],
    "linkedin":  os.environ["BUFFER_PROFILE_LINKEDIN"],
    "x":         os.environ["BUFFER_PROFILE_X"],
    "threads":   os.environ["BUFFER_PROFILE_THREADS"],
}

payload = {
    "text": "Central Oregon median hit $507K in April. Here's what it means.",
    "media[video]": "https://cdn.ryan-realty.com/market-april-2026.mp4",
    "profile_ids[]": list(PROFILES.values()),
    "scheduled_at": "2026-05-07T09:00:00+00:00",
}

resp = requests.post(
    "https://api.bufferapp.com/1/updates/create.json",
    headers={"Authorization": f"Bearer {TOKEN}"},
    data=payload,
)
# Returns: {"success": true, "updates": [...], "buffer_count": 6, "already_sent": 0}
# Each update in the list has: id (buffer_update_id), profile_id, status, scheduled_at
```

Write each `update.id` back to `post_queue_dispatch.buffer_update_id` for status tracking.

### 2. Native Instagram Reel with custom cover_url (Buffer cannot do this)

```python
import os, requests

IG_USER_ID = os.environ["INSTAGRAM_USER_ID"]
ACCESS_TOKEN = os.environ["META_ACCESS_TOKEN"]

# Step 1: Create Reel container with custom cover
container = requests.post(
    f"https://graph.instagram.com/v21.0/{IG_USER_ID}/media",
    data={
        "media_type": "REELS",
        "video_url": "https://cdn.ryan-realty.com/listing-123.mp4",
        "cover_url": "https://cdn.ryan-realty.com/listing-123-cover.jpg",  # Buffer cannot set this
        "share_to_feed": "true",           # Buffer cannot set this
        "caption": "Just listed: 47832 Cascade Ct. 4 beds. $895K.",
        "access_token": ACCESS_TOKEN,
    }
).json()
creation_id = container["id"]

# Step 2: Publish (after video processing — poll container status first)
publish = requests.post(
    f"https://graph.instagram.com/v21.0/{IG_USER_ID}/media_publish",
    data={
        "creation_id": creation_id,
        "access_token": ACCESS_TOKEN,
    }
).json()
# Returns: {"id": "<ig_media_id>"}
```

### 3. Schedule a post for Tuesday 9am via Buffer's calendar (v1 REST)

```python
import os, requests
from datetime import datetime, timezone

TOKEN = os.environ["BUFFER_ACCESS_TOKEN"]
PROFILE_ID = os.environ["BUFFER_PROFILE_INSTAGRAM"]

# Tuesday May 12 2026 9:00 AM Pacific = 16:00 UTC
scheduled_at = datetime(2026, 5, 12, 16, 0, 0, tzinfo=timezone.utc).isoformat()

resp = requests.post(
    "https://api.bufferapp.com/1/updates/create.json",
    headers={"Authorization": f"Bearer {TOKEN}"},
    data={
        "text": "Market update dropping Tuesday.",
        "media[photo]": "https://cdn.ryan-realty.com/market-thumb.jpg",
        "profile_ids[]": PROFILE_ID,
        "scheduled_at": scheduled_at,
    }
)
data = resp.json()
# data["updates"][0]["id"] → buffer_update_id for status polling
# data["updates"][0]["scheduled_at"] → confirmed schedule time
```

---

## Common Failure Modes

| Failure | Detection | Recovery |
|---|---|---|
| Buffer token expired / revoked | `401 Unauthorized` | All pending Buffer rows → `pending_token_refresh`. Alert Matt. Re-auth not possible for new apps — fall back to native. |
| Profile disconnected | `403 profile id does not exist or disabled` | Mark platform dispatch `disconnected`. Continue other platforms. Alert Matt to reconnect in Buffer UI. |
| Asset rejected (spec violation) | `400 The media is not a supported file type` | Run `asset_resize.ts`, retry once. Escalate if still failing. |
| Pinterest URL silently dropped | No error — post succeeds but has no link | Known v2 bug. For Pinterest posts requiring destination URLs, bypass Buffer, use Pinterest API directly. |
| Buffer service down | 5xx for >10 min | Failover to native `post_scheduler` for IG/FB/TikTok/YouTube/LinkedIn. X/Pinterest/Threads queued pending Buffer recovery. |
| Free tier queue full | `400` or silent drop when >10 posts queued | Upgrade plan or drain queue. Free tier hard caps at 10/channel. |
| TikTok 25/day limit | `429` or post rejection | Buffer enforces a 25-post/24h TikTok limit. Native TikTok API limit is higher. |
| Buffer v2 API key expired | `401` on GraphQL calls | Keys have configurable expiry (max 1 year). Rotate at `publish.buffer.com/settings/api`. |
| Cloudflare block on VPS | Connection timeout / `403` from Cloudflare | Known v2 issue. Use residential IP / Vercel edge function rather than VPS. The cron route on Vercel avoids this. |
| Duplicate detection blocks post | `400` or silent rejection | Buffer's v2 duplicate detection can block posts even after the original draft is deleted. Wait 24h or modify text slightly. |

---

## Output Format

Successful post via v1 REST:
```json
{
  "success": true,
  "buffer_count": 6,
  "updates": [
    {
      "id": "buf_update_abc123",
      "profile_id": "buf_profile_ig_xyz",
      "status": "buffer",
      "scheduled_at": 1746615600,
      "service_link": null,
      "sent_at": null
    }
  ]
}
```

After post sends, poll `/updates/<id>.json` to get `service_link` (the platform-side URL) and `sent_at`. Write both to `post_queue_dispatch.buffer_update_id` and `post_queue.published_at`.

---

## Open Issues in Current Skill Implementation

1. **SKILL.md references `https://api.bufferapp.com/2/`** — the actual v1 base URL is `/1/`, not `/2/`. The v2 GraphQL base URL is `https://api.buffer.com` (no path version). Fix the base URL references before implementation.

2. **Pinterest destination URL bug** — the roadmap confirms URLs are silently dropped in v2 GraphQL. For Ryan Realty Pinterest pins (property links), do not route through Buffer v2. Use Pinterest API directly or v1 REST only.

3. **OAuth dead end** — SKILL.md describes getting a "long-lived OAuth token from buffer.com/oauth." Buffer no longer accepts new OAuth app registrations. The `BUFFER_ACCESS_TOKEN` in env must be the pre-existing v1 personal access token. Document this clearly in `docs/setup/buffer-oauth.md` so it's not attempted as a fresh OAuth flow.

4. **TikTok `privacy_level` gap** — SKILL.md does not mention this gap. Any TikTok posts routed through Buffer will default `privacy_level` to whatever TikTok assigns. For branded listing content, this is likely acceptable (`PUBLIC_TO_EVERYONE`), but for test/draft posts meant to be private, Buffer will publish them publicly. Add a gate in the worker.

5. **Current tier verification needed** — cannot determine Ryan Realty's current Buffer plan from env vars alone. Check `buffer.com/manage` or call `GET /profiles.json` and inspect channel count; if >3 channels are connected, the account is on a paid plan.

---

## Key Findings Summary

- **Buffer v1 REST API** is the operative API for the existing `BUFFER_ACCESS_TOKEN` — it works, is stable, rate-limited at 60 req/min, and covers all 8 platforms for standard cross-posting.
- **Buffer v2 GraphQL** is beta-only, not for production use as of 2026-05-06. The SKILL.md base URL `/2/` is incorrect.
- **Buffer wins** when: cross-posting same video to 5+ platforms, human queue review is wanted, and no platform-specific parameters are required.
- **Native wins** when: TikTok `privacy_level` / `video_cover_timestamp_ms` / `brand_content_toggle`, Instagram custom Reel `cover_url` / Stories batch / `share_to_feed`, Pinterest destination URL, LinkedIn document posts, or volumes exceed 60 API calls/min.
- **Pinterest destination URL is silently dropped** by Buffer v2 API — confirmed bug. Use native Pinterest API for pins requiring links.
- **No new OAuth apps** can be registered with Buffer. The `BUFFER_ACCESS_TOKEN` must be the existing pre-issued personal access token.
- **Pricing for 8 channels:** Free plan is insufficient (3-channel max). Essentials annual = $40/mo. Team annual = $80/mo.
