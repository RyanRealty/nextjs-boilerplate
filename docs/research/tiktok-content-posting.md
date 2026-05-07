# Tool: TikTok Content Posting API (deep)

Verified: 2026-05-06. Source: developers.tiktok.com + socialpilot.co 700K-post dataset.

---

## Current implementation status (verified 2026-05-06)

### What `lib/tiktok.ts` does

- **Auth flow** complete: `getAuthorizationUrl`, `exchangeCodeForToken`, `refreshAccessToken`, token stored in Supabase `tiktok_auth` table row `id='default'`, expires-at checked on every publish call in `app/api/social/publish-tiktok/route.ts`.
- **Scopes requested**: `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.list`, `video.upload`, `video.publish`. All six requested at OAuth time — good.
- **`directPostVideo`**: calls `/v2/post/publish/action/upload/` with `source: PULL_FROM_URL`. Only passes `title` and `privacy_level`. Does NOT pass: `disable_duet`, `disable_stitch`, `disable_comment`, `video_cover_timestamp_ms`, `brand_content_toggle`, `brand_organic_toggle`, `is_aigc`, or `auto_add_music`.
- **Chunked file upload**: `initVideoUpload` + `uploadVideoChunk` + `publishVideo` is scaffolded but **not wired into the unified publish route** — `app/api/social/publish/route.ts` calls only `directPostVideo` (URL pull). Chunked path is dead code in production.
- **`publishVideo`**: calls `/v2/post/publish/action/publish/` — this is a **wrong endpoint** for the current TikTok API v2 architecture (see Direct Post section below).
- **Status polling**: `getVideoStatus` calls `/v2/post/publish/status/fetch/` — correct endpoint, correct shape.
- **Photo/carousel posting**: not implemented anywhere.
- **Creator info check**: not implemented (no pre-flight call to check creator posting capacity before each post).
- **`privacyLevel` passed as `'PUBLIC'`** in `publish-tiktok/route.ts` — this is not a valid enum value (see valid values below). Will fail silently or fall back to `SELF_ONLY`.

### What's missing or stubbed

- Cover frame selection (`video_cover_timestamp_ms`)
- Duet/stitch/comment disable flags
- Brand content + AIGC disclosure flags
- Auto-add music
- Creator capacity pre-flight check
- Photo/carousel path
- Inbox/Draft mode (separate endpoint for unaudited apps)
- `PUBLIC` is not a valid privacy_level string — must use `PUBLIC_TO_EVERYONE`

---

## Full Content Posting API capabilities

### Direct Post mode

**What it does**: Posts directly to the user's TikTok profile feed, publicly (or at the creator's chosen privacy level). Requires audited app OR the post lands as `SELF_ONLY` regardless of the privacy_level sent.

**Two source methods:**

| Method | When to use | Endpoint call |
|--------|-------------|---------------|
| `PULL_FROM_URL` | You have a publicly accessible HTTPS video URL (our case — Vercel/CDN hosted MP4) | Single init call; TikTok fetches the file |
| `FILE_UPLOAD` | Sending a local file in chunks | Init call returns `upload_url`; PUT chunks sequentially |

**PULL_FROM_URL constraints:**
- URL must be HTTPS, no redirects
- Domain must be verified in TikTok Developer portal under "Manage URL properties" — unverified domains are rejected
- File must remain accessible for up to 1 hour from init
- Max 4 GB
- Supported codecs: H.264 (recommended), H.265, VP8, VP9
- Supported formats: MP4 (recommended), WebM, MOV
- Frame rate: 23–60 FPS
- Resolution: 360–4096 px on both axes
- Duration: up to 10 minutes

**Correct Direct Post endpoint (v2):**

```
POST https://open.tiktokapis.com/v2/post/publish/video/init/
Authorization: Bearer {access_token}
Content-Type: application/json; charset=UTF-8

{
  "source_info": {
    "source": "PULL_FROM_URL",
    "video_url": "https://..."
  },
  "post_info": {
    "title": "...",                          // max 2200 UTF-16 runes
    "privacy_level": "PUBLIC_TO_EVERYONE",   // see enum below
    "disable_duet": false,
    "disable_stitch": false,
    "disable_comment": false,
    "video_cover_timestamp_ms": 1000,        // ms from start; 0 = first frame
    "brand_content_toggle": false,           // paid partnership disclosure
    "brand_organic_toggle": false,           // creator's own brand promotion
    "is_aigc": false                         // AI-generated content label
  }
}
```

