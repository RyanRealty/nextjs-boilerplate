# Tool: YouTube Data API v3

> Research date: 2026-05-06  
> Sources: developers.google.com/youtube/v3/docs (live), YouTube Data API revision history, official quota calculator

---

## Current implementation (2026-05-06)

**File:** `lib/youtube.ts`

What is wired today:

| Capability | Status |
|---|---|
| OAuth 2.0 authorization URL generation | Done |
| Authorization code exchange | Done |
| Refresh token auto-refresh (60s window) | Done |
| Token persistence in Supabase `youtube_auth` table | Done |
| Resumable upload via `uploadType=resumable` | Done |
| Single-part body upload (full video in one PUT) | Done — no chunking |
| snippet: title, description, tags, categoryId | Done |
| status: privacyStatus, selfDeclaredMadeForKids | Done |
| OAuth scope | `youtube.upload` only |

**What is NOT wired today (every item below is an underused capability):**

- Thumbnail upload (`thumbnails.set`)
- Scheduled publish (`status.publishAt`)
- Playlist assignment (`playlistItems.insert`)
- Captions / closed-captions upload (`captions.insert`)
- Synthetic media disclosure (`status.containsSyntheticMedia`)
- Per-platform title/description metadata (publish route truncates caption to 100 chars for title)
- Category ID for real estate content (currently hardcoded `'37'` — Pets & Animals; should be `'26'` for Howto & Style or `'22'` for People & Blogs)
- Notification control (`notifySubscribers` flag)

**Current scope gap:** `lib/youtube.ts` line 6 requests only `youtube.upload`. Thumbnail upload, caption upload, and playlist management all require the broader `youtube` or `youtube.force-ssl` scope. OAuth must be re-authorized to add these scopes.

---

## Capabilities

### Video upload

**Endpoint:** `POST /upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`

**Quota cost:** 100 units (changed from 1,600 units on December 4, 2025)

**Upload types:**
- `resumable` — two-step: POST to init session → PUT bytes to session URI. Required for files > 5 MB. Supports chunked transfer and interrupted-upload recovery. **Use this always.**
- `multipart` — metadata + bytes in one multipart request. Limited to small files only.

**Resumable upload protocol (step by step):**

1. POST to `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`
   - Headers: `Authorization: Bearer <token>`, `Content-Type: application/json`, `X-Upload-Content-Type: video/mp4`, `X-Upload-Content-Length: <bytes>`
   - Body: JSON with `snippet` + `status` objects
   - Response: HTTP 200 with `Location` header containing the session URI

2. PUT to the session URI from step 1
   - Headers: `Content-Type: video/mp4`, `Content-Length: <bytes>`
   - Body: raw video bytes
   - Response: HTTP 200/201 with video resource JSON (contains `id`)

3. For chunked upload (large files): PUT with `Content-Range: bytes <start>-<end>/<total>`. Response HTTP 308 = chunk received, continue. HTTP 200/201 = complete.

4. Resume an interrupted upload: PUT with `Content-Range: bytes */<total>`. If 308, response `Range` header shows last byte received. Resume from next byte.

**Current implementation gap:** `lib/youtube.ts` does NOT set `X-Upload-Content-Length` header on init. Does NOT stream — buffers entire video into memory with `arrayBuffer()` before PUT. For 100 MB videos this will OOM in a serverless function. Fix: stream the response body directly to the PUT request, or use chunked upload with 256 MB chunks.

**Snippet fields:**

| Field | Max / Constraint |
|---|---|
| `title` | 100 characters; no `<` or `>` |
| `description` | 5,000 bytes; no `<` or `>`; first ~150 chars visible without "Show more" |
| `tags[]` | 500 characters total across all tags; spaces in a tag add 2 chars for quotes |
| `categoryId` | See category table below |
| `defaultLanguage` | BCP-47 language code (e.g., `en-US`) |

**Useful category IDs for Ryan Realty:**

| ID | Name | Best for |
|---|---|---|
| `22` | People & Blogs | Agent intro, market commentary, testimonials |
| `26` | Howto & Style | Listing tours, buyer/seller guides, staging tips |
| `19` | Travel & Events | Neighborhood guides, Bend lifestyle, area tours |
| `24` | Entertainment | Meme content, viral clips |

