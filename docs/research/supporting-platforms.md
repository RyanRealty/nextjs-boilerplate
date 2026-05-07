# Tools: X / Pinterest / Threads / Google Business Profile (supporting platforms)

Research date: 2026-05-06

---

## X / Twitter API v2

### Current implementation

`lib/x.ts` implements full OAuth 2.0 with PKCE. Auth URL is `https://twitter.com/i/oauth2/authorize`, token URL is `https://api.twitter.com/2/oauth2/token`. PKCE verifiers are stored in Upstash Redis with a 600-second TTL. Tokens (access + refresh) are persisted in Supabase table `x_auth` with a single `id='default'` row. Access tokens are auto-refreshed using the stored refresh token when within 60 seconds of expiry.

Endpoints used:
- `POST https://api.twitter.com/2/tweets` — tweet creation (text + optional media IDs)
- `POST https://upload.twitter.com/1.1/media/upload.json` — chunked media upload (INIT / APPEND / FINALIZE / STATUS cycle, 5 MB chunks)

Scopes configured: `tweet.write tweet.read users.read offline.access`

Only one media ID is attached per tweet (the implementation accepts a single `mediaId`). No thread chaining, no quote-tweet, no poll creation is implemented yet.

### Capabilities

- Text tweet: up to 280 characters (standard); 25,000 characters with X Premium (not relevant for API posting)
- Media per tweet: up to 4 images OR 1 video (API constraint)
- Video: up to 2 minutes 20 seconds on standard; 3 hours on X Premium — max file size 512 MB for async upload; 9:16, 1:1, or 16:9 aspect ratios accepted
- Thread (multi-tweet): create tweet, then reply to its own ID in subsequent POST calls — not yet implemented in `lib/x.ts`
- Quote-tweet: include `quote_tweet_id` field in POST body — not yet implemented
- Polls: include `poll` object with options + duration — not yet implemented

### Auth + endpoint (verified 2026-05-06)

- Auth URL: `https://twitter.com/i/oauth2/authorize`
- Token URL: `https://api.twitter.com/2/oauth2/token`
- Flow: OAuth 2.0 Authorization Code with PKCE (S256 code challenge)
- Tweet endpoint: `POST https://api.twitter.com/2/tweets`
- Media upload: `POST https://upload.twitter.com/1.1/media/upload.json` (v1.1 endpoint — still required for media; v2 has no media upload endpoint of its own)
- Scopes: `tweet.write tweet.read users.read offline.access`

### Pricing tiers (verified 2026-05-06)

X eliminated its fixed-price free and Basic tiers for new signups on **February 6, 2026**. The current default for any new developer app is **pay-per-use**.

| Action | Pay-per-use cost |
|---|---|
| POST /2/tweets (create) | $0.015 per post (updated April 20, 2026 from $0.01) |
| POST /2/tweets with URL | $0.20 per post |
| GET post reads | $0.001 per post read (own-account reads, updated April 20, 2026) |
| GET post reads (others) | $0.005 per post read |

**Legacy tier status:** Accounts that subscribed to Basic ($200/month, 50K posts/month write access) or Pro ($5,000/month) before February 2026 can remain on those plans. New signups cannot purchase them. If Ryan Realty's app was created before February 2026 and was on Basic, that access is preserved as long as the subscription is maintained. If the app is new, all posting costs are pay-per-use at the rates above.

**Practical cost at pay-per-use:** Posting 30 times/month (daily) = $0.45/month in tweet write credits (excludes URL posts). Posting with a destination URL (e.g., a listing link) in every tweet = $6.00/month for 30 posts.

**Current tier for Ryan Realty:** Unknown — check the X Developer Console at `https://developer.x.com` to confirm whether the app is on a legacy fixed plan or pay-per-use.

### Best practices (algorithm 2026)

X's algorithm in 2026 scores content on engagement velocity in the first 30 minutes (replies weight most heavily, then reposts, then likes), creator verification status, and media presence. Native video outperforms embedded YouTube links by a significant margin in feed distribution.