Note: `lib/tiktok.ts` currently calls `/v2/post/publish/action/upload/` — this path is the old action-based endpoint. The correct current path is `/v2/post/publish/video/init/`. Verify against live API; the action path may still be routed but the reference docs point to `video/init`.

**FILE_UPLOAD chunked path:**

```
POST /v2/post/publish/video/init/
body: {
  "source_info": {
    "source": "FILE_UPLOAD",
    "video_size": <bytes>,           // exact file size
    "chunk_size": <bytes>,           // 5 MB–64 MB; final chunk up to 128 MB
    "total_chunk_count": <n>         // ceiling(video_size / chunk_size), max 1000
  },
  "post_info": { ... same fields ... }
}

→ returns { publish_id, upload_url }

PUT {upload_url}
Content-Type: application/octet-stream
Content-Length: <chunk_bytes>
Content-Range: bytes {first}-{last}/{total}
body: <raw bytes>

(repeat for each chunk sequentially)
```

Videos under 5 MB: single chunk. Videos over 64 MB per chunk: split. Max total 4 GB.

### `privacy_level` enum (all four valid values)

| Value | Who sees it |
|-------|-------------|
| `PUBLIC_TO_EVERYONE` | All TikTok users |
| `MUTUAL_FOLLOW_FRIENDS` | Mutual follows only |
| `FOLLOWER_OF_CREATOR` | Followers only |
| `SELF_ONLY` | Creator only (private) |

**Bug in current code:** `publish-tiktok/route.ts` sends `privacyLevel: 'PUBLIC'` and `publish/route.ts` sends `privacy_level: 'PUBLIC_TO_EVERYONE'`. The dedicated route has a typo that will cause API rejection or silent fall-back to `SELF_ONLY`.

**Unaudited app restriction:** regardless of `privacy_level` sent, all posts from unaudited clients are forced to `SELF_ONLY`. See audit section below.

### Interaction toggles

All boolean, all default `false` (interactions enabled by default):

| Parameter | Effect when `true` |
|-----------|-------------------|
| `disable_duet` | Prevents other users from dueting |
| `disable_stitch` | Prevents other users from stitching |
| `disable_comment` | Disables comments on the post |

**Rule from TikTok content guidelines:** if the creator has disabled duet/stitch/comment in their TikTok app settings, your UX must respect that and not re-enable it via the API. Always check `creator_info` first.

### Cover frame selection

`video_cover_timestamp_ms` (int32): milliseconds from the start of the video to use as the cover/thumbnail frame. 

- `0` or omitted: TikTok picks the first frame or its own auto-selected frame
- Recommended: hand-pick a high-information frame (e.g., key stat reveal or best photo angle)
- For a 45-second video: `video_cover_timestamp_ms: 3000` picks the 3-second mark

**This is not in our current implementation.** The publish route passes no cover frame; TikTok uses its auto-selection, which is often a motion-blurred transition frame.

### Brand and disclosure flags

| Parameter | When to set `true` |
|-----------|-------------------|
| `brand_content_toggle` | Paid partnership or sponsored content — shows "Paid partnership" label |
| `brand_organic_toggle` | Creator is promoting their own business (Ryan Realty content qualifies) — shows "Promotional content" label |
| `is_aigc` | Video contains AI-generated visuals or VO — mandatory disclosure under TikTok policy |

TikTok content guidelines require that commercial content labels be enabled if applicable. For Ryan Realty market report videos made with ElevenLabs VO and AI-generated b-roll: `is_aigc: true` is required.

### Music

`music_id`: no music_id parameter is documented in the Direct Post v2 spec. TikTok does not expose a public music catalog API for programmatic music attachment. Music must be selected by the user in the native app, or:
- `auto_add_music: true` (photo posts only, per photo endpoint docs) — adds TikTok's algorithmically recommended music automatically

For video posts: music must either be baked into the video file's audio track (our approach with the ambient music mix), or left for the creator to add manually. There is no `music_id` parameter in the current Direct Post video spec.