> Note: There is no dedicated Real Estate category. `26` (Howto & Style) is the standard choice for listing and market content.

**Status fields:**

| Field | Values / Notes |
|---|---|
| `privacyStatus` | `public`, `private`, `unlisted` |
| `publishAt` | ISO 8601 UTC (e.g., `2026-05-12T15:00:00Z`); must set `privacyStatus: 'private'`; video must never have been previously published |
| `selfDeclaredMadeForKids` | `false` for all Ryan Realty content |
| `containsSyntheticMedia` | `true` if AI-generated or AI-altered content (ElevenLabs VO, AI imagery) — added October 2024; required by YouTube ToS |
| `embeddable` | Boolean; default true |

**Notification control:** `notifySubscribers=false` as a query param suppresses subscriber notifications. Use this for bulk uploads or re-uploads to avoid spamming subscribers.

---

### Shorts vs long-form distinction

**No separate Shorts API.** Same `videos.insert` endpoint for both. YouTube auto-detects based on:

1. **Aspect ratio:** 9:16 vertical (1080×1920)
2. **Duration:** Up to 3 minutes (180 seconds) — as of 2025 update, not 60 seconds. Videos ≤ 3 min vertical are eligible for Shorts feed.
3. **`#Shorts` hashtag:** In title or description. As of 2026, YouTube detects format from aspect ratio and duration alone; hashtag is no longer strictly required but remains a best practice for explicit categorization.

**Detection rule summary for Ryan Realty:** All Remotion renders are 1080×1920. Any render ≤ 180 seconds will be treated as a Short. A 45-second market report and a 3-minute listing tour are both Shorts by YouTube's definition. The `#shorts` hashtag in description locks the category signal.

**Shorts feed ranking signals (2026):**
- Swipe-away rate in first 1-3 seconds (most heavily weighted)
- Watch-through / completion rate
- Replay rate (loops)
- Subscriber/engagement actions after viewing

**View counting change (March 26, 2025):** Shorts views now count on first play start, no minimum watch time required. This inflates raw view counts but `engagedViews` (minimum duration) still gates monetization.

---

### Thumbnail upload

**Endpoint:** `POST /thumbnails/set?videoId=<id>`

**Quota cost:** 50 units

**Required scope:** `youtube.upload`, `youtube`, `youtube.force-ssl`, or `youtubepartner` (any one is sufficient)

**Constraints:**
- Max file size: 2 MB
- Accepted formats: `image/jpeg`, `image/png`
- Recommended dimensions: 1280×720 minimum (16:9) for long-form; YouTube generates Shorts cover from video frame but custom thumbnails still display in browse
- Must upload AFTER video is created (need `videoId`)
- No processing delay requirement documented; can upload immediately after `videos.insert` returns

**Implementation note:** Custom thumbnails require the channel to be verified OR have 1,000+ subscribers (YouTube platform policy, not enforced in the API call itself — the API will accept the upload but YouTube may override with an auto-generated thumb for unverified channels).

**Current gap:** Not implemented. Every Ryan Realty video currently uses whatever frame YouTube auto-selects. Adding this is a single API call after `uploadYouTubeVideoFromUrl` returns the `videoId`.

---

### Captions / closed-captions

**Endpoint:** `POST /upload/youtube/v3/captions?uploadType=resumable&part=snippet&sync=false`

**Quota cost:** 400 units per insert; 450 units per update

**Required scope:** `youtube.force-ssl` (the narrower `youtube.upload` scope is NOT sufficient)

**Accepted formats:** SRT (SubRip), SBV (SubViewer), VTT (WebVTT), TTML, DFXP — content-type `text/xml` or `application/octet-stream`

**Required fields:**
- `snippet.videoId` — the video to attach captions to
- `snippet.language` — BCP-47 code (e.g., `en-US`)
- `snippet.name` — label displayed in player (e.g., `English`)

