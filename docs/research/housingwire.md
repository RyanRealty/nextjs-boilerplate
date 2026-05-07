# Tool: HousingWire API

> Verified 2026-05-06. Sources: housingwire.com/enterprise-data, housingwire.com/hwdata, hwmedia.com (Sold Intel launch article), altosresearch.com, apitracker.io/a/altos-re, .env.example line 155–158, web search corroboration. HousingWire's domain blocks web scrapers (403 on direct fetch) — all technical detail was sourced from indexed snippets and third-party aggregators.

---

## Critical framing: two completely different things share the "HousingWire API" label

The env vars `HOUSINGWIRE_API_KEY` + `HOUSINGWIRE_API_BASE_URL` in `.env.example` cover **two distinct product lines** that HousingWire operates. They must not be confused:

| Layer | What it is | Data type | Cadence |
|---|---|---|---|
| **HousingWire News** | Editorial publication — articles, analysis, mortgage commentary | Text/news content | Daily (multiple articles/day) |
| **HousingWire Data** (formerly Altos Research) | Housing market datasets — inventory, pending, sold, price cuts | Structured numerical | Weekly (every Monday) |

The comment in `.env.example` says: *"HousingWire Data (formerly Altos Research) — national market context on /reports/explore (inventory, 30yr rate, 10Y Treasury)."* This confirms the **Data** layer is what's currently wired (or intended) in the codebase, not a news-article feed.

For the `research_engine` skill (Phase 2 topic discovery), **both** layers are relevant but serve different purposes and require different access approaches, documented separately below.

---

## Layer 1 — HousingWire Data API (formerly Altos Research)

### What it is

HousingWire acquired Altos Research (founded 2006) and now operates it as **HousingWire Data**. This is a **real estate market dataset** product, not a news API. It tracks active inventory, pending sales, sold transactions, price cuts, and mortgage rates at weekly granularity across every ZIP code in the US.

### Auth + endpoint (verified status: UNCONFIGURED locally)

Per `.env.example` lines 155–158:
```
# HOUSINGWIRE_API_KEY=
# HOUSINGWIRE_API_BASE_URL=
```
Both vars are commented out — **no API key or base URL is currently set** in this repo. The codebase references these vars for the `/reports/explore` page; when unset, that page shows a config hint instead of data.

- **Auth method:** Bearer token (`Authorization: Bearer $HOUSINGWIRE_API_KEY`) based on standard Altos API convention
- **Base URL:** Not publicly documented. HousingWire does not publish a developer portal or OpenAPI spec. Must be obtained directly from their Data Specialist team.
- **Known legacy domain:** `altosresearch.com` still resolves and provides the Altos-branded market reports product; the enterprise API likely routes through `housingwire.com` infrastructure but the exact host is gated behind a sales engagement

### Data products available (enterprise tier)

| Product | What it contains | Geographic level | Update cadence |
|---|---|---|---|
| **Listings Intel** | Active inventory, listing prices, property characteristics, agent activity — MLS-derived signals | ZIP, city, county, metro, state, national | Weekly (Mondays) |
| **Pending Intel** | Properties under contract; pending price data (critical for non-disclosure states) | ZIP → national | Weekly (Mondays) |
| **Sold Intel** (launched ~2025) | Transaction-level close data — listing → pending → close dates, close prices, time-on-market | ZIP → national | Weekly (Mondays) |
| **Rental Intel** | Rental market data | ZIP → national | Weekly (Mondays) |
| **Trends** | Aggregated market trend series | Metro / national | Weekly (Mondays) |
| **Housing Market Tracker** | Single-family inventory, price reductions, mortgage purchase applications, mortgage rate | National, some metro | Weekly inventory; daily rates |

**Field examples across products (verified from indexed schema descriptions):**
- Active inventory count (single-family, condo/townhome — segmented separately)
- Median list price by quartile (Q1 = top 25% most expensive, Q4 = least expensive)
- Percent of listings with price reductions (weekly)
- Days on market (median)
- New listings added per week
- Pending sales volume
- Close price (Sold Intel)
- Agent/broker identifiers (Sold Intel)
- 30-year fixed mortgage rate (daily, sourced separately)
- 10-year Treasury yield (daily, sourced from FRED)

**Geographic hierarchy:** ZIP code → City → County → Metro (70+ MSAs per Census Bureau MSA definitions) → State → National. All products offer this full hierarchy.

**Historical depth:** Data back to 2011 available for back-testing models. This is enterprise-grade — a 4-week free sample file is offered before licensing.

### Delivery methods

Two options offered; which applies to `HOUSINGWIRE_API_BASE_URL` is unconfirmed without a live key:
1. **API delivery** — automated weekly pull via REST API; implementation supported by their Data Specialist team
2. **Bulk file download** — CSV/structured file delivered each Monday; can be automated