### Inbox/Draft mode (vs Direct Post)

| | Direct Post | Inbox/Draft |
|---|---|---|
| Scope | `video.publish` | `video.upload` |
| What happens | Posts immediately to feed | Sends draft to creator's TikTok inbox for manual completion |
| User action required | None | Creator opens inbox, edits if desired, taps Post |
| Unaudited apps | Forced `SELF_ONLY` (private) | Creator can choose privacy after opening in app |
| Endpoint | `/v2/post/publish/video/init/` | `/v2/post/publish/inbox/video/init/` |
| When to use | Audited app, direct scheduling workflow | Unaudited app, or when creator wants to add music/effects |

**We currently use Direct Post mode only.** Inbox mode is useful as a fallback for unaudited app status.

---

## Photo posting (carousel)

**Endpoint:** `POST /v2/post/publish/content/init/`

```json
{
  "media_type": "PHOTO",
  "post_mode": "DIRECT_POST",         // or "MEDIA_UPLOAD" for inbox/draft
  "post_info": {
    "title": "...",                    // max 90 UTF-16 runes
    "description": "...",             // max 4000 UTF-16 runes (separate from title)
    "privacy_level": "PUBLIC_TO_EVERYONE",
    "disable_comment": false,
    "auto_add_music": true,           // only available on photo posts
    "photo_cover_index": 0            // which photo is the cover (0-indexed)
  },
  "source_info": {
    "source": "PULL_FROM_URL",
    "photo_images": [                 // up to 35 publicly accessible URLs
      "https://...",
      "https://..."
    ]
  }
}
```

Key differences from video:
- `media_type: "PHOTO"` required
- `photo_images` array replaces `video_url`
- `photo_cover_index` selects cover photo (not timestamp-based)
- `auto_add_music` is available (not available on video posts)
- `title` limit is 90 runes (vs 2200 for video); `description` is a separate 4000-rune field
- Scopes: `DIRECT_POST` requires `video.publish`; `MEDIA_UPLOAD` requires `video.upload`
- Max 35 photos per carousel

**Not implemented in our stack.** Use case: neighborhood spotlight carousels, listing photo tours.

---

## Auth + endpoints (verified 2026-05-06)

| Operation | Endpoint | Method |
|-----------|----------|--------|
| OAuth authorize | `https://www.tiktok.com/v2/auth/authorize/` | GET (redirect) |
| Token exchange | `https://open.tiktokapis.com/v2/oauth/token/` | POST |
| Token refresh | `https://open.tiktokapis.com/v2/oauth/token/` | POST |
| User info | `https://open.tiktokapis.com/v2/user/info/` | GET |
| Direct Post init (video) | `https://open.tiktokapis.com/v2/post/publish/video/init/` | POST |
| Inbox Post init (video) | `https://open.tiktokapis.com/v2/post/publish/inbox/video/init/` | POST |
| Photo/carousel init | `https://open.tiktokapis.com/v2/post/publish/content/init/` | POST |
| Chunked upload | `{upload_url}` (from init response) | PUT |
| Status fetch | `https://open.tiktokapis.com/v2/post/publish/status/fetch/` | POST |
| Creator info | `https://open.tiktokapis.com/v2/post/publish/creator_info/query/` | POST |

**Token refresh logic:** implemented in `lib/tiktok.ts` `refreshAccessToken` and called in both publish routes before every post. Access tokens expire in 24 hours; refresh tokens expire in 365 days. Both are stored and updated in Supabase `tiktok_auth` row `id='default'`.

---

## App scope / permission tiers

| Scope | Grants | Requires audit? |
|-------|--------|----------------|
| `user.info.basic` | open_id, avatar, display_name | No |
| `user.info.profile` | bio, verification status, profile links | No |
| `user.info.stats` | followers, likes counts | No |
| `video.list` | Read creator's public videos | No |
| `video.upload` | Post to inbox/draft for manual completion | No |
| `video.publish` | Direct Post to feed | Audit required for public visibility |

### Audited vs unaudited — the critical gating factor