**Sync parameter:** The `sync=true` parameter that allowed YouTube to generate timing from a transcript was deprecated March 13, 2024. Timing must now be embedded in the uploaded file (SRT timecodes required). Auto-sync still available in YouTube Creator Studio UI — not via API.

**Caption types:** `standard` (user-uploaded), `asr` (auto-generated by YouTube), `forced` (always-on for specific languages).

**Current status:** Not implemented. Captions on Ryan Realty videos are currently 100% auto-generated by YouTube (ASR), which is acceptable quality for English VO but has no control over accuracy or formatting.

**Practical note:** Captions.insert costs 400 units — 4x the cost of video upload. For the content engine at scale, uploading burned-in captions (which Remotion already produces) is preferable to API-uploaded SRT files from a quota perspective.

---

### End screens / cards

**End screens API:** Does NOT exist. No `endScreens` resource in YouTube Data API v3. End screens can only be configured via YouTube Studio UI or copied from another video in Studio. This is a known open feature request (Google Issue Tracker #387277988, filed January 2025).

**Cards:** Not manageable via API.

**Practical workaround for Ryan Realty:** Build a consistent end-card directly into the Remotion composition (currently done via the `stacked_logo_white.png` end card per CLAUDE.md). No API call needed.

---

### Scheduled publish

**Mechanism:** Set `status.privacyStatus = 'private'` AND `status.publishAt = '<ISO 8601 UTC timestamp>'` in the `videos.insert` body.

**Constraints:**
- Video must never have been previously published
- `privacyStatus` must be `private` (not `unlisted`)
- `publishAt` must be a future UTC timestamp in ISO 8601 format: `2026-05-12T15:00:00Z`
- Setting `publishAt` to a past timestamp triggers immediate publication
- Can also be set/updated via `videos.update` (50 units) — use this to reschedule without re-uploading

**Quota cost:** No additional cost beyond the `videos.insert` (100 units) or `videos.update` (50 units) call.

**Current gap:** Not implemented. The publish route (`app/api/social/publish/route.ts`) passes `privacyStatus` but does not expose or pass `publishAt`. All uploads go live immediately.

**Implementation:** Add `publishAt?: string` to `YouTubeStatus` interface in `lib/youtube.ts` and pass it in the `status` object. Add to `PublishRequest.metadata.youtube` in the publish route.

---

### Playlists

**Create playlist:** `POST /youtube/v3/playlists` — 50 units  
**Add video to playlist:** `POST /youtube/v3/playlistItems` — 50 units  
**List playlists:** `GET /youtube/v3/playlists?mine=true` — 1 unit

**Pattern for content engine:**

1. Create playlists once, store IDs in Supabase or env: Market Reports, Listing Tours, Neighborhood Guides, Bend Oregon
2. After each `videos.insert`, call `playlistItems.insert` with the `videoId` and the matching `playlistId`
3. Total additional cost: 50 units per upload

**Current gap:** Not implemented. No playlist management in `lib/youtube.ts` or publish route.

---

## Auth + endpoints (verified 2026-05-06)

**OAuth 2.0 flow:** Authorization Code with `access_type=offline` and `prompt=consent`. The `prompt=consent` is critical — without it, Google does not always return a `refresh_token` on subsequent authorizations.

**Current scope:** `https://www.googleapis.com/auth/youtube.upload` (line 6 of `lib/youtube.ts`)

**Scope needed for full capability:**

| Scope | Enables |
|---|---|
| `youtube.upload` | videos.insert, thumbnails.set |
| `youtube.force-ssl` | captions.insert, captions.update (required) |
| `youtube` | Full read/write including playlists, channel management |

**Recommendation:** Re-authorize with `youtube.force-ssl` and `youtube` scopes to unlock captions and playlist management without breaking existing upload capability.

**Token lifecycle:** Refresh token does not expire unless: (1) user revokes access, (2) the OAuth app is deleted, (3) user changes Google password, (4) app has been idle for 6 months. The current 60-second refresh window before expiry in `getYouTubeAccessToken()` is appropriate.

**Base URL (standard calls):** `https://www.googleapis.com/youtube/v3/`  
**Base URL (uploads):** `https://www.googleapis.com/upload/youtube/v3/`  
**Quota reset:** Midnight Pacific Time daily

---

## Quota math (CRITICAL)

**Default daily allocation:** 10,000 units

**Updated quota cost table (as of December 4, 2025):**

| Method | Units | Notes |
|---|---|---|
| `videos.insert` | **100** | Reduced from 1,600 on 2025-12-04 |
| `videos.update` | 50 | Title, description, schedule, status changes |
| `videos.list` | 1 | Read; cheap for status polling |
| `thumbnails.set` | 50 | Per video |
| `captions.insert` | **400** | Most expensive write after upload |
| `captions.update` | **450** | Highest single-call cost |
| `captions.list` | 50 | Read captions for a video |
| `playlistItems.insert` | 50 | Add video to playlist |
| `playlists.insert` | 50 | Create new playlist |
| `search.list` | 100 | Expensive; avoid in loops |
| `channels.list` | 1 | Read; cheap |

**Daily throughput at default 10,000 units:**

| Workflow | Units/video | Max videos/day |
|---|---|---|
| Upload only | 100 | 100 |
| Upload + thumbnail | 150 | 66 |
| Upload + thumbnail + playlist | 200 | 50 |
| Upload + thumbnail + playlist + captions | 600 | 16 |
| Upload + thumbnail + playlist + captions + update | 650 | 15 |

**The old 1,600-unit cost for `videos.insert` was the primary constraint. That constraint is now gone.** With the current 100-unit cost, Ryan Realty can upload up to 100 videos/day on the default quota — far more than the content engine needs.

**Actual daily content engine load estimate:**

| Content type | Frequency | Units |
|---|---|---|
| Listing video | 3-5/week (0.5-0.7/day avg) | 100-200/day |
| Market report | 1-2/week (0.2/day avg) | 20-40/day |
| Neighborhood short | 1-2/week (0.2/day avg) | 20-40/day |
| News clip | Daily (1/day) | 100-200/day |

**Estimated total: 240-480 units/day.** This is 2.4-4.8% of the default 10,000-unit daily quota. **No quota increase needed for current scale.** Monitor via Google Cloud Console → YouTube Data API → Quotas.

**When to request quota increase:** If publishing to YouTube exceeds 50 videos/day or if you add captions to every video (600 units/video brings cap to 16/day). Request form: https://support.google.com/youtube/contact/yt_api_form — approval takes 1-6 weeks; include app description, expected daily volume, and links to published privacy policy + ToS.

---

## Best-practice posting (algorithm 2026)

### Shorts (1080×1920, ≤3 min)

**Best posting times:**
- Weekdays: 12-3 PM local (initial test-audience window)
- Friday-Sunday outperform weekdays for Shorts reach
- Friday 4 PM, 6 PM, 7 PM are top-performing slots per platform data
- Evening window 7-9 PM also strong

**Title:** Under 60 characters for Shorts; front-load the keyword or hook within first 3 words. No clickbait that contradicts the content (negative engagement signal).

**Description:** 1-2 sentences + hashtags. `#shorts #bend #realestate #bendhomes` — 2-4 hashtags max. First 100-150 chars visible before "Show more."

**Optimal Shorts length (2026):** 15-35 seconds. Completion rate on shorter Shorts is higher; a 30s Short at 85% completion outperforms a 60s Short at 50% completion in algorithm ranking.

**Shorts detection confirmation:** 9:16 vertical + ≤180s = automatic Shorts classification. Add `#shorts` in description as belt-and-suspenders.

### Long-form (16:9, any duration)

**Best posting times:**
- Tuesday, Wednesday, Saturday 12-4 PM

**Title:** Under 70 characters to avoid truncation in browse. Front-load the keyword.

**Description:** First 150 chars are critical (above the fold). Include location keywords: "Bend Oregon," "Central Oregon," "Deschutes County." Add chapter timestamps for videos >5 minutes using `MM:SS` format — YouTube indexes chapters separately.

**Tags:** Use the full 500-character budget. Start with most specific (e.g., `bend oregon real estate`) → geographic (e.g., `central oregon homes`) → category (e.g., `real estate market update`).

**Hashtags in description:** 3-5 max. YouTube penalizes hashtag stuffing. `#bendoregon #realestate #ryanrealty` — keep the channel hashtag consistent.

### `containsSyntheticMedia` disclosure

Per YouTube ToS (October 2024): Any video containing AI-generated or AI-altered content must set `status.containsSyntheticMedia = true`. This includes ElevenLabs VO, AI-generated imagery (Replicate/Kling/Veo), or AI-enhanced photos. YouTube displays a "Made with AI" label. Not disclosing and being caught results in strike/demonetization.

**Ryan Realty impact:** Every video using Victoria (ElevenLabs) or AI-generated b-roll must have this field set to `true`. Currently not set in `lib/youtube.ts` or the publish route.

---

## 5 worked examples

### 1. Listing reel as Short (vertical, 30s, #shorts)

```typescript
const videoId = await uploadYouTubeVideoFromUrl({
  accessToken,
  videoUrl: 'https://cdn.ryan-realty.com/out/1234-cascade-peaks.mp4',
  snippet: {
    title: '3BR Bend home just listed — $875K',         // 42 chars
    description: [
      'Just listed in Southeast Bend, OR. 3 beds, 2 baths, 1,850 sqft.',
      'Open kitchen, mountain views, attached 2-car garage.',
      '',
      '#shorts #bendoregon #realestate #justlisted #ryanrealty',
    ].join('\n'),
    tags: ['bend oregon real estate', 'bend homes for sale', 'just listed bend oregon',
           'central oregon real estate', 'ryan realty'],  // ~120 chars
    categoryId: '26',  // Howto & Style
  },
  status: {
    privacyStatus: 'public',
    selfDeclaredMadeForKids: false,
    containsSyntheticMedia: true,  // ElevenLabs VO
  },
})

// After upload — set custom thumbnail
await fetch(`https://www.googleapis.com/thumbnails/set?videoId=${videoId}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'image/jpeg' },
  body: thumbnailJpegBuffer,  // 1280x720, < 2MB
})

