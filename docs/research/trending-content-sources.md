# Tools: Trending Content Discovery (research_engine inputs)

> Researched 2026-05-06. All API status, pricing, and TOS assessments verified via live web search.
> For Ryan Realty / Bend, Oregon content engine (Phase 2 research_engine skill backend).

---

## 1. TikTok Trending

### Official API landscape (as of 2026-05-06)

TikTok exposes four distinct API products. None of them provide trending discovery for commercial use:

| Product | What it does | Who can use it | Trending data? |
|---|---|---|---|
| **Content Posting API** | Publish videos, manage account | Any approved developer | No |
| **Research API** | Query public posts, users, comments | Non-profit academic institutions (US + EU only) | Limited — 24h–7d latency |
| **Commercial Content Library** | View/search ad creatives | Business/advertiser accounts | No trend signals |
| **Creator Search Insights API** (new 2026) | Creator-level follower + engagement data | Approved marketing partners | No |

**Research API eligibility gate (2026):** Applicants must be affiliated with a non-profit academic institution and conduct research on a non-commercial basis. Commercial operators (brokerages, marketing agencies, content creators doing branded content) are explicitly ineligible. Data latency is 24h–7 days — useless for real-time trend-jacking.

**TikTok Creative Center** (`ads.tiktok.com/business/creativecenter/`) surfaces trending sounds, hashtags, and top-performing ads — but it is a browser-only tool with no published API. The April 2026 TOS update explicitly prohibits automated bulk harvesting of Creative Center pages for commercial data resale. Scraping it is a TOS violation and a legal grey zone (see risk note below).

### Scraping / third-party path

Several Apify actors scrape TikTok public pages and the Creative Center:

| Tool | Pricing | Notes |
|---|---|---|
| **Apify TikTok Scraper** (clockworks) | $0.30/1,000 posts | Most established; pay-per-event model |
| **Apify Full TikTok API Scraper** (scraptik) | $0.002/request | Lower cost per call |
| **Apify TikTok Trends Scraper** (automation-lab) | $0.005/item ($5/1,000) | Specifically scrapes trending sounds + hashtags |
| **Apify TikTok Creative Center Scraper** (doliz) | Varies | Directly targets Creative Center — highest TOS risk |
| **ScrapingBee** / **Scrapfly** | From $49/mo | Managed proxies; still TOS-grey for Creative Center |

**Legal/TOS risk assessment:** Scraping Creative Center for trending sounds and hashtags violates TikTok's April 2026 TOS update. Scraping public profile/hashtag pages (not Creative Center) sits in a grey zone — no explicit prohibition on public data, but TikTok has sent C&D letters to data resellers. Apify notes that results may contain personal data subject to GDPR/CCPA and recommends consulting legal counsel. For Ryan Realty's internal content research (not resale), risk is lower but not zero.

### What we want to pull

- Trending sounds in real-estate / lifestyle / home-improvement niche (US, Oregon geo)
- Top-viewed videos in #realestate, #firsttimehomebuyer, #homebuying, #bend, #oregon, #bendoregon
- Format trends: POV tours, "5 things about X market," duet reactions to news, listing walkthroughs
- Trending hashtag velocity (7-day vs 30-day movement)

### Recommended approach

**Use Apify TikTok Trends Scraper** for hashtag + sound discovery from public pages (not Creative Center). Supplement with manual weekly Creative Center review (browser, not scraped). Do NOT automate Creative Center extraction.

For actual trend-jacking intelligence, cross-reference with the YouTube trending pull (which migrates 2–4 weeks later to IG/TikTok) and Reddit hot posts to identify the underlying topic before it peaks on TikTok.

**Estimated monthly cost:** ~$15–$30/month at 3,000–6,000 trend data points/month via Apify.

---

## 2. Reddit

### Official API

Reddit's official API (`oauth.reddit.com`) is the correct path. As of 2026:

