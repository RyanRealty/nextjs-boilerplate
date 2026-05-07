# Tool: Meta Graph API (Facebook + Instagram + Threads)

Researched 2026-05-06. Sources: Meta Developer Documentation (developers.facebook.com), official changelogs, Later/Buffer/Sprout Social posting-time research (975K–14M posts analyzed). All endpoints verified against the current API version.

---

## Current state (2026-05-06)

| Variable | Value | Status |
|---|---|---|
| `META_APP_ID` | in `.env.example` | not set in `.env.local` |
| `META_APP_SECRET` | in `.env.example` | not set in `.env.local` |
| `META_PAGE_ACCESS_TOKEN` | in `.env.example` | **EXPIRED** (per CLAUDE.md) |
| `META_IG_BUSINESS_ACCOUNT_ID` | in `.env.example` | not confirmed set |
| `META_FB_PAGE_ID` | in `.env.example` | not confirmed set |
| `META_AD_ACCOUNT_ID` | in `.env.example` | not confirmed set |
| API version in code | `v22.0` | **STALE** — current is `v25.0` |
| Graph base URL | `https://graph.facebook.com/v22.0` | needs bump to `v25.0` |

**Immediate blockers:**
1. Page token is expired — zero posts can go out until refreshed.
2. `lib/meta-graph.ts` hardcodes `v22.0` — v22.0 is deprecated as of September 9, 2025. Update to `v25.0`.

---

## API version history (verified against Meta changelog)

| Version | Released | Deprecation date |
|---|---|---|
| v22.0 | late 2024 | **deprecated September 9, 2025** |
| v23.0 | early 2025 | — |
| v24.0 | mid 2025 | — |
| v25.0 | February 18, 2026 | current, minimum supported |

**Action:** Update both `META_GRAPH_BASE` and `META_IG_BASE` constants in `lib/meta-graph.ts` from `v22.0` to `v25.0`. Meta guarantees each version for at least 2 years from release date, so `v25.0` is safe through at least February 2028.

---

## Token refresh — exact steps (no-guess version)

### How Meta tokens work

```
Short-lived User Token (1–2 hours)
  └─→ Long-lived User Token (60 days, refreshable)
        └─→ Long-lived Page Token (NO expiration date)
```

Page tokens derived from a long-lived user token do not expire on a time basis. They only invalidate if: (a) the user removes the app, (b) the user changes their Facebook password, (c) the page admin role is revoked, or (d) the app itself is disabled. This means once you have the page token, you store it and it works indefinitely unless those conditions occur.

---

### Step 1 — Exchange short-lived user token for long-lived user token

This is the first step if you are starting fresh (e.g., after re-authorizing the app via the Meta App Dashboard or Facebook Login flow). If you still have a valid long-lived user token, skip to Step 2.

```
GET https://graph.facebook.com/v25.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={META_APP_ID}
  &client_secret={META_APP_SECRET}
  &fb_exchange_token={short_lived_user_token}
```

cURL:
```bash
curl -i -X GET "https://graph.facebook.com/v25.0/oauth/access_token\
?grant_type=fb_exchange_token\
&client_id=${META_APP_ID}\
&client_secret=${META_APP_SECRET}\
&fb_exchange_token=${SHORT_LIVED_USER_TOKEN}"
```

Response:
```json
{
  "access_token": "EAAxxxxxx...",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

Store this as `LONG_LIVED_USER_TOKEN`. It is valid for 60 days.

---

### Step 2 — Get the long-lived Page token from the user token

```
GET https://graph.facebook.com/v25.0/{app-scoped-user-id}/accounts
  ?access_token={long_lived_user_token}
```

`{app-scoped-user-id}` is the Facebook user ID for the account that administers the Page. You can get it with `GET /v25.0/me?access_token=...`.

cURL:
```bash
curl -i -X GET "https://graph.facebook.com/v25.0/me/accounts\
?access_token=${LONG_LIVED_USER_TOKEN}"
```

Response:
```json
{
  "data": [
    {
      "access_token": "EAAxxxxxx...",
      "category": "Real Estate Agent",
      "name": "Ryan Realty",
      "id": "{META_FB_PAGE_ID}",
      "tasks": ["ANALYZE", "ADVERTISE", "MODERATE", "CREATE_CONTENT", "MANAGE"]
    }
  ]
}
```

The `access_token` for your Page entry is the long-lived Page token. Store it as `META_PAGE_ACCESS_TOKEN`.

**This token has no expiration date.**

---

### Step 3 — Store the new token

```bash
# Locally
echo 'META_PAGE_ACCESS_TOKEN=EAAxxxxxx...' >> .env.local