// Add to Listings playlist
await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    snippet: {
      playlistId: 'PLxxxxxxxx_LISTINGS',  // stored in env
      resourceId: { kind: 'youtube#video', videoId },
    },
  }),
})
```

**Quota used:** 100 (upload) + 50 (thumbnail) + 50 (playlist) = **200 units**

---

### 2. Market report long-form (16:9, 2-3 min, chapter markers)

```typescript
const videoId = await uploadYouTubeVideoFromUrl({
  accessToken,
  videoUrl: 'https://cdn.ryan-realty.com/out/market-april-2026.mp4',
  snippet: {
    title: 'Bend Oregon Real Estate Market — April 2026',  // 45 chars
    description: [
      'Bend, OR market update for April 2026. Median price, inventory, days on market.',
      '',
      '00:00 Overview',
      '00:18 Median sale price',
      '00:38 Active inventory',
      '01:02 Months of supply',
      '01:30 What it means for buyers and sellers',
      '',
      'Data source: ORMLS via Supabase ryan-realty-platform. Verified 2026-05-01.',
      '',
      '#bendoregon #realestate #marketupdate #centraloregoNrealestate',
    ].join('\n'),
    tags: ['bend oregon real estate market', 'central oregon housing market 2026',
           'bend or home prices', 'deschutes county real estate', 'ryan realty bend'],
    categoryId: '26',
  },
  status: {
    privacyStatus: 'public',
    selfDeclaredMadeForKids: false,
    containsSyntheticMedia: true,
  },
})
```

**Quota used:** 100 (upload) + 50 (thumbnail) + 50 (playlist) = **200 units**

---

### 3. Neighborhood guide cross-posted as Short and long-form

Strategy: render two versions (30s Short, 90s long-form). Upload both.

```typescript
// Short version
const shortId = await uploadYouTubeVideoFromUrl({
  accessToken,
  videoUrl: 'https://cdn.ryan-realty.com/out/nw-crossing-short.mp4',
  snippet: {
    title: 'NW Crossing Bend — what it\'s actually like',
    description: 'Fast look at NW Crossing, one of Bend\'s most walkable neighborhoods.\n\n#shorts #bendoregon #nwcrossing #ryanrealty',
    tags: ['nw crossing bend oregon', 'bend neighborhoods', 'bend oregon living'],
    categoryId: '19',
  },
  status: { privacyStatus: 'public', selfDeclaredMadeForKids: false, containsSyntheticMedia: true },
})