- Posting frequency: 3–7 posts per day for maximum algorithmic reach; minimum 1–2 to maintain baseline visibility
- Best times: 8–9 AM, 12–1 PM, 5–6 PM local time on weekdays; Saturday morning performs well for real estate content
- Native video: always preferred over YouTube links
- Quote-tweeting trending real estate threads amplifies reach without burning a new tweet slot
- Polls generate strong early engagement; useful for market sentiment questions ("Bend buyers: are you waiting for rates to drop?")
- Hashtags: 1–2 max; X's 2025 algorithm update reduced hashtag weight — avoid keyword stuffing

### 2 examples

**Example 1 — Listing announcement with 9:16 video**
```
Redmond, OR. 4BR at $572K. 
New listing just dropped — full tour below.

#BendOregon #RedmondOregon
[VIDEO ATTACHED — 9:16 MP4, under 2:20]
```

**Example 2 — 5-tweet market data thread**
```
Tweet 1: Bend, OR housing market — April 2026 data thread. Five numbers that matter. 🧵

Tweet 2 (reply to 1): Median close price: $487,000. Up 3.2% year-over-year.

Tweet 3 (reply to 2): Active listings: 412. Closed in the past 6 months: 624.

Tweet 4 (reply to 3): Months of supply: 3.96. Seller's market by any measure.

Tweet 5 (reply to 4): DOM median: 24 days. Still moving fast in the sub-$600K range. Full report → [URL]
```

---

## Pinterest API

### Current implementation