# In Vercel (production)
vercel env add META_PAGE_ACCESS_TOKEN production
```

Or use the sync script: `npm run vercel:env` after updating `.env.local`.

---

### 60-day refresh cron for the user token (optional but recommended)

The long-lived *user* token (not the page token) expires in 60 days and must be refreshed before it does. The page token itself does not expire, but if the user token ever expires without being refreshed, you will need to go through the full OAuth flow again.

Refresh endpoint for user tokens:
```
GET https://graph.facebook.com/v25.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={META_APP_ID}
  &client_secret={META_APP_SECRET}
  &fb_exchange_token={current_long_lived_user_token}
```

This resets the user token to a fresh 60-day window. The token must be at least 24 hours old to be refreshable but must not have expired.

**Practical setup:** Because the page token does not expire, you can skip the cron entirely if you store the page token correctly. Only set up the cron if you need programmatic access to the user token for other purposes (Insights, etc.).

---

### TypeScript helper using `lib/meta-graph.ts` conventions

```typescript
// lib/meta-token.ts
const GRAPH_BASE = 'https://graph.facebook.com/v25.0'

interface TokenExchangeResponse {
  access_token: string
  token_type: string
  expires_in?: number
  error?: { message: string; code: number; type: string }
}

interface AccountsResponse {
  data: Array<{
    access_token: string
    name: string
    id: string
    tasks: string[]
  }>
}

/**
 * Exchange a short-lived user token for a long-lived user token (60 days).
 * Run this once after re-authorizing the Meta app.
 */
export async function exchangeForLongLivedUserToken(
  appId: string,
  appSecret: string,
  shortLivedToken: string
): Promise<string> {
  const url =
    `${GRAPH_BASE}/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${appId}` +
    `&client_secret=${appSecret}` +
    `&fb_exchange_token=${encodeURIComponent(shortLivedToken)}`

  const res = await fetch(url)
  const data = (await res.json()) as TokenExchangeResponse

  if (data.error) {
    throw new Error(`Token exchange failed: ${data.error.message} (code ${data.error.code})`)
  }
  return data.access_token
}

/**
 * Retrieve all Page tokens for pages the user administers.
 * Use this to get the long-lived Page token (which never expires).
 * Pass the long-lived USER token obtained from exchangeForLongLivedUserToken().
 */
export async function getPageTokens(
  longLivedUserToken: string
): Promise<AccountsResponse['data']> {
  const url = `${GRAPH_BASE}/me/accounts?access_token=${encodeURIComponent(longLivedUserToken)}`
  const res = await fetch(url)
  const data = (await res.json()) as AccountsResponse
  return data.data ?? []
}

/**
 * One-shot: exchange short-lived user token → get the page token for a specific page.
 * Store the returned string as META_PAGE_ACCESS_TOKEN in .env.local.
 */
export async function refreshPageToken(
  appId: string,
  appSecret: string,
  shortLivedToken: string,
  pageId: string
): Promise<string> {
  const longLivedUserToken = await exchangeForLongLivedUserToken(appId, appSecret, shortLivedToken)
  const pages = await getPageTokens(longLivedUserToken)
  const page = pages.find((p) => p.id === pageId)
  if (!page) {
    throw new Error(`Page ${pageId} not found in accounts. Available: ${pages.map((p) => p.id).join(', ')}`)
  }
  return page.access_token
}
```

**How to run a one-time refresh from the terminal:**

```bash
# Get a fresh short-lived user token from:
# Meta App Dashboard → Tools → Graph API Explorer → Get User Access Token
# (select pages_manage_posts, instagram_content_publish, instagram_basic, pages_read_engagement)
#
# Then in a one-off script:
node -e "
const { refreshPageToken } = require('./lib/meta-token')
refreshPageToken(
  process.env.META_APP_ID,
  process.env.META_APP_SECRET,
  '<PASTE_SHORT_LIVED_TOKEN_HERE>',
  process.env.META_FB_PAGE_ID
).then(t => console.log('NEW PAGE TOKEN:', t))
"
```

---

## Required permissions/scopes

All permissions require your app to be in **Live mode** (not Development mode) for non-admin users. The ones marked Advanced Access require Business Verification and app review.

| Permission | What it enables | Access level | Dependencies |
|---|---|---|---|
| `pages_show_list` | See list of pages user manages | Standard | — |
| `pages_read_engagement` | Read Page posts, follower data, metadata | Standard | `pages_show_list` |
| `pages_manage_posts` | Create, edit, delete Page posts (FB feed, photos, videos, scheduled) | Standard | `pages_read_engagement`, `pages_show_list` |
| `pages_manage_metadata` | Subscribe to webhooks on the Page | Standard | `pages_show_list` |
| `pages_messaging` | Send/receive Messenger DMs on behalf of the Page | Standard | `pages_manage_metadata`, `pages_show_list` |
| `instagram_basic` | Read IG account profile and media | Standard | — |
| `instagram_content_publish` | Post photos, videos, Reels, Stories, Carousels to IG | Standard | `instagram_basic`, `pages_read_engagement`, `pages_show_list` |
| `instagram_manage_comments` | Create, delete, hide comments; read @mentions | Standard | `instagram_basic`, `pages_read_engagement`, `pages_show_list` |
| `instagram_manage_messages` | Read and reply to IG Direct inbox | Standard | `instagram_basic`, `pages_read_engagement`, `pages_show_list` |

**Note on `instagram_manage_comments`:** Advanced Access is required to receive comment webhooks in Live mode (per official webhook docs). File for Advanced Access when setting up the engagement bot.

**Review requirement for each permission:** Use-case description + screencast showing the login flow and the specific feature (comment CRUD, message send/receive, post publish). Meta now uses video screencasts as the preferred format over static screenshots.

---

## Posting capabilities

### Facebook Page

#### Text / link post
```
POST https://graph.facebook.com/v25.0/{META_FB_PAGE_ID}/feed
Body:
  message=<text>
  link=<url>          # optional
  access_token=<META_PAGE_ACCESS_TOKEN>