// Long-form version — scheduled for Tuesday noon
const longId = await uploadYouTubeVideoFromUrl({
  accessToken,
  videoUrl: 'https://cdn.ryan-realty.com/out/nw-crossing-long.mp4',
  snippet: {
    title: 'Living in NW Crossing, Bend Oregon — Complete Neighborhood Guide 2026',
    description: '...full description with chapter markers...',
    tags: ['nw crossing bend oregon', 'bend neighborhoods guide', '...'],
    categoryId: '19',
  },
  status: {
    privacyStatus: 'private',
    publishAt: '2026-05-12T19:00:00Z',  // Tuesday noon PT = 7 PM UTC
    selfDeclaredMadeForKids: false,
    containsSyntheticMedia: true,
  },
})
```

**Quota used:** 200 + 200 = **400 units** (both versions with thumbnail + playlist)

---

### 4. Earth-zoom intro as Short (generated from Remotion)

```typescript
const videoId = await uploadYouTubeVideoFromUrl({
  accessToken,
  videoUrl: 'https://cdn.ryan-realty.com/out/earth-zoom-bend-downtown.mp4',
  snippet: {
    title: 'What $800K buys in Bend, Oregon right now',
    description: 'This is what $800,000 gets you in Bend, OR in 2026.\n\n#shorts #bendoregon #realestate #homeprice',
    tags: ['bend oregon homes', 'what does 800k buy', 'central oregon real estate 2026'],
    categoryId: '26',
  },
  status: {
    privacyStatus: 'public',
    selfDeclaredMadeForKids: false,
    containsSyntheticMedia: true,
  },
})
```

---

### 5. Scheduled Monday market pulse Short

Upload Sunday, schedule for Monday 12 PM PT (8 PM UTC):

```typescript
const videoId = await uploadYouTubeVideoFromUrl({
  accessToken,
  videoUrl: 'https://cdn.ryan-realty.com/out/market-pulse-2026-05-11.mp4',
  snippet: {
    title: 'Bend real estate pulse — week of May 11',
    description: 'Quick weekly market check for Bend, OR.\n\n#shorts #bendoregon #ryanrealty',
    tags: ['bend oregon market', 'weekly real estate update bend'],
    categoryId: '26',
  },
  status: {
    privacyStatus: 'private',       // required for scheduling
    publishAt: '2026-05-11T19:00:00Z',  // Monday 12 PM PT
    selfDeclaredMadeForKids: false,
    containsSyntheticMedia: true,
  },
})
```

---

## Common failure modes

| Failure | Cause | Fix |
|---|---|---|
| `quotaExceeded` | Daily 10,000 units consumed | Monitor Google Cloud Console. At current scale (<500 units/day) this should not occur. If it does, check for a runaway loop calling `search.list` (100 units each). |
| Shorts not detected | 16:9 video uploaded, or duration > 3 min | Render must be 1080×1920. Duration must be ≤ 180s. Add `#shorts` to description. |
| Custom thumbnail ignored | Channel not verified or < 1,000 subscribers | Verify channel in YouTube Studio. Thumbnail API call succeeds but YouTube overrides with auto-generated thumb for unverified channels. |
| `refreshToken` revoked | Google revokes on password change, idle 6 months, or manual revoke | Detect 401 on refresh → redirect to `/api/youtube/authorize` for re-auth. Current code throws but does not redirect. |
| Upload OOM in serverless | `arrayBuffer()` buffers full video in memory | Stream the source response body directly to the PUT request using `ReadableStream`. Or pre-upload to Supabase Storage / Vercel Blob and pass that URL. |
| `captions.insert` 403 | Wrong scope — `youtube.upload` is insufficient | Re-authorize with `youtube.force-ssl` scope. |
| `publishAt` ignored | Video was previously made public (even briefly) | `publishAt` only works on videos that have never been published. If video was accidentally set public, `publishAt` on update has no effect. |
| `containsSyntheticMedia` missing | Field not sent | Add to `YouTubeStatus` interface and pass in all insert/update calls for Ryan Realty content. |