For integration into internal BI platforms and analytics environments, both are supported. The enterprise data page explicitly mentions API delivery as the mechanism for the `/reports/explore` use case in this codebase.

### Subscription tier / pricing

- **Enterprise only.** Not self-serve. No public pricing is posted.
- Contact: `housingwire.com/enterprise-data` → form → routes to a Data Specialist
- A **free 4-week sample file** is available for testing before committing to a license
- Pricing is per-product and per-geography; licensing Sold Intel separately from Listings/Pending Intel is allowed
- **Current status for Ryan Realty:** No API key present in `.env.example` or `.env.local` (both vars commented out). The `/reports/explore` page is in degraded/config-hint state. To activate, Matt must contact HousingWire Data sales and get credentials provisioned.

### Oregon / Pacific Northwest coverage

HousingWire Data claims **"virtually all ZIP codes in the United States"** and **"99% coverage of the active market."** Oregon is fully covered — all Deschutes County ZIPs (97701, 97702, 97703, 97707, 97708, 97709) are within scope. No regional exclusions are documented.

**Important caveat:** HousingWire Data reflects **national MLS-aggregated signals**. For Bend/Central Oregon, it will have data — but at weekly ZIP-level granularity, not the transaction-by-transaction depth of Ryan Realty's own Supabase (`listings` table, 589K+ rows from Spark). For market context/macro signals, HousingWire Data is useful. For property-level or ORMLS-verified local stats, Supabase remains the source of truth per CLAUDE.md.

### Rate limits

Not publicly documented. No self-serve developer portal or rate-limit spec exists. Limits would be defined in the enterprise license agreement.

### Common failure modes

- **Both env vars unset:** `/reports/explore` page shows config hint; no data renders. Fix: provision API key from HousingWire Data sales.
- **Stale key / expired license:** API returns 401 or 403. Fix: contact Data Specialist to renew.
- **Wrong base URL format:** Altos Research legacy endpoints vs HousingWire Data endpoints may differ; confirm with provisioning team.
- **Weekly-only updates:** Any component expecting real-time data will be stale 6/7 days. Architecture must cache Monday pull and serve cached data through the week.
- **Non-disclosure state gap:** Oregon is a partial non-disclosure state; Sold Intel uses pending price as proxy for close price where close price is unavailable — flag this when using Sold Intel for close-price analytics.

---

## Layer 2 — HousingWire News (editorial content)

### What it is

HousingWire publishes **daily editorial content** covering mortgage origination, real estate brokerage, housing market analysis, title/closing, housing policy, and Fed/rate commentary. This is the publication layer — articles, not structured data.

**This is a separate product from HousingWire Data.** The env vars in `.env.example` do NOT reference a news API. There is no dedicated HousingWire News API with documented endpoints.

### Access methods available (verified 2026-05-06)

#### Option A: RSS feed (free, no key required)
- **Main feed:** `https://www.housingwire.com/feed/` — RSS 2.0 format
- **Category feeds:** Confirmed categories: Mortgage, Real Estate, Closing (title/escrow), Politics and Money, Housing Market
  - Pattern: `https://www.housingwire.com/<category>/feed/` (inferred from standard WordPress RSS convention; exact slugs unverified due to 403 on direct fetch)
- **Fields per item:** `<title>`, `<link>`, `<pubDate>`, `<description>` (excerpt), `<category>`, `<author>` — standard RSS 2.0 fields; full body content may be truncated for subscribers
- **Rate limits:** None documented for RSS; standard RSS polling etiquette applies (not more than once per hour)
- **Cost:** Free

#### Option B: Third-party aggregation (Apify Real Estate News Intelligence)
- Apify offers an actor (`visita/real-estate-property-intelligence`) that monitors HousingWire and other housing news sources, returns AI-summarized articles with extracted market metrics
- Useful if full article body access is needed without a HousingWire subscription
- Adds per-call cost; adds intermediary latency

#### Option C: HousingWire subscriber access
- A paid HousingWire subscription may unlock full article body in RSS and programmatic scraping rights
- Enterprise membership tier exists (`housingwire.com/enterprise-membership`) — pricing not published
- Not confirmed whether a subscriber-tier RSS differs from the public feed in content length

### Publication cadence

- **Daily** — HousingWire publishes news Monday–Thursday at minimum, with breaking news any day
- **HousingWire Daily** newsletter goes out each business day (confirms daily minimum)
- **HousingWire Daily podcast** updated daily
- Mortgage rate articles and Housing Market Tracker updates publish on a near-daily basis when market-moving events occur
- Estimated 5–15 articles/day across all categories based on category page depth (unverified exact count — 403 blocked direct observation)

### Oregon / Pacific Northwest coverage

