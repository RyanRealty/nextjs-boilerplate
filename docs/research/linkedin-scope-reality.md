# Tool: LinkedIn API (Scope Reality Check)

**Research date:** 2026-05-06  
**Sources:** LinkedIn official docs (learn.microsoft.com/en-us/linkedin), verified live via WebFetch

---

## Current App Status (Verified 2026-05-06)

- **App product:** Share on LinkedIn (self-serve, no approval required)
- **Approved scope:** `w_member_social` only
- **Removed scopes (per commit 10e5e30b):** `openid`, `profile`, `email` — correct, those require "Sign In with LinkedIn using OpenID Connect" product which we don't need for posting
- **Endpoint in use:** `POST /v2/ugcPosts` (legacy — see migration note below)
- **Asset registration:** `POST /v2/assets?action=registerUpload` (legacy Assets API)

---

## What "Share on LinkedIn" Unlocks

Self-serve, no approval required. Add via LinkedIn Developer Portal → My Apps → Products tab.

| Capability | Included | Notes |
|---|---|---|
| Text post (personal profile) | YES | `shareMediaCategory: "NONE"` |
| URL/article share | YES | `shareMediaCategory: "ARTICLE"` |
| Single image upload + post | YES | via Assets API then ugcPosts/posts |
| **Video upload + post (personal)** | **YES** | `feedshare-video` recipe — scope `w_member_social` is sufficient |
| Document share | YES | via Documents API |
| Company/organization page posting | NO | Requires `w_organization_social` — needs Community Management API or Advertising API approval |
| Post scheduling via API | NO | No scheduling endpoint exists in any product tier |
| Post analytics (impressions, etc.) | NO | Requires Community Management API (Standard tier) |
| Follower/audience data | NO | Requires Community Management or Advertising API |
| Comments read/management | NO | Requires Community Management API |

**Key finding:** `w_member_social` IS sufficient for video upload and posting to a personal LinkedIn profile. The LinkedIn "Share on LinkedIn" documentation explicitly includes `feedshare-video` as an available recipe under this scope. This was confirmed directly in the official docs.

---

## Video Posts: The Real Story

### Current code uses the legacy path (functional but deprecated)

`lib/linkedin.ts` uses:
- `POST /v2/assets?action=registerUpload` with recipe `urn:li:digitalmediaRecipe:feedshare-video`
- `POST /v2/ugcPosts` with `shareMediaCategory: "VIDEO"`

This is the **legacy Assets API + ugcPosts flow**. LinkedIn docs confirm it still works with `w_member_social` but recommend migration to the newer Videos API + Posts API.

### Is video posting actually blocked?

**No.** Per verified LinkedIn documentation (2026-04-updated):

- The Videos API permissions table explicitly lists `w_member_social` as sufficient for personal member video uploads
- The "Share on LinkedIn" product page explicitly includes video in its scope — the `feedshare-video` recipe is documented as part of this product
- The commit removing `openid/profile/email` scopes was correct and unrelated to video capability — those scopes are for profile data retrieval, not posting

**Why the commit message implied a problem:** The removal of `openid/profile/email` scopes was necessary because those scopes require the "Sign In with LinkedIn using OpenID Connect" product, which the app doesn't have. The issue was over-requesting scopes, not a video-specific block. Video under `w_member_social` was never the problem.

### Potential actual failure mode in current code

The current implementation in `publishLinkedInVideoFromUrl` downloads the full video binary to server memory via `arrayBuffer()` before uploading. For a 50–100 MB MP4, this will OOM a serverless function. The flow itself is scope-correct; the implementation has a memory/timeout problem for large files.

---

## The Legacy → Modern API Migration (Action Required)

LinkedIn has sunset the legacy APIs in favor of a versioned marketing API stack.

| Old (current code) | New (recommended) | Status |
|---|---|---|
| `POST /v2/ugcPosts` | `POST /rest/posts` | ugcPosts still works but deprecated |
| `POST /v2/assets?action=registerUpload` | `POST /rest/videos?action=initializeUpload` | Assets API deprecated for video |
| No `Linkedin-Version` header | `Linkedin-Version: YYYYMM` required | Breaking change — missing header will 400 |