**Unaudited app (our current likely status):**
- All posts forced to `SELF_ONLY` (private) regardless of `privacy_level` sent
- Max 5 unique users can post via the app within any 24-hour window
- All user accounts using the app to post must have private-mode accounts at time of posting
- Daily posting cap: approximately 15 posts per creator
- `video.publish` scope technically works, but content is invisible to anyone but the creator
- Effectively: Direct Post becomes a private draft; no different from inbox mode in practice

**Audited app:**
- `PUBLIC_TO_EVERYONE` and other privacy levels function as sent
- User cap lifted (replaced by a creator cap negotiated in the audit application)
- Daily posting cap still applies (set per account in audit terms)
- Both `DIRECT_POST` and inbox modes function at full capability

**How to apply for audit:** TikTok Developer portal → your app → "Content Posting API" → "Apply for audit." Requires demonstrating Terms of Service compliance and a working integration. Partners currently listed: Adobe, CapCut, DaVinci Resolve, SocialPilot, Twitch.

**Verification before any public launch:** run a test post with a private account and check whether the resulting video is visible publicly (audited) or private-only (unaudited). This is the definitive check of our current audit status.

---

## Best-practice posting (algorithm 2026)

Data sources: SocialPilot 700K-post analysis, OpusClip research report, InfluenceFlow 2026 guide.

### Posting times (Pacific / Mountain — Bend, OR is Mountain time, UTC-7 in summer)

| Day | Peak window (MT) | Secondary window (MT) |
|-----|------------------|-----------------------|
| Monday | 7–8 AM, 6–8 PM | — |
| Tuesday | 6–8 AM, 7–9 PM | Best day overall |
| Wednesday | 6–8 AM, 7–9 PM | Highest clip volume day |
| Thursday | 6–8 AM, 7–9 PM | Strong for business |
| Friday | 5–6 AM, 10 AM–12 PM | 4–6 PM secondary |
| Saturday | 9–11 AM | Avoid after 8 PM |
| Sunday | 9–11 AM | Real estate weekend browse window |

Real estate category specifically: **6–8 AM MT** (morning property search) and **3–5 PM MT** (post-work browse, "thinking about moving" mindset). Weekend mornings are disproportionately strong for property content.

EST conversions: subtract 2 hours for MT summer (MDT). General US data is usually published in EST; Bend operates at EST-2 in summer.

**Most important override:** check TikTok Analytics → Followers → Follower Activity heatmap. Your specific audience's active hours beat any published benchmark.

### Optimal duration

- 21–34 seconds: highest completion rates per TikTok internal data (cited by multiple 2026 sources)
- 30–45 seconds: Ryan Realty format spec (from CLAUDE.md Video Build Hard Rules) — this is within the high-completion band
- 30–60 seconds: 38.5% of all analyzed clips; the dominant length range across all categories
- Avoid over 60s unless content demands it (market reports can push to 60s max)
- Under 15s: high completion rate but insufficient time to deliver the value proposition for real estate

Completion rate is the primary feed signal in 2026. TikTok requires **5+ second qualified views** before algorithmic promotion. Target **75%+ completion rate** for 3× reach multiplier.

### Hashtags

- 3–5 hashtags: recommended mix
- Structure: 1 broad (`#realestate`, `#oregonrealestate`), 1 niche (`#bendoregon`, `#bendor`), 1 trending-if-applicable
- Do not keyword-stuff; TikTok's 2026 algorithm deprioritizes posts that appear to game hashtags
- No hashtag is verified to have a direct reach uplift in 2026 — their primary value is search discoverability, not feed distribution

### Cover frame

- Hand-pick via `video_cover_timestamp_ms` — never leave it to TikTok auto-selection
- Best frame: peak information density, faces visible (if applicable), no motion blur
- For stat reveal videos: pick the frame showing the key number (e.g., `$475K` median price visible)
- For listing videos: best exterior or interior hero shot, not a transition frame
- TikTok's auto-selection algorithm often picks mid-transition frames with motion blur — this tanks click-through from the For You Page

### Trending audio

- No API mechanism to attach trending audio via Direct Post
- Audio must be pre-baked into the video file or added by the creator in-app
- Our ambient music approach (baked into MP4) is the only automated option
- Trending audio delivers a demonstrated reach uplift; creators who add it manually after upload outperform those who don't

### Saves and shares