**Infrequent but real.** Verified Oregon articles from HousingWire (2024–2026):
- March 2024: Oregon land use law + $370M housing package
- March 2026: Portland SRO pilot / Oregon SRO legislation
- April 2026: Oregon governor signs housing bills (urban growth boundaries)

**Bend, OR specifically:** No Bend-specific articles found in search results. HousingWire covers Oregon at the **state policy level** (legislative changes, land use, affordability bills), not at the city or sub-market level. Bend market moves, Central Oregon stats, or ORMLS data will not appear in HousingWire editorial. For Bend-specific news triggers, local sources (Bend Bulletin, Central Oregon Daily, ORMLS) are needed.

**National rate and market data:** HousingWire's strongest editorial relevance for Ryan Realty is **macro triggers** — mortgage rate moves, Fed decisions, NAR commission changes, national inventory trends — that affect Bend buyers/sellers even if not Bend-specific.

---

## What's pullable for the `research_engine` skill (Phase 2)

### Confirmed pullable (no credentials needed)

| Signal | Source | Format | Cadence |
|---|---|---|---|
| National housing news headlines | `housingwire.com/feed/` | RSS 2.0 | Daily |
| Mortgage news | `housingwire.com/mortgage/feed/` | RSS 2.0 | Daily |
| Housing market commentary | `housingwire.com/housing-market/feed/` | RSS 2.0 | Daily |
| Real estate industry news | `housingwire.com/real-estate/feed/` | RSS 2.0 | Daily |

### Pullable with active API key (currently unconfigured)

| Signal | Source | Format | Cadence |
|---|---|---|---|
| National active inventory (SFR + condo) | HousingWire Data API | JSON or CSV | Weekly (Mondays) |
| National + metro pending sales | HousingWire Data API | JSON or CSV | Weekly |
| National + metro price reduction % | HousingWire Data API | JSON or CSV | Weekly |
| 30-year fixed rate | HousingWire Data API | JSON | Daily |
| 10Y Treasury yield | HousingWire Data API | JSON | Daily |
| Deschutes County / Bend ZIP inventory | HousingWire Data API | JSON or CSV | Weekly |

### Not pullable (gap)

- Full article body text (gated behind subscriber paywall for most articles)
- Real-time breaking news (RSS has some delay; no webhook/push documented)
- Bend-specific editorial (not produced at city level)
- Mortgage rate data in real-time (HousingWire Data is weekly for inventory; daily rate data sourced from FRED is publicly available without HW credentials)

---

## Sample query patterns

### RSS pull (no auth, works today)

```typescript
// Pull latest HousingWire news for content engine topic discovery
const RSS_FEEDS = {
  all:          'https://www.housingwire.com/feed/',
  mortgage:     'https://www.housingwire.com/mortgage/feed/',
  market:       'https://www.housingwire.com/housing-market/feed/',
  realEstate:   'https://www.housingwire.com/real-estate/feed/',
};

// Parse with fast-xml-parser or rss-parser npm package
// Fields: item.title, item.link, item.pubDate, item.description, item.category
```

### HousingWire Data API (requires active key — currently unset)

```typescript
// Pattern inferred from Altos Research / HousingWire Data conventions
// Actual endpoint paths must be confirmed with provisioning team

const BASE = process.env.HOUSINGWIRE_API_BASE_URL; // e.g., https://api.housingwire.com/v1
const KEY  = process.env.HOUSINGWIRE_API_KEY;

// Example: weekly inventory for Deschutes County ZIPs
GET ${BASE}/market/inventory
  ?zip=97701,97702,97703,97707
  &property_type=single_family
  &date_from=2026-04-28    // Monday of current week
Authorization: Bearer ${KEY}

// Example: national price cut percentage (weekly)
GET ${BASE}/market/price-reductions
  ?geo=national
  &date_from=2026-04-28
Authorization: Bearer ${KEY}

// Example: 30yr fixed rate (daily)
GET ${BASE}/rates/mortgage
  ?type=30yr_fixed
  &date_from=2026-05-05
Authorization: Bearer ${KEY}
```

**Note:** These endpoint paths are inferred from Altos Research API conventions and HousingWire Data product descriptions. They have not been verified against a live key. Actual paths must be confirmed from HousingWire's provisioning documentation when the API key is obtained.

---

## Cadence for `research_engine` (recommended)

```
Daily at 5:00 AM PT:
  - Pull all 4 RSS feeds (mortgage, market, real-estate, all)
  - Parse items published in last 24 hours
  - Filter: title/description contains any of:
      ["mortgage rate", "30-year", "inventory", "Fed", "NAR", "Oregon",
       "housing market", "pending sales", "price cut", "affordability",
       "rate cut", "rate hike", "existing home sales"]
  - De-dupe against prior 7 days (store seen item.link hashes)
  - Score relevance: Oregon/PNW mentions +2, rate-move articles +2,
    NAR/commission +1, national inventory +1
  - Ranked candidates → research_engine topic queue

Weekly at 6:00 AM PT Monday (when API key provisioned):
  - Pull HousingWire Data inventory + pending + price-cut metrics
  - Store in Supabase market_stats_cache table
  - Cross-check Deschutes County ZIPs against Spark API (per data accuracy rules)
  - Flag any |delta| > 1% for Matt review before using in any deliverable
```