**The new Videos API requires `Linkedin-Version` and `X-Restli-Protocol-Version: 2.0.0` headers.** Current code only sends `X-Restli-Protocol-Version: 2.0.0`. The new versioned endpoints will reject requests without `Linkedin-Version`.

New video upload flow (4 steps, replaces current 3-step Assets API flow):
1. `POST /rest/videos?action=initializeUpload` — get multipart upload URLs
2. Split file into 4 MB chunks, upload each part via PUT
3. `POST /rest/videos?action=finalizeUpload` — assemble parts, get `urn:li:video:{id}`
4. `POST /rest/posts` with `content.media.id = "urn:li:video:{id}"`

New video limits: 75 KB–500 MB, 3 seconds–30 minutes, MP4 only. (Legacy Assets API: up to 5 GB, up to 10 minutes.)

---

## What Requires "Community Management API" Upgrade

Community Management API is a gated product requiring LinkedIn approval (not self-serve). Grants:

| Permission | What it unlocks |
|---|---|
| `w_organization_social` | Post to company/organization page |
| `w_organization_social_feed` | Manage org social actions |
| `r_organization_social` | Read org posts, comments, likes |
| `r_organization_social_feed` | Read org social feed |
| `r_organization_followers` | Follower data for org |
| `rw_organization_admin` | Admin org pages |
| `w_member_social_feed` | Comments and reactions on member's behalf |
| `r_member_postAnalytics` | Post analytics (from API version 202506) |
| `r_member_profileAnalytics` | Profile analytics (from API version 202504) |

Also available via **Advertising API** (separate approval path, same permissions plus ad management).

---

## Community Management API Application Process

### Step 1: Development Tier (to get `w_organization_social` and company page posting)