2026 algorithm weights: **saves and shares > comments > likes > views**. Caption calls to action should prompt saves ("save this for your home search") and shares ("send this to someone looking in Bend"), not generic likes.

### Consistency

Creators posting at the same time daily show 40% higher growth rate. Frequency: 2–5 posts/week for established creators; 1 post/day maximum for business accounts to avoid algorithm throttling.

---

## Format constraints (verified against API docs 2026-05-06)

| Parameter | Value |
|-----------|-------|
| Aspect ratio | 9:16 portrait (our standard) |
| Resolution | 360–4096 px on both axes; 1080p recommended |
| Codec | H.264 (required for our render pipeline); H.265, VP8, VP9 also accepted |
| Container | MP4 (recommended), WebM, MOV |
| Frame rate | 23–60 FPS; we render at 30 FPS |
| Duration (min) | 3 seconds |
| Duration (max) | 10 minutes via API |
| File size (max) | 4 GB |
| Audio | AAC recommended; baked into file |

Our standard render (h264, aac, 30fps, 1080×1920, <100MB) is fully within spec.

---

## 3 worked posting examples

### 1. Listing video — direct post with custom cover, duet/stitch disabled

```typescript
// Correct call with all post_info fields populated
const result = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json; charset=UTF-8',
  },
  body: JSON.stringify({
    source_info: {
      source: 'PULL_FROM_URL',
      video_url: 'https://your-verified-domain.com/listing-123.mp4',
    },
    post_info: {
      title: '5 beds in NW Bend — just listed at $875,000 #bendoregon #realestate #bendor',
      privacy_level: 'PUBLIC_TO_EVERYONE',
      disable_duet: true,          // protect listing content
      disable_stitch: true,        // protect listing content
      disable_comment: false,      // comments drive engagement
      video_cover_timestamp_ms: 2000,  // 2s mark: hero exterior shot
      brand_organic_toggle: true,  // Ryan Realty is promoting its own listing
      is_aigc: true,               // ElevenLabs VO + any AI-generated footage
    },
  }),
})
```

### 2. Market data video — direct post, public, with hashtags

```typescript
body: JSON.stringify({
  source_info: {
    source: 'PULL_FROM_URL',
    video_url: 'https://your-verified-domain.com/market-report-april-2026.mp4',
  },
  post_info: {
    title: 'Bend housing market April 2026: $483K median, 3.2 months supply #bendrealestate #oregonrealestate #housingmarket',
    privacy_level: 'PUBLIC_TO_EVERYONE',
    disable_duet: false,
    disable_stitch: false,
    disable_comment: false,
    video_cover_timestamp_ms: 5000,  // 5s mark: key stat reveal frame
    brand_organic_toggle: true,
    is_aigc: true,
  },
})
```

### 3. Neighborhood spotlight — photo carousel

```typescript
// Uses /v2/post/publish/content/init/ NOT the video endpoint
body: JSON.stringify({
  media_type: 'PHOTO',
  post_mode: 'DIRECT_POST',
  post_info: {
    title: 'NW Bend in 8 photos',
    description: 'Awbrey Butte to the Old Mill — here is what makes this corner of Bend different. #bendoregon #nwbend',
    privacy_level: 'PUBLIC_TO_EVERYONE',
    disable_comment: false,
    auto_add_music: true,    // let TikTok add trending audio
    photo_cover_index: 0,    // first photo is the cover
  },
  source_info: {
    source: 'PULL_FROM_URL',
    photo_images: [
      'https://your-verified-domain.com/nw-bend-1.jpg',
      'https://your-verified-domain.com/nw-bend-2.jpg',
      // up to 35
    ],
  },
})
```

---

## Common failure modes