---

## 3 worked content-engine examples

### 1. Mortgage rate drop triggers `news_video`

**Trigger:** RSS item "30-year fixed drops to 6.1%, lowest since March 2025" lands at 5:05 AM PT.

**research_engine action:**
- Score: rate-move article (+2) → high priority
- Generate topic card: `"30yr rate at 6.1% — what it means for Bend buyers"`
- Verify rate: cross-check against FRED `MORTGAGE30US` series before scripting
- Pass to `news-video` skill pipeline

**Video VO draft (verified number required before render):**
> "The 30-year fixed just hit its lowest point in over a year. Here's what that actually means if you're buying in Bend."

---

### 2. NAR commission rule update triggers explainer post

**Trigger:** RSS item "NAR's buyer-agent commission rule takes effect in [state]" or "NAR settlement update."

**research_engine action:**
- Score: NAR article (+1) + commission/buyer-agent keyword (+2) → high priority
- Classify as evergreen explainer (not time-sensitive breaking news)
- Topic card: `"What the new buyer-agent rules mean for Bend buyers and sellers"`
- Route to blog post + IG carousel pipeline

---

### 3. Oregon housing bill triggers policy explainer

**Trigger:** RSS item matching "Oregon" + ("housing" OR "land use" OR "zoning" OR "affordability").

**research_engine action:**
- Score: Oregon keyword (+2) → medium-high priority
- Classify as state-policy explainer; note Bend/Deschutes impact must be researched separately (HousingWire won't have local detail)
- Topic card: `"Oregon just changed its housing rules — here's how it affects Bend"`
- Flag: requires local sourcing (Central Oregon Daily, ORMLS data) before publish; do not use HW article as sole source

---

## Output format (RSS items as parsed)

```json
{
  "source": "housingwire",
  "feed": "mortgage",
  "fetched_at": "2026-05-07T13:00:00Z",
  "items": [
    {
      "title": "30-year fixed mortgage rate dips to 6.18%",
      "link": "https://www.housingwire.com/articles/...",
      "pubDate": "2026-05-07T10:30:00Z",
      "description": "Excerpt text...",
      "category": ["Mortgage", "Rates"],
      "relevance_score": 4
    }
  ]
}
```

HousingWire Data API response shape is not publicly documented. Expect JSON with a `data` array, date fields, numeric metric values, and geographic identifiers. Exact schema must be confirmed from provisioning docs.

---

## Fallback chain (when RSS or API is unavailable)

| Failure | Fallback |
|---|---|
| HousingWire RSS returns 403/503 | CNBC Real Estate RSS (`cnbc.com/real-estate/`) + Calculated Risk blog (Bill McBride — mortgage rate authority) |
| HousingWire Data API key not provisioned | FRED API (`api.stlouisfed.org`) for 30yr rate + 10Y Treasury (free, no key needed for read); Supabase for local inventory |
| Oregon-specific news gap | Central Oregon Daily, Bend Bulletin, OregonLive RSS feeds |
| Realtor.com news | `realtor.com/news/` RSS — covers national market + occasional Pacific Northwest |
| Mortgage rate data specifically | Freddie Mac PMMS (`freddiemac.com/pmms`) — weekly Thursday publication, authoritative benchmark |

---

## Current status summary (2026-05-06)

| Component | Status |
|---|---|
| `HOUSINGWIRE_API_KEY` | Not set — API inactive in this repo |
| `HOUSINGWIRE_API_BASE_URL` | Not set — endpoint unknown |
| `/reports/explore` page | Degraded — shows config hint, no live data |
| RSS news feed | Available now, no credentials needed |
| HousingWire Data enterprise tier | Not licensed — requires sales engagement |
| 4-week free sample | Available — contact `housingwire.com/enterprise-data` |
| Bend/Deschutes ZIP coverage | Included in product scope (99% US ZIP coverage) |
| Oregon editorial coverage | Infrequent but real — state policy level only, not city-level |

**Action needed to activate data API:** Matt contacts HousingWire Data sales at `housingwire.com/enterprise-data`, requests 4-week sample for Deschutes County ZIPs, evaluates data quality against Supabase/Spark, negotiates license if quality is sufficient, obtains `HOUSINGWIRE_API_KEY` + `HOUSINGWIRE_API_BASE_URL` for Vercel env.