```
Returns `{ "id": "{page_id}_{post_id}" }`.

#### Photo
```
POST https://graph.facebook.com/v25.0/{META_FB_PAGE_ID}/photos
Body:
  url=<image_url>     # must be HTTPS, publicly accessible
  caption=<text>
  access_token=<META_PAGE_ACCESS_TOKEN>
```

#### Video (standard URL pull, no size limit stated in docs — use for <100 MB)
```
POST https://graph.facebook.com/v25.0/{META_FB_PAGE_ID}/videos
Body:
  file_url=<video_url>
  title=<title>
  description=<description>
  access_token=<META_PAGE_ACCESS_TOKEN>
```

#### Reels (chunked upload, required for all FB Reels regardless of size)

The FB Reels flow uses a 3-phase `upload_phase` protocol at `/{page-id}/video_reels` — already implemented in `lib/meta-graph.ts` as `publishFacebookReel()`. The current implementation is correct. Key points:
- Phase 1: `upload_phase=start` → returns `video_id` + `upload_url`
- Phase 2: POST binary to `upload_url` with `Authorization: OAuth {token}`, `offset: 0`, `file_size: {bytes}`
- Phase 3: `upload_phase=finish` with `video_id`, `video_state=PUBLISHED`, `description`

#### Scheduled post
```
POST https://graph.facebook.com/v25.0/{META_FB_PAGE_ID}/feed
Body:
  message=<text>
  published=false
  scheduled_publish_time=<unix_timestamp>   # must be 10 min to 30 days from now
  access_token=<META_PAGE_ACCESS_TOKEN>
```
The scheduled time is a Unix epoch integer (seconds, not milliseconds). Maximum scheduling window is 30 days out. Requires `pages_manage_posts`. Works for photos and link posts; not supported for Groups.

---

### Instagram Business

All IG publishing uses the two-step (or four-step for carousel) container model:
1. Create container → get `container_id`
2. (for video) Poll until `status_code=FINISHED`
3. Publish: `POST /{ig-user-id}/media_publish` with `creation_id={container_id}`

Containers expire after **24 hours** if not published. The account is limited to **400 container creations per 24-hour rolling period** and **100 published posts per 24-hour rolling period**.

#### Single image
```
POST https://graph.facebook.com/v25.0/{META_IG_BUSINESS_ACCOUNT_ID}/media
Body:
  image_url=<https_url>
  caption=<text>             # max 2200 chars, max 30 hashtags, max 20 @mentions
  access_token=<META_PAGE_ACCESS_TOKEN>
```

#### Single video (feed)
```
POST https://graph.facebook.com/v25.0/{META_IG_BUSINESS_ACCOUNT_ID}/media
Body:
  media_type=VIDEO
  video_url=<https_url>
  caption=<text>
  cover_url=<thumb_url>      # optional; if omitted uses first frame
  access_token=<META_PAGE_ACCESS_TOKEN>
```
Then poll until `status_code=FINISHED`, then publish.

#### Reel (via URL pull)
```
POST https://graph.facebook.com/v25.0/{META_IG_BUSINESS_ACCOUNT_ID}/media
Body:
  media_type=REELS
  video_url=<https_url>      # must be HTTPS, publicly reachable
  caption=<text>
  share_to_feed=true         # also shows on main feed; defaults true
  cover_url=<thumb_url>      # optional
  collaborators=["iguser1"]  # optional, max 3
  access_token=<META_PAGE_ACCESS_TOKEN>