`lib/pinterest.ts` uses OAuth 2.0 with state validation (no PKCE — Pinterest's standard flow). Auth URL is `https://www.pinterest.com/oauth/`, token URL is `https://api.pinterest.com/v5/oauth/token`. State tokens stored in Upstash Redis with 600-second TTL. Access tokens and refresh tokens persisted in Supabase table `pinterest_auth`.

Token lifetime: default 30 days (`expires_in` fallback of 2,592,000 seconds). Refresh window is 5 minutes before expiry.

Endpoints used:
- `GET https://api.pinterest.com/v5/boards` — list boards (fallback when `PINTEREST_DEFAULT_BOARD_ID` not set)
- `POST https://api.pinterest.com/v5/media` — register video upload (returns presigned S3 URL)
- `GET https://api.pinterest.com/v5/media/{media_id}` — poll processing status
- `POST https://api.pinterest.com/v5/pins` — create pin with `video_id` media source

Scopes: `boards:read pins:write` — note: `pins:read` is NOT in the scope string (only write). Board ID is resolved from env var `PINTEREST_DEFAULT_BOARD_ID` or via first-board fallback.

Only video pins are implemented. Static image pins are not yet implemented in `lib/pinterest.ts`.

### Capabilities

**Image Pin:**
- Image formats: JPEG, PNG, WEBP
- Max file size: 32 MB
- Recommended ratio: 2:3 (1000×1500 px) — performs best in feed
- 1:1 square and 1.91:1 landscape also supported
- Title: up to 100 characters
- Description: up to 500 characters
- Destination URL: yes (direct link out — major advantage over IG/TT)

**Video Pin:**
- Duration: 4 seconds to 15 minutes (shorter typically performs better — 15–30 seconds ideal)
- Format: MP4 (H.264), MOV
- Max size: 2 GB
- Recommended ratio: 1:1 or 2:3; 9:16 supported
- Title + description + destination URL all supported

**Idea Pin (multi-page):**
- Up to 20 pages; mix of images and video
- No outbound link on Idea Pins (destination URL not supported)
- Best for how-to, neighborhood guides, buyer/seller education

**Boards and Sections:**
- Organize by topic: "Bend Oregon Homes," "Central Oregon Living," "Buyer Tips," etc.
- API supports board and section management (not currently implemented in `lib/pinterest.ts`)

### Auth + endpoint (verified 2026-05-06)

- Auth URL: `https://www.pinterest.com/oauth/`
- Token URL: `https://api.pinterest.com/v5/oauth/token`
- Flow: OAuth 2.0 Authorization Code (no PKCE)
- Pins endpoint: `POST https://api.pinterest.com/v5/pins`
- Media upload: `POST https://api.pinterest.com/v5/media` (returns S3 presigned URL)
- Scopes in use: `boards:read pins:write`
- Missing scope to add: `pins:read` (needed to audit existing pins)

### Best practices (algorithm 2026)

Pinterest functions as a visual search engine, not a social feed. Content has a long shelf life — a well-optimized pin can surface in search results weeks or months after posting. Video views on the platform have increased over 240% year-over-year; video pins deliver approximately 2x the engagement of static image pins.

- Posting frequency: 3–7 new pins per week per topic cluster; consistency matters more than volume
- Best times: 8 PM–11 PM; Saturdays and Sundays outperform weekdays for engagement
- Pin titles and descriptions are SEO-critical — treat them like meta descriptions: include "Bend Oregon," "Central Oregon homes," "real estate market," specific neighborhoods
- Video length: 15–30 seconds performs best; loop-friendly content boosts replays
- Niche boards are essential — create separate boards for listings, market data, neighborhood guides, buyer tips
- Destination URL is the key differentiator from every other platform: every listing pin links directly to the listing page
- Hashtags: 5–7 keyword hashtags; Pinterest's search algorithm uses them

### 2 examples

**Example 1 — Listing video pin**
```
Board: Bend Oregon Homes for Sale
Title: 4-Bedroom Home in NorthWest Crossing, Bend OR — $572,000
Description: Three-car garage, main-floor primary suite, mountain views from the back deck. 
Bend, Oregon real estate | NorthWest Crossing homes | Bend homes for sale under $600K
#BendOregon #NorthWestCrossing #CentralOregonHomes #BendRealEstate #ORealEstate
Link → [listing page URL]
[VIDEO: 9:16 or 2:3, 30-second listing reel]
```

**Example 2 — Neighborhood guide Idea Pin (20 pages)**
```
Title: NorthWest Crossing, Bend OR — What It's Actually Like to Live Here
Page 1: Neighborhood map overlay on aerial photo
Page 2: "3 miles to downtown Bend" stat card
Page 3: Drake Park photo — "One of Oregon's most walkable neighborhoods"
Page 4: Median home price data card
Page 5: Lifestyle photo — coffee shop, trail access
... (market stats, school info, commute times, etc.)
Page 20: "Explore homes for sale → ryan-realty.com"
```

---

## Threads API

### Current implementation

`lib/threads.ts` uses the **Threads Graph API** — confirmed NOT via `api.threadsapi.io` (which is an unofficial third-party wrapper). The implementation uses Meta's official endpoints:
- Auth URL: `https://www.threads.net/oauth/authorize`
- Short-lived token: `https://graph.threads.net/oauth/access_token`
- Long-lived token: `https://graph.threads.net/access_token`
- API base: `https://graph.threads.net/v1.0`

This is **separate from the Instagram Graph API** (which uses `graph.facebook.com`). Threads has its own distinct token system, its own scopes, and its own base domain (`graph.threads.net` vs `graph.facebook.com`). A Threads token is not interchangeable with an Instagram token.

The implementation handles the two-step Threads token flow correctly: exchange authorization code for a short-lived token (1 hour), then immediately exchange that for a long-lived token (~60 days, `expires_in` fallback 5,184,000 seconds). Token refresh uses `grant_type: th_refresh_token`, which is Threads-specific. Tokens stored in Supabase table `threads_auth`.

Scopes: `threads_basic,threads_content_publish`

The publish flow is correctly implemented as a two-step container model:
1. `POST /{user_id}/threads` — create media container (VIDEO type, video_url, text)
2. Poll `GET /{container_id}?fields=status,error_message` until status = `FINISHED`
3. `POST /{user_id}/threads_publish` — publish container using creation_id

Only VIDEO posts with text are implemented. Text-only posts, image posts, and carousel posts are not yet implemented in `lib/threads.ts`.

### Capabilities

- Text post: 500 characters max (emojis count by UTF-8 byte length)
- Image: JPEG or PNG, 1 per post or up to 10 in a carousel; recommended 1080×1350 (4:5 portrait), also supports 1:1 and 1.91:1
- Video: MP4 (H.264), under 5 minutes, under 1 GB; async processing via container model
- Carousel: up to 20 items (images, videos, or mix) — not in `lib/threads.ts` yet
- Reply chains: reply to a container ID to create a thread — not in `lib/threads.ts` yet
- No native hashtags — Threads algorithm does not use them; do not include

### Auth + endpoint (verified 2026-05-06)

- Auth URL: `https://www.threads.net/oauth/authorize` (Threads-specific, NOT Meta/Facebook OAuth URL)
- Short-lived token URL: `https://graph.threads.net/oauth/access_token`
- Long-lived token URL: `https://graph.threads.net/access_token`
- API base: `https://graph.threads.net/v1.0`
- Threads token is **separate from and incompatible with Instagram Graph API tokens**
- Scopes: `threads_basic,threads_content_publish`
- Token lifetime: 60 days; refresh via `grant_type: th_refresh_token` (Threads-specific grant type)
- Requires a Threads account linked to the same Meta developer app

### Best practices (algorithm 2026)

Threads uses an AI ranking system (Meta's description) rather than a traditional algorithm. The most critical signal is **engagement velocity in the first 30–90 minutes** — specifically replies, not likes. A post that gets 20 replies in the first 30 minutes gets distributed more aggressively than one that accumulates 50 likes over 24 hours.

- Posting frequency: 1–3 posts per day is the sweet spot; over 5/day dilutes per-post engagement and the algorithm may reduce distribution
- Best times: 7–9 AM, 12–2 PM, 7–9 PM on weekdays; Wednesday 12–2 PM delivers highest engagement across all slots
- Tone: casual and conversational — Threads penalizes polished-brand content in favor of authentic voice; read more like a text message from a knowledgeable local than a press release
- No hashtags — do not use them; the algorithm ignores them and they look out of place
- Replies matter most — ask a direct question at the end of every post to drive reply engagement
- Video is supplemental, not primary — Threads is text-first; video supports the post but does not replace strong text
- Reply rate is the primary retention signal; reply to every comment in the first hour

### 2 examples

**Example 1 — Text post (no video needed)**
```
Bend sellers: 4.0 months of supply right now.

That's the exact line between a seller's market and balanced. You're still in control but the window is narrowing.

What's your timeline? Drop it below.
```

**Example 2 — Text post with video attachment**
```
We just closed a 4BD in NorthWest Crossing for $27K over list price.

Four offers in 48 hours. Buyers who waited — missed it.

Here's what the winning offer looked like and what didn't work.
[VIDEO: 45-second breakdown, same 9:16 MP4 from listing reel]
```

---

## Google Business Profile API

### Current implementation

`lib/google-business-profile.ts` uses Google's OAuth 2.0 with `access_type: offline` and `prompt: consent` to force refresh token issuance. State tokens stored in Upstash Redis with 600-second TTL. Credentials support both `GOOGLE_BUSINESS_PROFILE_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_ID` env vars (fallback chain).

Endpoints used:
- `https://mybusinessaccountmanagement.googleapis.com/v1/accounts` — list accounts
- `https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/localPosts` — create local post

Scope: `https://www.googleapis.com/auth/business.manage`

The `publishGoogleBusinessLocalPost` function currently supports:
- `summary`: post body text
- `media`: single photo via `sourceUrl` (PHOTO type only, not VIDEO)
- `callToAction`: hardcoded to `LEARN_MORE` type with a URL

Post type is hardcoded to `STANDARD` (`topicType: 'STANDARD'`). EVENT and OFFER types are not implemented. Video media is not implemented.

Account ID and location ID are read from env vars `GOOGLE_BUSINESS_PROFILE_ACCOUNT_ID` and `GOOGLE_BUSINESS_PROFILE_LOCATION_ID`.

### Capabilities

The GBP API v4 `localPosts` endpoint supports four post types:

| Type | Use case | CTA options | Expiry |
|---|---|---|---|
| STANDARD (What's New) | General updates, market data, content | LEARN_MORE, CALL, BOOK, ORDER, SHOP | 7 days |
| EVENT | Open houses, community events | Same CTA options | At event end date |
| OFFER | Promotions, limited-time incentives | SHOP, ORDER | At offer end date |
| PRODUCT | Specific property listings (via catalog) | LEARN_MORE, SHOP | No auto-expiry |

Media per post:
- Photos: up to 10; formats JPEG, PNG; min 250×250 px, max 5 MB each
- Video: 30 seconds to 90 seconds; formats MP4, AVI, MKV, MOV; max 75 MB

Text body: up to 1,500 characters; 150–300 characters performs best in the local panel.

Q&A and review response are also available via GBP API but not currently implemented in `lib/google-business-profile.ts`.

### Auth + endpoint (verified 2026-05-06)

- OAuth URL: `https://accounts.google.com/o/oauth2/v2/auth`
- Token URL: `https://oauth2.googleapis.com/token`
- Posts endpoint: `POST https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/localPosts`
- Accounts list: `GET https://mybusinessaccountmanagement.googleapis.com/v1/accounts`
- Scope: `https://www.googleapis.com/auth/business.manage`
- Token lifetime: 1 hour (access), indefinite (refresh token with offline access)
- Refresh window in `lib/google-business-profile.ts`: 60 seconds before expiry

### Best practices (algorithm 2026)

GBP posts are a **local SEO ranking signal**. Active posting increases the likelihood of appearing in Google's AI Overviews (the AI-generated summaries at the top of local search results), which now appear in approximately 40% of local searches. Businesses that post consistently with locally specific content appear more frequently in those summaries than inactive profiles.

- Posting frequency: minimum 1 post/week; 3–4 posts/week for competitive local markets (real estate qualifies); posts expire after 7 days so consistent scheduling is mandatory
- Post body: 150–300 words for optimal display; include "Bend, Oregon," specific neighborhood names (NorthWest Crossing, Awbrey Butte, Tetherow, Old Mill District), and property types
- CTA button: always include one — `LEARN_MORE` for market reports and listings, `BOOK` for open houses, `CALL` for lead generation
- Photos: include at least one photo per post; listings with photos receive significantly more clicks
- Video: 30–90 second property walkthrough videos are supported and underused by competitors
- Event posts for open houses stay live until the event date rather than expiring in 7 days — use EVENT type, not STANDARD, for open house announcements

### 2 examples

**Example 1 — Weekly market update post (STANDARD type)**
```json
{
  "topicType": "STANDARD",
  "summary": "Bend, Oregon housing market — May 2026.\n\nMedian close price: $487,000. Active listings: 412. Months of supply: 3.96. That puts us in seller's market territory.\n\nNorthWest Crossing and Awbrey Butte continue to see multiple offers on well-priced homes under $600K. Days on market: 24 days median.\n\nThinking of selling in Bend this summer? Now is a favorable window.",
  "callToAction": {
    "actionType": "LEARN_MORE",
    "url": "https://ryan-realty.com/market-reports"
  },
  "media": [
    {
      "mediaFormat": "PHOTO",
      "sourceUrl": "https://ryan-realty.com/assets/market-may-2026.jpg"
    }
  ],
  "languageCode": "en-US"
}
```

**Example 2 — Open house event post (EVENT type)**
```json
{
  "topicType": "EVENT",
  "event": {
    "title": "Open House — 4BR NorthWest Crossing, Bend OR",
    "schedule": {
      "startDate": {"year": 2026, "month": 5, "day": 10},
      "startTime": {"hours": 11, "minutes": 0},
      "endDate": {"year": 2026, "month": 5, "day": 10},
      "endTime": {"hours": 14, "minutes": 0}
    }
  },
  "summary": "Open house this Saturday, May 10, 11 AM–2 PM. 2,640 sq ft, main-floor primary, 3-car garage. Located in NorthWest Crossing — walkable to coffee, trails, and Drake Park. Offered at $572,000.",
  "callToAction": {
    "actionType": "LEARN_MORE",
    "url": "https://ryan-realty.com/listings/123-northwest-crossing"
  },
  "media": [
    {
      "mediaFormat": "PHOTO",
      "sourceUrl": "https://ryan-realty.com/assets/nwx-exterior.jpg"
    }
  ],
  "languageCode": "en-US"
}
```

---

## Gap summary by platform

| Platform | Implementation gaps | Leverage gap |
|---|---|---|
| X | Thread chaining, quote-tweet, polls, multi-image (up to 4) not implemented | Medium — post volume constraints under pay-per-use |
| Pinterest | Image pins not implemented; `pins:read` scope missing; board/section management not implemented | **High** — completely underused; only video pin logic exists; evergreen SEO value untapped |
| Threads | Text-only posts, image posts, carousel not implemented | **High** — text-first platform with no per-post API cost; daily market commentary costs nothing; zero implementation beyond video |
| Google Business Profile | EVENT type not implemented; OFFER type not implemented; video upload not implemented; only STANDARD posts with single photo | **High** — posts expire in 7 days so requires consistent automation; EVENT posts for open houses are longer-lived and not implemented; local SEO impact is significant |