| Tier | Cost | Rate limit | Use case |
|---|---|---|---|
| **Free (non-commercial)** | $0 | 100 req/min (OAuth) | Personal projects, research, internal tools |
| **Standard (commercial)** | From $12,000/year | 200 RPM | Commercial products built on Reddit data |
| **Enterprise** | Custom (negotiated) | Custom | High-volume data pipelines |

**Non-commercial internal content research** (identifying hot topics to guide Ryan Realty's editorial calendar) qualifies for the free tier. Ryan Realty is not reselling Reddit data or building a Reddit-dependent product — internal trend intelligence is a legitimate non-commercial use. At 100 req/min free, pulling 25 posts across 5 subreddits every 6 hours = ~2,000 calls/day = well within free tier.

**Authentication:** OAuth2 required. Register an app at `reddit.com/prefs/apps` (script type). PRAW (Python Reddit API Wrapper) handles auth + rate limiting automatically. No API key cost.

### Subreddits for Ryan Realty research

| Subreddit | Members | Content value |
|---|---|---|
| r/RealEstate | 1.5M+ | Broad market questions, buyer/seller anxiety, policy reactions |
| r/FirstTimehomeBuyer | 700K+ | Objections, fears, process confusion — evergreen content fodder |
| r/Bend | 40K+ | Local intel: neighborhood sentiment, development news, event chatter |
| r/Oregon | 200K+ | Statewide housing policy, migration trends, cost of living debates |
| r/realtors | Industry | Agent pain points, workflow trends, commission debates |

### What we pull

- Top 25 posts of last 24h per subreddit (sorted by `hot`)
- Title + score + comment count + top 3 comments (sentiment signal)
- Rising posts (early-trend detection: sorted by `rising`)
- De-duplicate against prior pulls via post ID cache

### Code pattern (Python/PRAW)

```python
import praw

reddit = praw.Reddit(
    client_id="YOUR_CLIENT_ID",
    client_secret="YOUR_CLIENT_SECRET",
    user_agent="RyanRealty-ContentResearch/1.0 by u/YOUR_REDDIT_USERNAME"
)

subreddits = ["RealEstate", "FirstTimehomeBuyer", "Bend", "Oregon", "realtors"]

for sub_name in subreddits:
    subreddit = reddit.subreddit(sub_name)
    for post in subreddit.hot(limit=25):
        print(post.title, post.score, post.num_comments)
```

**Rate limit handling:** PRAW automatically respects `X-Ratelimit-*` headers and sleeps when needed. No manual throttling required.

### Estimated monthly cost

**$0** — non-commercial free tier. Register one Reddit app at `reddit.com/prefs/apps`.

---

## 3. Google Trends

### Official API status (2026-05-06)

Google launched an official Google Trends API in 2025, but as of May 2026 it remains in **limited alpha** with restricted endpoints and no general availability. Not a viable production source.

**PyTrends** was archived by its maintainers on April 17, 2025 — no longer maintained or reliable.

### Viable options (ranked by reliability vs. cost)

| Option | Cost | Reliability | Notes |
|---|---|---|---|
| **SerpApi Google Trends endpoint** | $75/mo (Developer, 5,000 searches) | High — managed proxy rotation | Best production option; returns structured JSON |
| **Glimpse API** | $49/mo (Pro, 250 lookups) + custom API pricing | High | Real volume estimates + growth rates; API pricing requires contacting sales |
| **Apify free Google Trends scraper** | $0 (free actor with $5 monthly credit) | Medium — community-maintained | Good for low-volume use; may break on rate changes |
| **trendspyg** (open-source pytrends fork) | $0 | Low — unofficial wrapper | Same fragility as pytrends; not production-safe |
| **Official Google Trends API** | Unknown (alpha) | N/A | Not available for general sign-up |

### What we pull

- Interest over time: "Bend real estate," "buy a home in Bend," "Bend Oregon homes for sale," "central Oregon real estate"
- Geographic comparison: Bend DMA vs Portland, Eugene, Medford
- Related rising queries (surfaces emerging search intent)
- YoY search volume index comparison (same 30-day window, prior year)

### Recommended approach

**SerpApi** at $75/month Developer plan. For trend research, Ryan Realty needs ~100–200 keyword queries/month (5 keywords × daily = 150/month) — well within the 5,000-search Developer plan. SerpApi returns structured JSON with `interest_over_time`, `related_queries`, and `geo` data.

```
GET https://serpapi.com/search.json
  ?engine=google_trends
  &q=bend+real+estate
  &geo=US-OR
  &date=today+12-m
  &api_key=YOUR_KEY
```

**Fallback:** Apify free actor for low-stakes spot checks; SerpApi for production pipeline.

**Estimated monthly cost:** $75/month (SerpApi Developer plan covers all Trends queries needed).

---

## 4. YouTube Trending

### Official API

**YouTube Data API v3** — fully public, free within quota limits.

| Endpoint | Quota cost | What it returns |
|---|---|---|
| `videos.list?chart=mostPopular` | **1 unit/call** | Top ~200 trending videos (paginated), filterable by `regionCode` + `videoCategoryId` |
| `search.list` | **100 units/call** | Keyword search across all videos — 100x more expensive |

**Default quota:** 10,000 units/day per project. Resets midnight PT. No cost for standard usage.

**For Ryan Realty:** `videos.list?chart=mostPopular&regionCode=US&videoCategoryId=26` (How-to & Style) pulls trending lifestyle/home content for 1 unit. Searching by keyword ("Bend Oregon real estate," "home buying tips") costs 100 units/call but is still free within the 10,000/day quota if used sparingly (~50 keyword searches/day).

**Real estate is not a standalone YouTube category.** Relevant category IDs:
- `26` — How-to & Style (covers home tours, DIY, buying guides)
- `22` — People & Blogs (agent vlogs, market commentary)
- `19` — Travel & Events (area guides, neighborhood tours)

### What we pull

- Weekly: `chart=mostPopular`, categories 26+22+19, US region — top 50 videos each
- Keyword search (weekly): "Bend Oregon real estate," "first time home buyer 2026," "housing market 2026"
- Per video: title, description, viewCount, likeCount, commentCount, duration, thumbnailUrl, channelTitle, publishedAt
- Hook pattern analysis: extract first sentence of title + thumbnail alt text

### Code pattern (Python)

```python
from googleapiclient.discovery import build

youtube = build('youtube', 'v3', developerKey='YOUR_API_KEY')

response = youtube.videos().list(
    part='snippet,statistics,contentDetails',
    chart='mostPopular',
    regionCode='US',
    videoCategoryId='26',
    maxResults=50
).execute()
```

**Quota math for weekly pull:**
- 4 mostPopular calls/week (4 category combos) = 4 units
- 10 keyword searches/week = 1,000 units
- Total: ~1,004 units/week. Daily quota = 10,000. Comfortably within free tier.

**Estimated monthly cost:** $0 — YouTube Data API v3 is free within the 10,000 units/day default quota.

---

## 5. Instagram Explore / Reels

### Official API status

The Instagram Graph API (Meta) does **not** expose:
- Trending audio / sounds
- Explore feed content
- Reels trending discovery
- Hashtag volume/velocity (deprecated endpoint)

The Reels Publishing API is available for Business and Creator accounts, but it is publish-only — no discovery or trend data returned.

**Bottom line:** There is no legitimate programmatic path to Instagram trending content as of 2026-05-06.

### Realistic approach

**Do not build a pipeline for Instagram trending.** Use these proxies instead:

1. **TikTok → Instagram lag:** Trends peak on TikTok 2–4 weeks before appearing on IG Reels. The TikTok pull (above) functions as a leading indicator.
2. **Manual weekly audit:** 15-minute manual browse of Explore + Reels in real-estate / lifestyle niches. Log trending audio tracks by name in a shared notes doc. Instagram's in-app "Trending" audio indicator (arrow icon) is the ground truth.
3. **Third-party tools** (Iconosquare, Sprout Social, Later): These scrape Instagram via private API sessions. TOS-violating, account-ban risk. Not recommended for a licensed brokerage's primary account.
4. **HeyOrca trending audio tracker:** `heyorca.com/blog/trending-audio-for-reels-tiktok` — manually curated weekly list, free to read. Appropriate for supplemental research.

**Estimated monthly cost:** $0 (manual process + free resources).

---

## 6. X (Twitter) Trending

### Official API status (2026-05-06)

X replaced its tiered pricing model with **pay-per-use** in February 2026. No free tier exists for new developers.

**Pricing model (as of April 20, 2026):**

| Resource type | Cost per read |
|---|---|
| Post reads (standard) | $0.005 |
| Owned reads (your posts, followers, bookmarks) | $0.001 |
| User profile reads | $0.010 |
| Post writes (no URL) | $0.015 |
| Post writes (with URL) | $0.200 |

**Trends/trending topics endpoint:** Available via pay-per-use. The old free `GET /1.1/trends/place` no longer exists. Access to trending data now requires purchasing credits. Cost per trends call is not separately listed — trends calls appear to be bundled under post/search reads at $0.005/resource.

**Monthly cost estimate for Ryan Realty use case:**
- Daily trends pull: 10 trending topics × 30 days = 300 reads × $0.005 = **$1.50/month**
- This is viable if X trends are actually useful for content research

**Realistic value assessment:** X's real-estate adjacent trending topics in 2026 are predominantly news-driven (Fed rate decisions, housing legislation, local policy). Useful for news-clip video formats (react to news trend). Less useful for format discovery than TikTok or YouTube.

**Recommended approach:** Low-cost pay-per-use pull of US trending topics daily. Filter for real-estate, housing, mortgage, Oregon, Bend keywords. Skip if monthly billing setup is not already in place — $1.50/month value may not justify credit account setup overhead.

**Estimated monthly cost:** ~$1.50–$5/month depending on pull volume.

---

## 7. TikTok Creative Center (Standalone Section)

The Creative Center (`ads.tiktok.com/business/creativecenter/`) is the most directly useful trend discovery tool for Ryan Realty's content engine — but it has no API.

### What it surfaces (manually)

- **Trend Discovery → Songs:** Top trending sounds (7-day, 30-day), filterable by US region and industry category
- **Trend Discovery → Hashtags:** Top-performing hashtags by volume + growth velocity
- **Trend Discovery → Videos:** Top-performing organic videos by niche (Real Estate is available as a category filter)
- **Top Ads → Video:** Top-performing TikTok ad creatives by industry — reveals format/hook patterns without knowing competitor spend
- **Commercial Music Library:** Licensed tracks for use in ad creative (only legally safe audio source for TikTok Ads)

### TOS position on automation (2026-05-06)

TikTok's April 2026 TOS update explicitly prohibits automated bulk harvesting of Creative Center pages for commercial data resale or redistribution. Manual use by a licensed advertiser/content creator for their own editorial research is permitted. Building an Apify-based scraper against Creative Center for Ryan Realty's internal use is a TOS violation risk — not recommended.

### Recommended approach

**Manual weekly Creative Center session** (~20 minutes, Monday 8am):
1. Open Creative Center → Trend Discovery → Songs → US, 7-day, filter "Real Estate" or "Home & Garden"
2. Log top 10 sounds: name, artist, trend direction, view count
3. Trend Discovery → Hashtags → same filters → log top 10
4. Top Ads → Video → Real Estate → note hook formats from top 5 ads

Output: `research/tiktok_trends_YYYYMMDD.md` — feeds the weekly content opportunity report.

**Estimated monthly cost:** $0 (manual, no scraping).

---

## Recommended Stack (Cost-Optimized)

| Source | Method | Monthly cost | Priority |
|---|---|---|---|
| **Reddit** (5 subreddits) | Official API, free tier, PRAW | $0 | MUST-HAVE |
| **YouTube Data API v3** | Official API, free quota | $0 | MUST-HAVE |
| **Google Trends** | SerpApi Developer plan | $75 | MUST-HAVE |
| **TikTok** (public pages) | Apify TikTok Trends Scraper | $15–30 | HIGH |
| **TikTok Creative Center** | Manual weekly review | $0 | HIGH (20 min/week) |
| **X Trending** | Pay-per-use API | ~$2–5 | MEDIUM |
| **Instagram** | Manual + HeyOrca weekly list | $0 | LOW (manual proxy) |

**Total estimated monthly cost: ~$92–$110/month** (Reddit $0 + YouTube $0 + SerpApi $75 + Apify $15–30 + X $2–5).

---

## TOS Risk Ranking (Most to Least Risky)

1. **TikTok Creative Center scraping** — explicitly prohibited in April 2026 TOS update. Do not automate.
2. **Instagram private-API scraping** — account ban risk on Ryan Realty's primary business account. Do not do this.
3. **TikTok public-page scraping via Apify** — grey zone. Not prohibited for public profile/hashtag data (not Creative Center). Monitor for C&D signals.
4. **Reddit API commercial use without paid tier** — if content research is deemed commercial (driving leads/revenue), the $12K/year commercial tier technically applies. Internal editorial use is defensible as non-commercial.
5. **SerpApi / Google Trends** — fully clean. SerpApi's higher tiers include a U.S. Legal Shield.
6. **YouTube Data API v3** — fully clean. Google's official terms explicitly allow trend research.
7. **X API pay-per-use** — fully clean. Pay for what you use.

---

## Recommended Pull Cadence

| Source | Cadence | Pull volume | Storage table |
|---|---|---|---|
| TikTok Apify scraper | Daily 5:00 AM PT | 25 trending topics + 10 sounds | `trending_tiktok` |
| TikTok Creative Center | Weekly Mon 8:00 AM (manual) | 10 sounds + 10 hashtags | `trending_tiktok` (manual entry) |
| Reddit hot | 4x daily (5am, 11am, 5pm, 11pm) | 25 posts/subreddit × 5 subs = 125 | `reddit_posts` |
| Google Trends (SerpApi) | Daily 5:30 AM PT | 5 core keywords + 5 rising queries | `trends_data` |
| YouTube trending | Weekly Mon 6:00 AM | 50 videos (categories 22+26+19) + 10 keyword searches | `youtube_trending` |
| X trends | Daily 6:00 AM PT | Top 10 US trends | `x_trends` |
| Instagram (manual) | Weekly Mon 8:30 AM | 5–10 trending audio notes | `trending_audio` (manual) |

---

## Combined Output: Daily Content Opportunity Report

Each morning run produces a ranked list of 10 content opportunities for the day:

**Per opportunity:**
- **Topic:** The trend/question/event being surfaced
- **Source:** Which platform + post/query that triggered it
- **Format suggestion:** Specific video format (news clip, list-of-5, POV tour, market data drop)
- **Target platform:** TikTok / IG Reels / YouTube Shorts / X (ranked by format fit)
- **Predicted scorecard:** Estimated viral score per `VIRAL_GUARDRAILS.md` rubric
- **Data hook (if applicable):** Pre-identified stat from Supabase/Spark that makes the topic concrete
- **Lead time:** Days until trend likely peaks (early = higher urgency)

**Ranking factors:** Reddit score velocity + TikTok view count trajectory + Google Trends rising signal + YouTube engagement rate on similar content.

---

## Notes on Data Accuracy

Per `CLAUDE.md` §0, no market statistics surfaced by this pipeline ship without Supabase/Spark verification. The research_engine identifies *topics and formats* — it does not generate verified numbers. Every figure used in an actual deliverable must be re-queried from the primary source (Supabase `listings`, Spark API) and traced in `citations.json` before render.

Research output is *editorial intelligence*, not publish-ready data.

---

*Researched 2026-05-06 by Claude Sonnet 4.6 (research_engine Phase 2 backend study).*
*Sources: TikTok Developers, Reddit Help, SerpApi, YouTube Data API docs, X Developer Community, Apify actor listings, Glimpse, ScrapingBee, multiple 2026 pricing breakdowns.*