```

Reel duration: **3 seconds minimum, 15 minutes maximum**. For Ryan Realty's 30–60s listing videos: URL pull is fine (no chunked upload needed for files under a few hundred MB served from a stable HTTPS URL like Vercel or Supabase Storage).

Chunked upload is only needed if: (a) the video file is local (not URL-accessible), or (b) the connection is unreliable. See "Resumable upload" section below.

#### Reel (resumable upload for local files)
```
Step 1 — Create container with upload_type=resumable:
POST https://graph.facebook.com/v25.0/{META_IG_BUSINESS_ACCOUNT_ID}/media
Body:
  media_type=REELS
  upload_type=resumable
  caption=<text>
  access_token=<META_PAGE_ACCESS_TOKEN>

Response: { id: "<CONTAINER_ID>" }
  (also includes upload URI in some clients — if not, construct it manually)

Step 2 — Upload binary to rupload:
POST https://rupload.facebook.com/ig-api-upload/v25.0/{CONTAINER_ID}
Headers:
  Authorization: OAuth {META_PAGE_ACCESS_TOKEN}
  offset: 0                        # starting byte (0 for fresh upload)
  file_size: {file_size_in_bytes}  # integer, no units
Body: <raw video binary>

To resume after interruption:
  GET https://graph.facebook.com/v25.0/{CONTAINER_ID}?fields=id,status,status_code,video_status
  Read uploading_phase.bytes_transferred
  Retry Step 2 with offset={bytes_transferred}

Step 3 — Poll status:
GET https://graph.facebook.com/v25.0/{CONTAINER_ID}?fields=status_code&access_token={token}
Poll every 5-10 seconds until status_code=FINISHED (or ERROR/EXPIRED).

Step 4 — Publish:
POST https://graph.facebook.com/v25.0/{META_IG_BUSINESS_ACCOUNT_ID}/media_publish
Body:
  creation_id={CONTAINER_ID}
  access_token={token}
```

**Note:** The `rupload.facebook.com` host is different from `graph.facebook.com`. The Authorization header uses `OAuth` prefix (not `Bearer`). If you use `file_url` header instead of raw binary body, you can point to a hosted URL instead of uploading bytes directly — this is functionally identical to the URL-pull method.

#### Carousel (up to 10 items, images and/or videos)

Already implemented in `lib/meta-graph.ts` as `publishCarousel()`. Current implementation is correct. Flow:
1. Create one child container per item (with `is_carousel_item=true`)
2. Wait for any video children to reach `FINISHED`
3. Create parent carousel container with `media_type=CAROUSEL` and `children=[child_id_1, child_id_2, ...]`
4. Publish

Carousel caption goes on the parent container, not the children. Mixed image+video carousels are supported. Stories carousels are not supported via the API — only feed carousels.

#### Story (image or video)

Already implemented in `lib/meta-graph.ts` as `publishStory()`. Story images show for 7 seconds. Story videos: 3-second minimum, 60-second maximum per slide. API does not support multiple story slides in one call — publish each slide separately.

Stories support `user_tags`, `product_tags`, and `location_id`. Poll stickers, question stickers, and slider stickers are **not available via the API** — they are native app only.

#### Scheduled posts — Instagram

**Instagram does not support scheduled publishing via the API.** There is no `scheduled_publish_time` parameter for IG containers. The `media_publish` call fires immediately. To schedule IG posts: create the container (Step 1) and store the `container_id`, then call `media_publish` from a cron job at the desired time. Containers are valid for up to 24 hours.

```typescript
// Pseudo-pattern for IG scheduling:
// 1. At content creation time — create container, get container_id
// 2. Store: { container_id, scheduled_for: <unix_ms>, ig_user_id } in DB
// 3. Cron job checks every minute for containers where scheduled_for <= now
// 4. Call media_publish with creation_id=container_id
// Note: container must be published within 24h of creation
```

---

### Threads

Threads uses a **completely separate API** with a different base URL and different token type. It is not part of the Graph API call path, despite using the same Meta developer platform and OAuth infrastructure.

| Attribute | Instagram Graph API | Threads API |
|---|---|---|
| Base URL | `https://graph.facebook.com/v25.0` | `https://graph.threads.net/v1.0` |
| Token type | Long-lived Page Access Token | Long-lived User Access Token |
| Token duration | No expiration | 60 days (refreshable) |
| Token refresh endpoint | `/me/accounts` | `/refresh_access_token?grant_type=th_refresh_token` |
| Permissions prefix | `instagram_*`, `pages_*` | `threads_*` |
| Carousel endpoint | `/{ig-user-id}/media` | `/{user-id}/threads` |
| Publish endpoint | `/{ig-user-id}/media_publish` | `/{user-id}/threads_publish` |