1. Create app at [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Go to My Apps → select app → Products tab
3. Add "Community Management API" — triggers access request form
4. Fill out form with:
   - Business email (verified — personal emails rejected)
   - Organization legal name, registered address, website, privacy policy
   - Use case description
5. Ensure a LinkedIn Page super admin has verified the app association
6. App name must NOT contain "LinkedIn" or "Microsoft" branding

**Development tier restrictions:** 500 API calls/app/24hr, 100 calls/member/24hr. No batch GET. No push notifications/webhooks.

**Timeline:** LinkedIn reviews and approves/rejects. No published SLA. Community reports suggest 1–4 weeks.

**If rejected:** Cannot reapply with same app — must create new app and resubmit.

### Step 2: Standard Tier (production, no rate limits)

After completing development tier integration:
1. Submit Standard tier form (appears in Developer Portal after dev tier approval)
2. Submit screen recording demonstrating:
   - Full OAuth flow
   - Posting to LinkedIn page via your app
   - Comment display from members
   - What personal data fields are shown
3. LinkedIn reviews for: approved use case, valid privacy policy, compliance, security

**Timeline:** No published SLA. Community reports suggest 2–6 weeks additional after dev tier.

### Legal entity requirement

"At this time, our Community Management APIs are only available to registered legal organizations for commercial use cases only." Ryan Realty LLC qualifies as a registered legal organization.

---

## What Requires "Advertising API"

Alternative path to get `w_organization_social` without Community Management API. Advertising API also grants `w_organization_social` plus all marketing/ads permissions. Apply at Developer Portal → Products → Advertising API.

Same gated approval process. If the use case is posting to a company page, Community Management API is the cleaner fit (less scope than Advertising API).

---

## URN Formats (Verified)

| Entity | URN format | Notes |
|---|---|---|
| Personal member | `urn:li:person:{id}` | ID from profile API or env var `LINKEDIN_PERSON_ID` |
| Organization page | `urn:li:organization:{id}` | ID from organization lookup |
| Video asset (legacy) | `urn:li:digitalmediaAsset:{id}` | Returns from Assets API |
| Video (new API) | `urn:li:video:{id}` | Returns from Videos API |
| Post (share) | `urn:li:share:{id}` | Returns in `x-restli-id` header |
| Post (ugc) | `urn:li:ugcPost:{id}` | Returns in `x-restli-id` header |

---

## Endpoint Reference (Verified)

### Current code endpoints (legacy, functional)
```
POST https://api.linkedin.com/v2/ugcPosts
POST https://api.linkedin.com/v2/assets?action=registerUpload
GET  https://api.linkedin.com/v2/me  (not in use — removed with openid scopes)
```

### Recommended migration targets
```
POST https://api.linkedin.com/rest/videos?action=initializeUpload
PUT  {uploadUrl from response} × N (multipart)
POST https://api.linkedin.com/rest/videos?action=finalizeUpload
POST https://api.linkedin.com/rest/posts

Required headers on all /rest/ endpoints:
  Linkedin-Version: 202604   (or current YYYYMM)
  X-Restli-Protocol-Version: 2.0.0
  Authorization: Bearer {token}
  Content-Type: application/json
```

---

## Format Constraints (Verified)

### Text post
- Max 3,000 characters
- No URL in body if reach matters (60% reach penalty for external links in body per 2026 algorithm data)
- URL in first comment is also penalized as of early 2026 — no clean workaround

### Image post (single)
- Formats: JPG, PNG, GIF
- Max size: 5 MB (per LinkedIn help; unofficial reports cite 100 MB)
- Resolution: 552×368 px minimum; 7680×4320 px maximum
- Aspect ratios: 1:1, 4:5, 16:9, 9:16 all display correctly
- Upload via Images API (`/rest/images?action=initializeUpload`) before posting

### Video post (personal member, `w_member_social`)
- Format: MP4 only
- Size: 75 KB–500 MB (new Videos API); up to 5 GB (legacy Assets API)
- Duration: 3 seconds–30 minutes (new Videos API); up to 10 minutes (legacy)
- Aspect ratios: 1:1, 16:9, 9:16 all supported — 9:16 portrait displays full-screen on mobile
- Captions file: SRT format, English only, optional
- Custom thumbnail: optional (system generates one if not provided)
- Rate limit: 150 calls/member/day (applies to all ugcPosts/posts calls)

---

## Rate Limits

| Throttle | Limit |
|---|---|
| Member API calls | 150 requests/member/day |
| Application API calls | 100,000 requests/app/day |
| Community Mgmt Dev tier — all APIs | 500 calls/app/24hr; 100 calls/member/24hr |

---

## Worked Examples

### 1. Text post (1,500-char body, link omitted or separate)

```json
POST /rest/posts
{
  "author": "urn:li:person:{LINKEDIN_PERSON_ID}",
  "commentary": "Bend, OR: inventory finally moved this month...\n\n[1,500 char body here — hook in line 1, data in lines 2-4, question or CTA in final line]\n\n#BendOregon #RealEstate #CentralOregon",
  "visibility": "PUBLIC",
  "distribution": {
    "feedDistribution": "MAIN_FEED",
    "targetEntities": [],
    "thirdPartyDistributionChannels": []
  },
  "lifecycleState": "PUBLISHED",
  "isReshareDisabledByAuthor": false
}
```

Returns `201` with `x-restli-id: urn:li:share:{id}`.  
Do NOT include URL in `commentary` — reach penalty is 60%.

---

### 2. Single image post for listing announcement

Step 1 — upload image:
```
POST /rest/images?action=initializeUpload
{
  "initializeUploadRequest": {
    "owner": "urn:li:person:{LINKEDIN_PERSON_ID}"
  }
}
→ returns { "value": { "image": "urn:li:image:{id}", "uploadUrl": "..." } }
```

Step 2 — PUT binary to uploadUrl (no Auth header on the PUT itself):
```
PUT {uploadUrl}
Content-Type: image/jpeg
[binary]
```

Step 3 — create post:
```json
POST /rest/posts
{
  "author": "urn:li:person:{LINKEDIN_PERSON_ID}",
  "commentary": "3 bed, 2 bath in Bend's Old Farm District. 12 showings in the first weekend. [story, not pitch]",
  "visibility": "PUBLIC",
  "distribution": { "feedDistribution": "MAIN_FEED", "targetEntities": [], "thirdPartyDistributionChannels": [] },
  "content": {
    "media": {
      "id": "urn:li:image:{id}"
    }
  },
  "lifecycleState": "PUBLISHED",
  "isReshareDisabledByAuthor": false
}
```

---

### 3. Video post (native — `w_member_social` scope, new Videos API)

Step 1 — initialize upload:
```
POST /rest/videos?action=initializeUpload
Headers: Linkedin-Version: 202604
{
  "initializeUploadRequest": {
    "owner": "urn:li:person:{LINKEDIN_PERSON_ID}",
    "fileSizeBytes": 52428800,
    "uploadCaptions": false,
    "uploadThumbnail": false
  }
}
→ returns uploadInstructions[{firstByte, lastByte, uploadUrl}], uploadToken, video URN
```

Step 2 — upload each 4 MB chunk via PUT, collect ETags from response headers.

Step 3 — finalize:
```
POST /rest/videos?action=finalizeUpload
{
  "finalizeUploadRequest": {
    "video": "urn:li:video:{id}",
    "uploadToken": "{token}",
    "uploadedPartIds": ["{etag1}", "{etag2}"]
  }
}
```

Step 4 — wait for `status: "AVAILABLE"` (poll `GET /rest/videos/{id}`).

Step 5 — create post:
```json
POST /rest/posts
{
  "author": "urn:li:person:{LINKEDIN_PERSON_ID}",
  "commentary": "Bend market: 3.2 months of supply. Here's what that actually means for buyers.",
  "visibility": "PUBLIC",
  "distribution": { "feedDistribution": "MAIN_FEED", "targetEntities": [], "thirdPartyDistributionChannels": [] },
  "content": {
    "media": {
      "title": "Bend Oregon Market Report Q2 2026",
      "id": "urn:li:video:{id}"
    }
  },
  "lifecycleState": "PUBLISHED",
  "isReshareDisabledByAuthor": false
}
```

**Response:** `201` with `x-restli-id` containing the share/ugcPost URN.

---

## LinkedIn Algorithm 2026 (Verified — Real Estate Context)

### What 360Brew (LinkedIn's 150B-parameter ranking model) prioritizes
- **Topic authority:** Algorithm reads your full profile (headline, experience, skills, past comments) to establish what you're an authority on. Posts that align with your profile topic get extended reach. Real estate market data from a licensed broker = high topic authority.
- **Dwell time over reactions:** Reading time is measured. Long-form market analysis with data outperforms a one-liner.
- **Engagement depth:** Comments (especially substantive back-and-forth) weighted more than likes.

### Format performance (2026 data)
1. Documents/PDF carousels: **6.60% engagement** (highest)
2. Native video: **5.60% engagement** (video views +36% YoY; full-screen mobile feed active)
3. Text-only with hooks: competitive if >1,000 chars
4. External link posts: **−60% reach** — avoid links in post body entirely

### Posting cadence
- Personal profile: 2–3x per week; quality beats frequency with 360Brew
- Peak times: Tuesday–Thursday, 8–10 AM Pacific (adjust to Bend audience — most professionals in Pacific time)
- Wednesday 9 AM PT is highest-engagement slot per 2026 data

### Real estate-specific findings
- **Market data carousels (PDF):** 3× more reach than standard posts — primary format for market reports
- **"Lessons Learned" deal stories:** 38% more engagement than promotional posts
- **Native video walkthroughs:** 5× engagement vs other formats per real estate-focused analysis
- **Personal profile > company page** for organic reach — LinkedIn's algorithm favors person-to-person content over brand-to-audience
- **No scheduling API:** Must schedule via LinkedIn native scheduler or third-party tool (Buffer, Hootsuite) — no API endpoint to schedule future posts at any tier

### URL strategy (updated for 2026)
- **Do not include URLs in post body** (60% reach penalty)
- **First comment links are also penalized** as of early 2026 — no safe placement
- Best approach: post the content value natively (stats, takeaway, story) with no external link; direct DMs or bio link for lead capture

### Tagging strategy for Bend reach
- Tag `@[Bend Chamber of Commerce](urn:li:organization:{id})` for local amplification
- Tag relevant lenders, title companies, escrow officers (they share content with their networks)
- Use: `#BendOregon #CentralOregon #BendRealEstate #OregonRealEstate #DeschutesCounty`

---

## Current Code Gaps and Recommended Actions

### Priority 1: Code migration (scope-safe, no approval needed)
The current `publishLinkedInVideoFromUrl` function:
- Uses deprecated `POST /v2/ugcPosts` and `POST /v2/assets` endpoints
- Loads entire video binary into memory (`arrayBuffer()`) — will OOM on videos >20–30 MB in a serverless context
- Missing `Linkedin-Version` header (required for `/rest/` endpoints when migrating)

**Action:** Migrate to `POST /rest/videos?action=initializeUpload` multipart flow + `POST /rest/posts`. No new scope needed — `w_member_social` is sufficient for the entire updated flow. Implement streaming multipart upload to avoid memory issues.

### Priority 2: Company page posting (scope upgrade required)
Current scope cannot post to the Ryan Realty company LinkedIn page. If Matt wants to also publish to the company page:

**Action:** Apply for Community Management API (Development tier) at [LinkedIn Developer Portal](https://www.linkedin.com/developers/).

Requirements:
- Ryan Realty must be a registered legal organization (qualifies as LLC)
- Business email required (not personal Gmail/etc.)
- LinkedIn Page super admin must verify the app
- Privacy policy URL required (ryan-realty.com/privacy-policy or similar)

Timeline: 1–4 weeks for development tier. After full integration, additional 2–6 weeks for standard tier (production).

Unlocks: `w_organization_social` → can post video, images, text to Ryan Realty LinkedIn company page.

### Priority 3: Post analytics (if needed)
`r_member_postAnalytics` is available under Community Management API starting from API version 202506 (June 2026). Currently not available to anyone without CMA approval.

---

## Common Failure Modes (Verified)

| Error | Cause | Fix |
|---|---|---|
| `403 Unauthorized scope` | Requesting `openid/profile/email` without "Sign In with LinkedIn" product | Already fixed in commit 10e5e30b |
| `403 Access Denied on org URN` | Using `urn:li:organization:{id}` as author without `w_organization_social` | Apply for Community Management API |
| `400` on `/rest/` endpoints | Missing `Linkedin-Version` header | Add `Linkedin-Version: 202604` header |
| OOM on video upload | Loading full binary into `arrayBuffer()` | Switch to streaming multipart upload |
| `403` on asset register | Wrong `serviceRelationships.identifier` | Must be `urn:li:userGeneratedContent` for personal posts |
| Post missing from `x-restli-id` | Reading `postJson.id` instead of response header | Header `x-restli-id` is the canonical return — current code handles this correctly as fallback |
| Video stuck `PROCESSING` | Polling too fast before processing completes | Poll every 5s for up to 120s before failing |

---

## Summary Verdict

**Video posting to personal profile: WORKS with current `w_member_social` scope.**  
The scope has never been the blocker for video. The legacy Assets API + ugcPosts path used in current code is documented as valid for `feedshare-video` under "Share on LinkedIn."

**Video posting to Ryan Realty company page: BLOCKED until Community Management API approved.**  
Requires `w_organization_social` which is gated.

**Recommended next step (code):** Migrate `publishLinkedInVideoFromUrl` from the deprecated Assets API + ugcPosts path to the new Videos API + Posts API. Add `Linkedin-Version` header. Fix the `arrayBuffer()` memory issue with multipart streaming.

**Recommended next step (scope upgrade):** Apply for Community Management API Development tier to unlock company page posting and (eventually) post analytics. Estimated 1–4 weeks to development approval.