| Failure | Cause | Fix |
|---------|-------|-----|
| All posts land as private (`SELF_ONLY`) | App is unaudited | Apply for TikTok audit; use inbox mode in the interim |
| `privacy_level` rejection | Sending `'PUBLIC'` instead of `'PUBLIC_TO_EVERYONE'` | Fix `publish-tiktok/route.ts` line 83: change `'PUBLIC'` → `'PUBLIC_TO_EVERYONE'` |
| Upload URL expired | PUT chunk request sent > 1 hour after init | Reduce chunk size, parallelize within window, or re-init if expired |
| Domain rejected on `PULL_FROM_URL` | Vercel CDN domain not in "Manage URL properties" | Add `ryanrealty.vercel.app` (and future `ryan-realty.com`) to verified domains in TikTok Developer portal |
| Token expiration mid-post | access_token expires (24h TTL) | Already handled by `getOrRefreshAccessToken()` in both publish routes — no action needed |
| Cover frame wrong (motion blur) | `video_cover_timestamp_ms` not passed | Always set explicit ms value |
| Post rejected for missing disclosure | AI-generated content without `is_aigc: true` | Set `is_aigc: true` on all renders using ElevenLabs VO or AI video |
| `publish_id` not found on status poll | Status fetch called too quickly | Add 5–10s delay before first poll; status takes time to process |
| Rate limit on init | > 6 init requests per minute per user token | Add per-token rate limiting in the publish queue |

---

## Status response shape (verified)

```typescript
// POST /v2/post/publish/status/fetch/
// body: { "publish_id": "..." }

interface StatusResponse {
  data: {
    status: 
      | 'PROCESSING_UPLOAD'       // FILE_UPLOAD only: chunks being received
      | 'PROCESSING_DOWNLOAD'     // PULL_FROM_URL only: TikTok fetching video
      | 'SEND_TO_USER_INBOX'      // inbox/draft mode: notification sent to creator
      | 'PUBLISH_COMPLETE'        // posted successfully
      | 'FAILED'                  // terminal failure
    fail_reason?: string          // populated when status = FAILED
    publicaly_available_post_id?: number[]  // post IDs after moderation approval (note TikTok typo in field name)
    uploaded_bytes?: number       // FILE_UPLOAD progress
    downloaded_bytes?: number     // PULL_FROM_URL progress
  }
  error: {
    code: string
    message: string
    log_id: string
  }
}
```

Note: `publicaly_available_post_id` is TikTok's field name (typo preserved). The `post_id` only appears after content clears moderation — for direct posts, this typically takes seconds to minutes. Our current implementation does not poll for `PUBLISH_COMPLETE` or capture `publicaly_available_post_id`; it returns `status: 'submitted'` and stops. To track the actual TikTok post URL, a polling loop is needed.

---

## Rate limits (verified 2026-05-06)

| Operation | Limit |
|-----------|-------|
| Video init (`/video/init/`, `/inbox/video/init/`) | 6 requests/minute per user access_token |
| Status fetch | 30 requests/minute per user access_token |
| Unaudited app: unique posting users | 5 users per 24-hour window |
| Per-creator daily posts | ~15 posts/day (varies by account; check `creator_info`) |

---

## Creator info pre-flight check (not yet implemented)

Before every post, the API guidelines require checking creator capacity:

```typescript
// POST /v2/post/publish/creator_info/query/
// Returns posting capacity, max video duration, and whether the creator
// has disabled duet/stitch/comment in their account settings.
// If posting capacity is 0, do not attempt to post.
```

This endpoint is not in `lib/tiktok.ts`. Missing it means posts can fail silently when a creator has hit their daily cap.

---

## Capabilities we are not using

| Capability | Current status | Priority |
|-----------|----------------|----------|
| `video_cover_timestamp_ms` | Not passed | High — cover frame drives For You Page CTR |
| `disable_duet` / `disable_stitch` | Not passed | Medium — protect listing content |
| `brand_organic_toggle` | Not passed | High — required for compliant commercial content |
| `is_aigc` | Not passed | High — required disclosure for AI-generated VO/video |
| Photo/carousel posting | Not implemented | Medium — neighborhood spotlights, listing tours |
| `SEND_TO_USER_INBOX` / inbox mode | Not implemented | High — needed if app is unaudited |
| Creator info pre-flight check | Not implemented | High — prevent silent failures |
| `PUBLISH_COMPLETE` polling | Not implemented | Medium — needed to capture the final post URL |
| `auto_add_music` (photo only) | Not applicable until photo implemented | Low |
| Correct endpoint path `/video/init/` vs `/action/upload/` | Using old path | Medium — verify live |
| `privacy_level: 'PUBLIC'` bug | Live bug in `publish-tiktok/route.ts` | Critical fix |