#### Threads permissions

| Permission | Required for |
|---|---|
| `threads_basic` | All API calls — mandatory |
| `threads_content_publish` | Publishing posts |
| `threads_manage_insights` | Analytics |
| `threads_manage_replies` | Reply management, moderation |

#### Threads publishing endpoints

```
Text post:
POST https://graph.threads.net/v1.0/{user-id}/threads
  text=<content>                  # max 500 chars
  media_type=TEXT
  access_token=<threads_user_token>

Image post:
POST https://graph.threads.net/v1.0/{user-id}/threads
  image_url=<https_url>
  media_type=IMAGE
  text=<caption>

Video post:
POST https://graph.threads.net/v1.0/{user-id}/threads
  video_url=<https_url>
  media_type=VIDEO
  text=<caption>

Carousel:
  Step 1: Create items (×N calls with is_carousel_item=true)
  Step 2: POST /{user-id}/threads with media_type=CAROUSEL and children=[item_ids]
  Step 3: POST /{user-id}/threads_publish with creation_id=<container_id>

Reply to a post:
POST https://graph.threads.net/v1.0/{user-id}/threads
  text=<reply>
  reply_to_id=<parent_thread_id>
```

#### Threads token refresh (60-day cycle — must automate)

Unlike page tokens, Threads tokens expire in 60 days. Refresh before expiry:

```
GET https://graph.threads.net/refresh_access_token
  ?grant_type=th_refresh_token
  &access_token=<current_long_lived_threads_token>

Response: { access_token, token_type: "bearer", expires_in: <seconds> }
```

The token must be at least 24 hours old and not yet expired to refresh. Set up a cron at day 45 to refresh (15-day buffer before the 60-day expiry).

#### Recent Threads API additions (April 2026)

- Text posts up to **10,000 characters** (via scheduling tools / API, not just the app)
- GIF support in scheduled posts
- Spoiler tags for text, image, and video posts
- Sharing Threads posts to Instagram Stories (cross-post)
- Webhook notifications when posts are published or deleted
- Reply approvals
- oEmbed for embedding public Threads posts

**Current status:** Ryan Realty has `BUFFER_PROFILE_THREADS` in `.env.example`, meaning Threads is currently published via Buffer (a third-party scheduler) rather than direct API. Direct Threads API requires app review for `threads_content_publish` — a 2–4 week process per scope.

---

## Format constraints

### Instagram

| Format | Aspect ratio | Min duration | Max duration | Notes |
|---|---|---|---|---|
| Reel | 9:16 (1080×1920) | 3 s | 15 min | 3–90s for best algorithmic performance |
| Feed video | 4:5 or 1:1 | 3 s | 60 min | 4:5 (1080×1350) optimal for feed |
| Story image | 9:16 | n/a | n/a | Displayed for 7 s |
| Story video | 9:16 | 3 s | 60 s per slide | One slide per API call |
| Carousel item | any (all same) | — | — | Max 10 items; mix image+video OK |

### Facebook

| Format | Aspect ratio | Min duration | Max duration | Notes |
|---|---|---|---|---|
| Reel | 9:16 | 3 s | 90 s | Use `video_reels` endpoint |
| Feed video | any | 1 s | 240 min | Standard `videos` endpoint |
| Photo | any | — | — | `photos` endpoint |

### Threads

| Format | Max length | Notes |
|---|---|---|
| Text post | 10,000 chars | 500 chars in native app; 10K via API |
| Video | 5 min | 9:16 preferred |

Ryan Realty's 30–45s listing videos (1080×1920, h264) map perfectly to IG Reels and FB Reels with no conversion needed.

---

## Best-practice posting (algorithm 2026)

### Instagram Reels

Research basis: Later analyzed 975,000+ Reels (Jan–Oct 2024); Buffer analyzed 14M+ posts; Sprout Social analyzed 1.9B+ engagements (Nov 2025–Feb 2026).

**Algorithm priority signals (2026):**
1. **Sends per reach** — most important signal per Adam Mosseri. When viewers DM your Reel to a friend, the algorithm reads it as high-quality signal and expands distribution.
2. **Engagement velocity in first 30–60 minutes** — early likes, comments, saves, shares all matter. Late engagement is discounted.
3. **Watch-through rate** — percentage who watch to the end. Ryan Realty's 30–45s videos at < 60s max duration is the right call here.

**Best times for Reels (lower competition, faster velocity):**

| Day | Best window | Notes |
|---|---|---|
| Monday | 12 AM–6 AM | Later: highest measured engagement; low posting competition |
| Tuesday | 8 AM–12 PM | Second-tier window; morning scroll behavior |
| Wednesday | 8 AM–12 PM, 7–9 PM | Mid-week peak |
| Thursday | 8 AM–12 PM | Consistent performer |
| Friday | 7–9 PM | End-of-week leisure scroll |
| Saturday | 8–11 AM | Weekend morning |
| Sunday | 7–9 PM | Pre-week scroll |