---

## Response shape (full workflow)

```typescript
// Step 1: videos.insert → returns videoId
const videoId: string = await uploadYouTubeVideoFromUrl(options)
// → 'dQw4w9WgXcQ'

// Step 2: thumbnails.set (optional but strongly recommended)
const thumbResponse = await fetch(
  `https://www.googleapis.com/thumbnails/set?videoId=${videoId}`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'image/jpeg',
    },
    body: thumbnailBuffer,
  }
)
// → { kind: 'youtube#thumbnailSetResponse', items: [{ url, width, height }] }

// Step 3: playlistItems.insert (optional)
const playlistResponse = await fetch(
  'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet',
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      snippet: {
        playlistId: PLAYLIST_ID,
        resourceId: { kind: 'youtube#video', videoId },
      },
    }),
  }
)
// → { id: 'PLItemId', snippet: { ... } }

// Final URL
const url = `https://www.youtube.com/watch?v=${videoId}`
// For Shorts: https://www.youtube.com/shorts/${videoId}
```

---

## Rate limits + quota costs (summary table)

| Operation | Units | Daily max (10K budget) | Ryan Realty use |
|---|---|---|---|
| `videos.insert` | 100 | 100 | Every video publish |
| `videos.update` | 50 | 200 | Reschedule, metadata fix |
| `videos.list` | 1 | 10,000 | Status polling |
| `thumbnails.set` | 50 | 200 | Every video publish |
| `captions.insert` | 400 | 25 | Avoided — use burned-in captions |
| `captions.update` | 450 | 22 | Avoid |
| `playlistItems.insert` | 50 | 200 | Every video publish |
| `playlists.insert` | 50 | 200 | One-time setup |
| `search.list` | 100 | 100 | Avoid in automation loops |
| `channels.list` | 1 | 10,000 | Status check |

**Quota reset:** Midnight Pacific Time.

**Recommended full-workflow cost per video:** 200 units (insert + thumbnail + playlist). At that rate, 50 videos/day before hitting the default cap. Current publishing cadence of 1-3 videos/day = ~200-600 units/day = 2-6% of quota. No increase needed now.

---

## Gaps to close (prioritized)

### P0 — Fix before next publish
1. **`containsSyntheticMedia: true`** — required by YouTube ToS for any AI VO or AI imagery. Not set anywhere in current code. Add to `YouTubeStatus` interface in `lib/youtube.ts` and pass in every call from the publish route.

2. **`categoryId: '26'`** — currently hardcoded `'37'` (Pets & Animals). Wrong category. Change to `'26'` (Howto & Style) as default for all Ryan Realty content.

### P1 — High value, low quota cost
3. **Thumbnail upload** — `thumbnails.set` is 50 units, already have custom thumbnails from render pipeline. Wire it into `lib/youtube.ts` as `setYouTubeThumbnail(videoId, imageBuffer)`.

4. **Scheduled publish** — Add `publishAt?: string` to `YouTubeStatus` and expose in publish route `metadata.youtube`. Enables pre-scheduling Monday market pulses on Sunday.

5. **Playlist assignment** — One function `addToYouTubePlaylist(videoId, playlistId)` in `lib/youtube.ts`. Wire it into publish route after upload. Prerequisite: create the playlists in YouTube Studio and store their IDs in env vars.

### P2 — Infrastructure
6. **Scope expansion** — Re-authorize with `youtube.force-ssl` and `youtube` scopes to unlock captions + full playlist management without re-auth again.

7. **Streaming upload** — Replace `arrayBuffer()` with stream-based upload to avoid serverless OOM on large video files. Critical for >50 MB renders.

8. **`notifySubscribers=false`** on bulk/backfill uploads to avoid email spam to subscribers.