**Practical recommendation for Ryan Realty:** Post listing Reels Tuesday–Thursday, 9–11 AM Pacific (accounts for national audience). Market update posts: Monday AM or Wednesday 8 AM.

**Caption strategy:**
- First 125 characters are above the fold on mobile — hook goes there, not a hashtag dump
- 3–5 hashtags max (rest in first comment to keep caption clean)
- No hashtag stuffing — the algorithm deprioritizes it as of 2024+
- Include a CTA that encourages shares/DMs ("Send this to someone buying in Bend")

### Facebook Pages

**Best times (Sprout Social 2026, 1.9B engagements):**

| Day | Best windows | Notes |
|---|---|---|
| Monday | 12–1 PM | — |
| Tuesday | 12–8 PM | High performer |
| Wednesday | 12–8 PM | Top day overall |
| Thursday | 12–8 PM | — |
| Friday | 12–1 PM | Drops off after |

**Single best time:** Wednesday 9–11 AM. Use for market update posts and listing announcements.

**Algorithm note:** Posts that get 10+ reactions + 5+ comments in the first hour get expanded to 5–10x more feeds. Prioritize posting when Matt or the Ryan Realty team can respond immediately to early comments to boost that velocity.

---

## 5 worked examples

### Example 1 — IG Reel from listing video MP4

```typescript
import { publishReel } from '@/lib/meta-graph'

const ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN!
const IG_USER_ID = process.env.META_IG_BUSINESS_ACCOUNT_ID!

// The MP4 must be served from a stable HTTPS URL (Vercel blob, Supabase Storage, etc.)
const mediaId = await publishReel(
  ACCESS_TOKEN,
  IG_USER_ID,
  'https://ryan-realty.com/v5_library/listing-1234-reel.mp4',
  `Bend's market just shifted. Here's what buyers need to know right now.\n\n#BendOregon #BendRealEstate #ORealEstate`,
  {
    coverUrl: 'https://ryan-realty.com/v5_library/listing-1234-thumb.jpg',
    shareToFeed: true,
  }
)
console.log('Published Reel ID:', mediaId)
```

The `publishReel()` function in `lib/meta-graph.ts` already polls the container status automatically via `waitForContainer()`. No additional polling needed.

---

### Example 2 — FB Reel cross-post with longer caption

```typescript
import { publishFacebookReel } from '@/lib/meta-graph'

const ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN!
const PAGE_ID = process.env.META_FB_PAGE_ID!

const videoId = await publishFacebookReel(
  ACCESS_TOKEN,
  PAGE_ID,
  'https://ryan-realty.com/v5_library/listing-1234-reel.mp4',
  // FB captions can be longer — use the full description here
  `Bend's real estate market shifted this week. Active listings are up 12% YoY while median prices held firm at $475,000. Here's what that means if you're buying or selling this spring.\n\nDM us or call 541-xxx-xxxx for a no-pressure consultation.`
)
console.log('Published FB Reel ID:', videoId)
```

---

### Example 3 — IG Carousel for neighborhood spotlight (8 photos)

```typescript
import { publishCarousel } from '@/lib/meta-graph'

const ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN!
const IG_USER_ID = process.env.META_IG_BUSINESS_ACCOUNT_ID!

const mediaId = await publishCarousel(
  ACCESS_TOKEN,
  IG_USER_ID,
  [
    { mediaUrl: 'https://ryan-realty.com/img/awbrey-butte-01.jpg', mediaType: 'image' },
    { mediaUrl: 'https://ryan-realty.com/img/awbrey-butte-02.jpg', mediaType: 'image' },
    { mediaUrl: 'https://ryan-realty.com/img/awbrey-butte-03.jpg', mediaType: 'image' },
    { mediaUrl: 'https://ryan-realty.com/img/awbrey-butte-04.jpg', mediaType: 'image' },
    { mediaUrl: 'https://ryan-realty.com/img/awbrey-butte-05.jpg', mediaType: 'image' },
    { mediaUrl: 'https://ryan-realty.com/img/awbrey-butte-06.jpg', mediaType: 'image' },
    { mediaUrl: 'https://ryan-realty.com/img/awbrey-butte-07.jpg', mediaType: 'image' },
    { mediaUrl: 'https://ryan-realty.com/img/awbrey-butte-08.jpg', mediaType: 'image' },
  ],
  `Awbrey Butte: 8 things locals know about living here.\n\nSlide through for the real story.\n\n#BendOregon #AwbreyButte #BendLiving`
)
console.log('Published Carousel ID:', mediaId)
```

---

### Example 4 — IG Story for new listing

Stories via the API do not support interactive stickers (poll, question, slider — native app only). A simple image story is the extent of what the API supports.

```typescript
import { publishStory } from '@/lib/meta-graph'

const ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN!
const IG_USER_ID = process.env.META_IG_BUSINESS_ACCOUNT_ID!

// Image must be 9:16 and at least 1080×1920 for best quality
const mediaId = await publishStory(
  ACCESS_TOKEN,
  IG_USER_ID,
  'https://ryan-realty.com/img/new-listing-1234-story.jpg',
  'image'
)
console.log('Published Story ID:', mediaId)
```

---

### Example 5 — Scheduled FB post for Monday morning market update

```typescript
import { postJson } from '@/lib/meta-graph'  // postJson is internal — expose it or inline

const ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN!
const PAGE_ID = process.env.META_FB_PAGE_ID!

// Schedule for next Monday 9 AM PT
const nextMonday9amPT = new Date()
nextMonday9amPT.setDate(nextMonday9amPT.getDate() + ((1 + 7 - nextMonday9amPT.getDay()) % 7))
nextMonday9amPT.setHours(9, 0, 0, 0)
const scheduledTimestampSeconds = Math.floor(nextMonday9amPT.getTime() / 1000)

// NOTE: scheduled_publish_time must be 10 minutes to 30 days from now
const response = await fetch(`https://graph.facebook.com/v25.0/${PAGE_ID}/feed`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: `Bend market update: median price $475,000, 2.8 months of supply (seller's market). Full report at ryan-realty.com/reports`,
    published: false,
    scheduled_publish_time: scheduledTimestampSeconds,
    access_token: ACCESS_TOKEN,
  }),
})
const data = await response.json()
console.log('Scheduled post ID:', data.id)
```

**Add `publishScheduledFacebookPost()` to `lib/meta-graph.ts`** — this is a missing function the existing file does not have.

---

## Engagement bot — comments and DMs

### Webhook setup

To receive real-time comment and DM events (vs polling), set up an Instagram webhook subscription. This is required for the `engagement_bot` automation skill.

**Subscription fields:**

```
POST https://graph.facebook.com/v25.0/{META_APP_ID}/subscriptions
Body:
  object=instagram
  callback_url=https://ryan-realty.com/api/webhooks/instagram
  verify_token=<your_random_secret>
  fields=comments,messages
  access_token={META_APP_ID}|{META_APP_SECRET}   # app token format
```

**Required permissions for full engagement bot:**
- `instagram_manage_comments` — read comments + @mentions
- `instagram_manage_messages` — read + reply to DMs
- `pages_manage_metadata` — subscribe to webhooks

**The IG account must be public** to receive comment/mention webhook notifications.

**Advanced Access required** for `instagram_manage_comments` webhooks in Live mode.

### Sending a DM in response to a comment or mention

```typescript
// Endpoint for IG DMs (uses graph.facebook.com, NOT graph.instagram.com)
async function sendInstagramDM(
  accessToken: string,
  recipientIgScopedId: string,
  text: string
): Promise<void> {
  const url = `https://graph.facebook.com/v25.0/me/messages?access_token=${encodeURIComponent(accessToken)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientIgScopedId },
      message: { text },
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`DM send failed: ${JSON.stringify(err)}`)
  }
}
```

**24-hour messaging window:** You can only send automated DMs to a user within 24 hours of their last interaction with you (comment, DM, story reply). After 24 hours, the window closes and automated messages are blocked by the API.

**Rate limit for DMs:** 200 automated DMs per hour (as of February 2026).

---

## Common failure modes

| Failure | Cause | Fix |
|---|---|---|
| `#190 Invalid OAuth access token` | Token expired or revoked | Run token refresh flow (Steps 1–2 above) |
| `#100 Invalid parameter — video_url` | URL is HTTP not HTTPS, or requires auth | Host video on Vercel blob / Supabase Storage with public URL |
| `#9007 Aspect ratio not supported` | Video is not 9:16 | Ensure 1080×1920 for Reels; re-render if needed |
| `#2207001 Video processing failed` | Container stuck in ERROR | Delete container, re-create; check codec (h264 required) |
| Container timeout (EXPIRED) | Container not published within 24 hours | Create a fresh container |
| `#100 children required` | Carousel POST missing children array | Pass comma-separated child container IDs |
| Carousel child container ERROR | Video child not finished processing | Wait for FINISHED on all video children before creating parent |
| Reel upload phase failure | Stream disconnected mid-upload to rupload | Read `bytes_transferred` from status, resume with correct offset |
| Webhook not receiving events | App not in Live mode, or advanced access not granted | Publish app to Live mode; apply for Advanced Access on `instagram_manage_comments` |
| `v22.0` deprecation error | Code still using hardcoded v22.0 | Update `META_GRAPH_BASE` and `META_IG_BASE` to `v25.0` in `lib/meta-graph.ts` |

---

## Response shapes

### IG media container creation
```json
{ "id": "17841400008460056" }
```

### IG container status poll
```json
{
  "status_code": "FINISHED",
  "id": "17841400008460056"
}
```
Possible values: `IN_PROGRESS`, `FINISHED`, `ERROR`, `EXPIRED`, `PUBLISHED`

### IG media publish
```json
{ "id": "17841400045438359" }
```

### FB feed post
```json
{ "id": "123456789_987654321" }
```

### FB Reel start
```json
{
  "video_id": "1234567890",
  "upload_url": "https://rupload.facebook.com/video-upload/..."
}
```

---

## Rate limits

### Instagram Content Publishing Limit
- **100 API-published posts per 24-hour rolling period** per IG account
- Check remaining quota: `GET /{ig-user-id}/content_publishing_limit?fields=config,quota_usage`
- Response: `{ quota_usage: 3, config: { quota_total: 100, quota_duration: 86400 } }`

### Business Use Case (BUC) Rate Limit — Pages and IG API
- Limit formula: `4,800 × number_of_impressions` per 24 hours (scales with account engagement)
- For messaging (Send API): 100 calls/second for text messages, 10 calls/second for media
- For Conversations API: 2 calls/second
- Automated DMs: **200 per hour** hard cap (platform policy, not BUC formula)

### Platform Rate Limit — App-level (user token requests)
- `200 calls per user per hour` for basic Graph API reads
- Scales with total users: 1,000 users = 200,000 calls/hour app-wide

### Rate limit headers in API responses
```
X-App-Usage: {"call_count":15,"total_cputime":3,"total_time":5}
X-Business-Use-Case-Usage: {"<page-id>":[{"call_count":27,"type":"PAGES","estimated_time_to_regain_access":0}]}
```
Monitor `call_count` in `X-App-Usage`. At 80%+ throttle upcoming requests.

---

## Missing capabilities in current `lib/meta-graph.ts`

The following are not yet implemented and should be added:

1. **`publishScheduledFacebookPost()`** — scheduled FB feed post with `published=false` + `scheduled_publish_time`
2. **`getPublishingLimitFB()`** — FB Page publishing quota check (equivalent to existing `getPublishingLimit()` for IG)
3. **`sendInstagramDM()`** — DM send for engagement bot
4. **`subscribeInstagramWebhook()`** — webhook subscription setup for comments + messages
5. **Token refresh helpers** — `exchangeForLongLivedUserToken()` and `getPageTokens()` (see `lib/meta-token.ts` pattern above)
6. **API version constant** — bump `v22.0` → `v25.0` in both `META_GRAPH_BASE` and `META_IG_BASE`
7. **Threads publishing** — entirely absent (separate base URL `graph.threads.net/v1.0`)

---

## Sources

- [Access Token Guide — Meta for Developers](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/)
- [Generate Long-Lived Tokens — Meta for Developers](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived/)
- [Instagram Content Publishing — Meta for Developers](https://developers.facebook.com/docs/instagram-platform/content-publishing/)
- [Resumable Uploads — Instagram Platform](https://developers.facebook.com/docs/instagram-platform/content-publishing/resumable-uploads/)
- [IG User Media Reference — Meta for Developers](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/)
- [Instagram Webhooks — Meta for Developers](https://developers.facebook.com/docs/instagram-platform/webhooks/)
- [Threads Long-Lived Tokens — Meta for Developers](https://developers.facebook.com/docs/threads/get-started/long-lived-tokens/)
- [Permissions Reference — Meta for Developers](https://developers.facebook.com/docs/permissions/)
- [Rate Limits — Graph API](https://developers.facebook.com/docs/graph-api/overview/rate-limiting/)
- [Graph API v25.0 Changelog — Meta for Developers](https://developers.facebook.com/docs/graph-api/changelog/version25.0/)
- [Best Time to Post on Instagram 2026 — Later (975K+ Reels)](https://later.com/blog/best-time-to-post-on-instagram/)
- [Best Times to Post on Facebook 2026 — Sprout Social (1.9B engagements)](https://sproutsocial.com/insights/best-times-to-post-on-facebook/)
- [How to Post to Threads via API — Postproxy](https://postproxy.dev/blog/how-to-post-to-threads-via-api/)
- [Instagram Reels API Guide 2026 — Phyllo](https://www.getphyllo.com/post/a-complete-guide-to-the-instagram-reels-api)
