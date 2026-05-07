# Tool: Spark API (FlexMLS / FBS)

**Verified:** 2026-05-06  
**Sources:** sparkplatform.com/docs, live codebase (`lib/spark.ts`, `lib/spark-odata.ts`, `app/api/cron/sync-delta/route.ts`), COAR search filters from `my.flexmls.com`  
**Authoritative for:** active inventory, current DOM, real-time status changes  
**Supabase wins for:** reconciled historical close data (ClosePrice, CloseDate) once a listing is finalized and past the Spark cutover date

---

## 1. Auth + Base URLs

### Endpoint variants (both active in production)

| Variant | Base URL | Used for |
|---------|----------|----------|
| **Spark v1 (SparkQL)** | `https://replication.sparkapi.com/v1` | Content engine, sync, market data pulls |
| **RESO OData v3 (recommended for new)** | `https://replication.sparkapi.com/Version/3/Reso/OData/` | OData-standard clients |
| RESO OData v2 (legacy) | `https://replication.sparkapi.com/Reso/OData/` | Backward compat only |

**Production default** (`SPARK_API_BASE_URL` in `.env.local`):
```
https://replication.sparkapi.com/v1
```

Non-replication fallback (avoid — limits `_limit` to 25):
```
https://sparkapi.com/v1
```

### Authentication header (exact format, verified in production code)

```
Authorization: Bearer {SPARK_API_KEY}
Accept: application/json
```

Optional override via `SPARK_AUTH_SCHEME=OAuth` if MLS requires it. Production uses `Bearer`.

All requests over HTTPS only. Never expose `SPARK_API_KEY` client-side.

### Two client implementations in repo

**`lib/spark.ts`** — SparkQL v1 client (primary for content engine + sync)
- Uses `_filter`, `_limit`, `_page`, `_orderby`, `_select`, `_expand`, `_pagination`
- Response envelope: `{ D: { Success, Results, Pagination } }`

**`lib/spark-odata.ts`** — RESO OData client (secondary, used in full-history sync)
- Uses `$filter`, `$top`, `$select`, `$expand`, `$orderby`, `$count`
- Response envelope: `{ value: [...], "@odata.nextLink": "...", "@odata.count": N }`
- Prefers `@odata.nextLink` for pagination (cursor-safe)

For content engine market reports, use **`lib/spark.ts`** (SparkQL v1). It is the battle-tested primary.

---

## 2. Rate Limits

| Key type | Max requests | Window | Max `_limit` per request |
|----------|-------------|--------|--------------------------|
| IDX key | 1,500 | 5 minutes | 25 |
| Replication key (production) | 4,000 | 5 minutes | 1,000 (listings); 200 (other resources) |

- HTTP 429 on breach → `lib/spark-odata.ts` auto-retries once after 60 seconds
- Spark recommends polling for updates no more frequently than once per hour
- Server-side cache holds matching indexes for 10 minutes per API key — always use two timestamps in update filters (see §5)

---

## 3. SparkQL Filter Syntax (v1 — used by content engine)

### Format

```
_filter=<field> <Operator> <value> [And|Or|Not <field> <Operator> <value>]
```

### Operators

| Operator | Types | Example |
|----------|-------|---------|
| `Eq` | All | `City Eq 'Bend'` |
| `Ne` | All | `City Ne 'Redmond'` |
| `Bt` | Date, Datetime, Integer, Decimal | `ListPrice Bt 500000,1000000` |
| `Gt` | Date, Datetime, Integer, Decimal | `ListPrice Gt 500000` |
| `Ge` | Date, Datetime, Integer, Decimal | `CloseDate Ge 2026-01-01` |
| `Lt` | Date, Datetime, Integer, Decimal | `DaysOnMarket Lt 30` |
| `Le` | Date, Datetime, Integer, Decimal | `ListPrice Le 1000000` |

### Data types

| Type | Format | Example |
|------|--------|---------|
| Date | `YYYY-MM-DD` | `CloseDate Ge 2026-01-01` |
| Datetime | `YYYY-MM-DDThh:mm:ssZ` | `ModificationTimestamp Gt 2026-05-01T00:00:00Z` |
| Character | Single-quoted | `City Eq 'Bend'` |
| Integer | Bare number | `BedsTotal Ge 3` |
| Decimal | Bare decimal | `BathsTotal Eq 2.0` |
| Boolean | `true`/`false` | `AssociationYN Eq true` |
| NULL | Keyword | `CloseDate Eq NULL` |

### Connectors and nesting

```
PropertyType Eq 'A' And City Eq 'Bend'
PropertyType Eq 'A' And (City Eq 'Bend' Or City Eq 'Redmond')
```

**Maximum one level of parentheses.** Two levels return a 400 error.

### String functions (Character type only)

```
City Eq startswith('Ben')
City Eq endswith('end')
City Eq contains('end')
StandardStatus Eq contains('closed')     # case-insensitive substring match
```

Wildcards (`*`, `?`) also work with `Eq`/`Ne` for Character fields (max 3 per condition).

### Temporal functions

```
ModificationTimestamp Ge days(-7)        # last 7 days
CloseDate Ge months(-6)                  # last 6 months
OriginalEntryTimestamp Ge years(-1)      # last year
OnMarketDate Ge now()                    # today or later
```

### OData filter syntax (for `lib/spark-odata.ts` / RESO endpoint)

The RESO OData endpoint uses standard OData v4 syntax with `$filter` parameter:

```
$filter=StandardStatus eq 'Active' and City eq 'Bend'
$filter=CloseDate ge 2026-01-01 and PropertyType eq 'A'
```

Use SparkQL (`_filter`) for production content engine pulls. OData (`$filter`) only when using the `/Reso/OData/` endpoint directly.

---

## 4. Pagination

### SparkQL v1 (preferred for content engine)

| Parameter | Default | Range | Notes |
|-----------|---------|-------|-------|
| `_limit` | 10 | 0–1000 (replication) | Set 200 for delta sync, 1000 for full sync |
| `_page` | 1 | 1–100,000 | Use with `_pagination=1` to get TotalPages |
| `_pagination` | 0 | 0, 1, "count" | 1 = include Pagination block |
| `_skip` | — | 0–2,500,000 | Risky: can miss records if data changes mid-sync |
| `_skiptoken` | — | ListingKey string | **Preferred for large syncs** — cursor-safe |
| `_orderby` | — | field + direction | `-ListPrice` = desc, `+OnMarketDate` = asc |

**Pagination response block** (when `_pagination=1`):
```json
{
  "D": {
    "Success": true,
    "Results": [...],
    "Pagination": {
      "TotalRows": 589041,
      "PageSize": 200,
      "TotalPages": 2946,
      "CurrentPage": 1
    }
  }
}
```

### RESO OData (for `lib/spark-odata.ts`)

- `$top=1000` per page (max for replication key)
- `$count=true` returns `@odata.count` in response
- Follow `@odata.nextLink` in each response for next page (contains `$skiptoken` with last ListingKey)
- Never use `$skip` with large datasets — use `@odata.nextLink` exclusively

---

## 5. Key Endpoints for Content Engine

All examples use base URL `https://replication.sparkapi.com/v1`.

### 5.1 Active inventory snapshot (Bend SFR)

**Purpose:** Real-time active listing count and median list price for market reports.  
**Spark wins** for this — Supabase replication lags up to 15 minutes.

```
GET /listings?_filter=StandardStatus Eq contains('active') And PropertyType Eq 'A' And City Eq 'Bend'&_limit=200&_pagination=1&_select=ListPrice,DaysOnMarket,CumulativeDaysOnMarket,ListingKey&_orderby=+OnMarketDate
```

Iterate all pages to get full active count. Use `TotalRows` from Pagination for count-only check:

```
GET /listings?_filter=StandardStatus Eq contains('active') And PropertyType Eq 'A' And City Eq 'Bend'&_limit=1&_pagination=1
```

Returns `Pagination.TotalRows` = active SFR count in Bend. Cheap — only one listing fetched.

### 5.2 Closed/sold data for YTD market report

**Purpose:** Closed sales for median price, volume, DOM computation.  
**Supabase wins** once listings are finalized and refreshed past the cutover date. Use Spark for cross-check reconciliation gate only.

```
GET /listings?_filter=StandardStatus Eq contains('closed') And PropertyType Eq 'A' And City Eq 'Bend' And CloseDate Ge 2026-01-01 And CloseDate Le 2026-04-30&_limit=1&_pagination=1&_select=ListingKey
```

Returns `TotalRows` = closed SFR Bend YTD count for reconciliation.

Full data pull (for cross-check only — Supabase provides the actual metric values):
```
GET /listings?_filter=StandardStatus Eq contains('closed') And PropertyType Eq 'A' And City Eq 'Bend' And CloseDate Ge 2026-01-01 And CloseDate Le 2026-04-30&_limit=200&_pagination=1&_select=ListPrice,ClosePrice,OriginalListPrice,CumulativeDaysOnMarket,CloseDate
```

### 5.3 Delta sync (incremental updates — 15-min cron)

**Purpose:** Catch new listings, price changes, status changes since last run.  
**Always use two timestamps** to avoid cache inconsistencies.

```
GET /listings?_filter=ModificationTimestamp Gt 2026-05-06T10:00:00Z And ModificationTimestamp Lt 2026-05-06T10:30:00Z&_orderby=+ModificationTimestamp&_expand=Photos,Videos,OpenHouses&_limit=200&_page=1
```

Production implementation in `app/api/cron/sync-delta/route.ts` uses `sinceIso` as the lower bound only (no upper bound) because each run updates `sync_state.last_delta_sync_at` only on success.

### 5.4 Single listing with full media (listing_reveal video build)

```
GET /listings/{ListingKey}?_expand=Photos,FloorPlans,Videos,VirtualTours,OpenHouses,Documents
```

Returns 404 when listing is removed from MLS. Production code handles this with `null` return.

Photo URL sizes available (in order of preference for video builds):
`Uri1600` → `Uri1280` → `Uri1024` → `Uri800` → `Uri640` → `Uri300`

### 5.5 New listings in last 24 hours (listing_trigger)

```
GET /listings?_filter=OnMarketDate Ge days(-1) And PropertyType Eq 'A' And City Eq 'Bend'&_orderby=-OnMarketDate&_limit=200&_pagination=1&_select=ListingKey,ListPrice,StreetNumber,StreetName,City,StandardStatus,BedsTotal,BathsTotal,BuildingAreaTotal,Photos
```

**Use `OnMarketDate` not `ModificationTimestamp`** for new listing detection. ModificationTimestamp can restrict data to a narrow window in some Spark configurations; OnMarketDate returns the full historical dataset including pre-2024 records.

### 5.6 Subdivision / neighborhood sold data (neighborhood_overview)

```
GET /listings?_filter=StandardStatus Eq contains('closed') And SubdivisionName Eq 'Awbrey Butte' And CloseDate Ge days(-90)&_limit=200&_pagination=1&_select=ListPrice,ClosePrice,CumulativeDaysOnMarket,CloseDate,SubdivisionName
```

Wildcards work for subdivision name fuzzy match:
```
SubdivisionName Eq 'Awbrey*'
```

### 5.7 Market Statistics endpoints (Spark native aggregates)

These return pre-aggregated monthly time series — useful for trend charts without SQL.

Base: `/v1/marketstatistics/{type}`  
Common params: `LocationField=City&LocationValue=Bend&PropertyTypeCode=A`

| Endpoint | Options values |
|----------|----------------|
| `/marketstatistics/inventory` | `ActiveListings`, `NewListings`, `PendedListings`, `SoldListings` |
| `/marketstatistics/price` | `SoldMedianSoldPrice`, `SoldAverageSoldPrice`, `ActiveMedianListPrice`, `SoldMedianListPrice` |
| `/marketstatistics/dom` | `AverageDom`, `AverageCdom` |
| `/marketstatistics/absorption` | `AbsorptionRate` |
| `/marketstatistics/ratio` | `SaleToListPriceRatio`, `SaleToOriginalListPriceRatio` |
| `/marketstatistics/volume` | `SoldSaleVolume`, `ActiveListVolume` |

Example — Bend SFR monthly inventory + median sold price:
```
GET /v1/marketstatistics/inventory?LocationField=City&LocationValue=Bend&PropertyTypeCode=A&Options=ActiveListings,SoldListings

GET /v1/marketstatistics/price?LocationField=City&LocationValue=Bend&PropertyTypeCode=A&Options=SoldMedianSoldPrice
```

**Response structure:**
```json
{
  "D": {
    "Success": true,
    "Results": [{
      "Dates": ["2025-01-01", "2025-02-01", ...],
      "ActiveListings": [312, 298, ...],
      "SoldListings": [145, 167, ...]
    }]
  }
}
```

Note: Day in Dates array is not significant — data is monthly (month + year only).

**Use these for trend visualization only.** For verified market report figures, always reconcile against Supabase (see §7).

---

## 6. COAR / Bend Region Naming (Verified)

**MLS organization:** Central Oregon Association of REALTORS (COAR)  
**MLS name:** Multiple Listing Service of Central Oregon (MLSCO)  
**FlexMLS operator:** FBS (same company that makes Spark API)  
**Coverage area:** Crook, Deschutes, Harney, Jefferson, and Wheeler counties

### City filter value for Bend

```
City Eq 'Bend'
```

This is confirmed from live COAR FlexMLS search filters and production sync code. No region prefix needed.

Other Central Oregon markets covered by VideoProps.ts `MARKETS` array:

| VideoProps Market | Spark filter |
|-------------------|-------------|
| `'Bend'` | `City Eq 'Bend'` |
| `'Redmond'` | `City Eq 'Redmond'` |
| `'Sisters'` | `City Eq 'Sisters'` |
| `'Sunriver'` | `City Eq 'Sunriver'` |
| `'La Pine'` | `City Eq 'La Pine'` |
| `'Jefferson County'` | `CountyOrParish Eq 'Jefferson'` |
| `'Crook County'` | `CountyOrParish Eq 'Crook'` |

For county-level filters, use `CountyOrParish` not `City`. Deschutes County = `CountyOrParish Eq 'Deschutes'`.

### PropertyType codes (COAR / ORMLS confirmed)

From live COAR FlexMLS search URL (verified 2026-05-06):

```
PropertyType Eq 'A','B','C','D','E','F','G','H'
```

| Code | Property type |
|------|---------------|
| `A` | Single Family Residence (SFR) — use for all market reports |
| `B` | Condominium |
| `C` | Townhouse / attached |
| `D` | Multi-family |
| `E` | Land / Lot |
| `F` | Commercial |
| `G` | Farm & Ranch |
| `H` | Manufactured / Mobile |

**All market report queries MUST filter `PropertyType Eq 'A'`** unless explicitly covering multi-type markets. This matches CLAUDE.md `PropertyType='A'` for SFR convention and `VideoProps.ts` fixture filters.

### StandardStatus values (COAR)

Production code uses `contains()` function because COAR status values include variants:

| Logical status | Filter pattern | Examples seen in COAR |
|---------------|---------------|----------------------|
| Active | `contains('active')` | `Active`, `Active w/Contingency` |
| Pending | `contains('pending')` | `Pending`, `Pending Short Sale` |
| Under Contract | `contains('under contract')` | `Under Contract` |
| Contingent | `contains('contingent')` | `Active w/Contingency` |
| Closed | `contains('closed')` | `Closed` |
| Expired | `contains('expired')` | `Expired` |
| Withdrawn | `contains('withdrawn')` | `Withdrawn` |
| Cancelled | `contains('cancel')` | `Cancelled` |

For market reports, use exact `StandardStatus Eq 'Active'` and `StandardStatus Eq 'Closed'` as a first attempt — fall back to `contains()` if counts look off. The `Eq contains()` pattern is production-verified.

---

## 7. Reconciliation Procedure — Spark × Supabase (HARD PRE-RENDER GATE)

This gate must pass before any `npx remotion render` call for market report videos. Per CLAUDE.md: **STOP RENDER if any |delta| > 1%.**

### What to reconcile

For each of these figures, compute both Spark value and Supabase value:

1. Active SFR listing count (Bend, current snapshot)
2. Closed SFR count YTD (Bend, same date window as report)
3. Median closed price YTD (Bend SFR)
4. Median DOM (use `CumulativeDaysOnMarket` from Spark; `days_to_pending` from Supabase — these are different metrics, see note)
5. Months of Supply (compute from active count + closed lookback)

### Step-by-step procedure

```typescript
// Step 1: Pull active count from Spark (authoritative for active inventory)
const sparkActiveRes = await fetchSparkListingsPage(accessToken, {
  filter: "StandardStatus Eq contains('active') And PropertyType Eq 'A' And City Eq 'Bend'",
  limit: 1,
})
const sparkActiveCount = sparkActiveRes.D?.Pagination?.TotalRows ?? null

// Step 2: Pull active count from Supabase
const { count: supabaseActiveCount } = await supabase
  .from('listings')
  .select('*', { count: 'exact', head: true })
  .ilike('StandardStatus', '%Active%')
  .eq('"PropertyType"', 'A')
  .eq('"City"', 'Bend')

// Step 3: Compute delta
const activeDeltaPct = Math.abs(
  ((sparkActiveCount - supabaseActiveCount) / supabaseActiveCount) * 100
)

// Step 4: STOP if delta > 1%
if (activeDeltaPct > 1) {
  throw new Error(
    `Reconciliation FAIL — active listings: Spark=${sparkActiveCount}, ` +
    `Supabase=${supabaseActiveCount}, delta=${activeDeltaPct.toFixed(2)}%`
  )
}

// Step 5: Document in citations.json
const citation: SupabaseCitation = {
  kind: 'supabase',
  metric: 'Active SFR Listings (Bend)',
  value: supabaseActiveCount,
  display: String(supabaseActiveCount),
  source: 'Supabase listings',
  table: 'listings',
  filters: "StandardStatus ILIKE '%Active%', PropertyType='A', City='Bend'",
  rowCount: supabaseActiveCount,
  query: "SELECT count(*) FROM listings WHERE ...",
  sparkValue: sparkActiveCount,
  sparkDeltaPct: activeDeltaPct,
  fetchedAtIso: new Date().toISOString(),
}
```

### Reconciliation rules per metric

| Metric | Spark authoritative when | Supabase authoritative when | Acceptable delta |
|--------|--------------------------|----------------------------|-----------------|
| Active inventory count | Always (real-time) | Never for active | < 1% |
| Active median list price | Use for cross-check | Supabase if counts match | < 1% |
| Closed count YTD | Cross-check only | Finalized listings in Supabase | < 1% |
| Median close price YTD | Cross-check only | Finalized `ClosePrice` in Supabase | < 1% |
| Months of Supply | Spark active count is input | Compute manually from both | Active delta < 1% |
| DOM (`CumulativeDaysOnMarket`) | Current/active listings | `days_to_pending` for sold | Not directly comparable — see note |

**DOM note:** Spark `CumulativeDaysOnMarket` tracks MLS days across all relists. Supabase `days_to_pending` tracks days from list to pending for sold listings. These are different metrics. Do not reconcile DOM against each other — use each for its specific purpose. Market reports use `days_to_pending` per `VideoProps.ts` comment: "DOM metrics use the `days_to_pending` column. Never DaysOnMarket."

### Conflict resolution

When any delta > 1%, do not guess. Surface to Matt:

```
RECONCILIATION CONFLICT: Active SFR Listings (Bend)
- Spark:    412 (query: StandardStatus contains('active') And PropertyType Eq 'A' And City Eq 'Bend', fetched 2026-05-06T14:22:00Z)
- Supabase: 398 (query: SELECT count(*) FROM listings WHERE ..., fetched 2026-05-06T14:22:00Z)
- Delta:    3.5% (exceeds 1% threshold)
- Suspected cause: Supabase sync lag — delta cron runs every 15 min; Spark is real-time
- Action: Re-run after Supabase sync completes, OR use Spark value for active inventory (Spark is authoritative)
```

Wait for Matt's resolution before rendering.

### One-line verification trace format (per CLAUDE.md)

Required in `citations.json` for every figure:

```
412 active SFR — Spark /v1/listings, PropertyType='A', City='Bend', StandardStatus contains('active'), TotalRows=412, fetched 2026-05-06T14:22:00Z; Supabase cross-check 410 (delta 0.5% — pass)
```

---

## 8. Listing History Endpoints

| Endpoint | Purpose | Notes |
|----------|---------|-------|
| `GET /v1/listings/{key}/history` | Status/event audit trail | Try first; may be empty for some roles |
| `GET /v1/listings/{key}/historical/pricehistory` | Clean price timeline | Fallback when /history empty |
| `GET /v1/listings/{key}/historical` | All prior MLS records for same property | "Previously listed at $X" use case |

Production fallback chain (from `app/api/cron/sync-delta/route.ts`):
1. Call `/history`
2. If empty, call `/historical/pricehistory`
3. If both empty, log and continue

---

## 9. Photo Resolution Guide

Spark returns photos in `StandardFields.Photos[]` with multiple resolution URIs per photo:

```typescript
type SparkPhoto = {
  UriThumb?: string   // thumbnail
  Uri300?: string
  Uri640?: string
  Uri800?: string
  Uri1024?: string
  Uri1280?: string
  Uri1600?: string    // preferred for video builds
  Uri2048?: string
  UriLarge?: string
  Primary?: boolean
}
```

**For listing video builds:** Use `Uri1600` → `Uri1280` → `Uri1024` → `Uri800` as fallback chain.  
Download promptly — photo URLs can expire.  
Access via `_expand=Photos` on listing request, or `GET /v1/listings/{key}/photos` as sub-resource.

---

## 10. Common Failure Modes

| Failure | Symptom | Fix |
|---------|---------|-----|
| Missing `replication.` subdomain | HTTP 403 "use replication.sparkapi.com" | Set `SPARK_API_BASE_URL=https://replication.sparkapi.com/v1` |
| `_limit` exceeds 25 | 400 error | Only replication keys allow up to 1,000 |
| Two levels of parentheses in `_filter` | 400 error | Max one level |
| `ModificationTimestamp` used for `_orderby` on full sync | Returns narrow date window, misses historical data | Use `OnMarketDate` for `_orderby` on full historical syncs |
| Status filter too strict | Misses variants like `Active w/Contingency` | Use `Eq contains('active')` not `Eq 'Active'` |
| Missing `PropertyType Eq 'A'` | Mixes SFR with condo/land/commercial — inflates or deflates counts | Always filter `PropertyType Eq 'A'` for SFR-only reports |
| Reconciliation delta > 1% but agent proceeds | Non-ship deliverable per CLAUDE.md | STOP. Surface to Matt. |
| PhotoURL expiration | Broken images in video | Download and cache immediately after fetch |
| Masked fields (`"********"`) | Numeric columns fail parse | `lib/spark.ts` `toNum()` returns `null` for masked strings — handled |
| Two-timestamp missing on update filter | Cache inconsistency; may miss or duplicate records | Always use `Gt <start> And Lt <end>` for delta queries |

---

## 11. Five Worked Content-Engine Examples

### Example 1 — listing_trigger: New Bend SFR listings in last 24h

```typescript
const { D } = await fetchSparkListingsPage(accessToken, {
  filter: "OnMarketDate Ge days(-1) And PropertyType Eq 'A' And City Eq 'Bend'",
  orderby: '-OnMarketDate',
  limit: 200,
  expand: 'Photos',
  select: 'ListingKey,ListPrice,StreetNumber,StreetName,City,StandardStatus,BedsTotal,BathsTotal,BuildingAreaTotal',
})
const newListings = D?.Results ?? []
// Fire listing_trigger for each
```

### Example 2 — market_report_video: Reconciliation gate for active inventory

```typescript
// Spark (authoritative)
const sparkRes = await fetchSparkListingsPage(accessToken, {
  filter: "StandardStatus Eq contains('active') And PropertyType Eq 'A' And City Eq 'Bend'",
  limit: 1,
})
const sparkCount = sparkRes.D?.Pagination?.TotalRows

// Supabase (cross-check)
const { count: sbCount } = await supabase
  .from('listings')
  .select('*', { count: 'exact', head: true })
  .ilike('StandardStatus', '%Active%')
  .eq('"PropertyType"', 'A')
  .eq('"City"', 'Bend')

const delta = Math.abs(((sparkCount - sbCount) / sbCount) * 100)
if (delta > 1) throw new Error(`Reconciliation FAIL: active=${sparkCount} vs ${sbCount}, delta=${delta.toFixed(2)}%`)
```

### Example 3 — neighborhood_overview: Awbrey Butte closed last 90 days

```typescript
const { D } = await fetchSparkListingsPage(accessToken, {
  filter: "StandardStatus Eq contains('closed') And SubdivisionName Eq 'Awbrey Butte' And CloseDate Ge days(-90)",
  limit: 200,
  select: 'ListPrice,ClosePrice,OriginalListPrice,CumulativeDaysOnMarket,CloseDate,SubdivisionName,Latitude,Longitude',
})
const soldListings = D?.Results ?? []
```

### Example 4 — listing_reveal: Full listing data + photos for specific MLS#

```typescript
// Fetch by ListingKey (preferred) or fall back to ListNumber search
const res = await fetchSparkListingByKey(accessToken, listingKey, 'Photos,FloorPlans,Videos,VirtualTours')
const listing = res?.D?.Results?.[0]?.StandardFields
const photos = listing?.Photos ?? []
const primaryPhoto = photos.find(p => p.Primary) ?? photos[0]
const heroUrl = primaryPhoto?.Uri1600 ?? primaryPhoto?.Uri1280
```

### Example 5 — market_report_video: Months of Supply manual computation

```typescript
// Per CLAUDE.md formula: active_listings / (closed_last_6_months / 6)
// Per VideoProps.ts: "monthsOfSupply is the SFR-only manual computation. Never market_pulse_live.months_of_supply"

// Step 1: Get active count from Spark (authoritative)
const activeCount = sparkActiveCount  // from reconciliation gate above

// Step 2: Get 6-month closed count from Supabase (authoritative for historical)
const sixMonthsAgo = new Date()
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
const { count: closed6mo } = await supabase
  .from('listings')
  .select('*', { count: 'exact', head: true })
  .ilike('StandardStatus', '%Closed%')
  .eq('"PropertyType"', 'A')
  .eq('"City"', 'Bend')
  .gte('"CloseDate"', sixMonthsAgo.toISOString().split('T')[0])

// Step 3: Compute
const monthlyAbsorption = closed6mo / 6
const monthsOfSupply = activeCount / monthlyAbsorption

// Step 4: Verdict per CLAUDE.md thresholds
const condition =
  monthsOfSupply <= 4 ? "Seller's Market" :
  monthsOfSupply <= 6 ? 'Balanced Market' :
  "Buyer's Market"

// Step 5: Cite
const citation: MonthsOfSupplyCitation = {
  kind: 'months_of_supply',
  metric: 'Months of Supply',
  value: monthsOfSupply,
  display: `${monthsOfSupply.toFixed(1)} mo`,
  active: activeCount,
  closedLookback: closed6mo,
  lookbackDays: 180,
  formula: 'active / (closed_180d / 180 * 30)',
  source: 'Supabase listings (SFR-only manual)',
  sparkActive: sparkActiveCount,
  sparkDeltaPct: activeDeltaPct,
  fetchedAtIso: new Date().toISOString(),
}
```

---

## 12. Response Envelope Reference

### SparkQL v1 success response

```json
{
  "D": {
    "Success": true,
    "Results": [
      {
        "Id": "20131002000000123456000000",
        "ResourceUri": "/v1/listings/20131002000000123456000000",
        "StandardFields": {
          "ListingKey": "20131002000000123456000000",
          "ListPrice": 749000,
          "StandardStatus": "Active",
          "City": "Bend",
          "PropertyType": "A",
          "BedsTotal": 3,
          "BathsTotal": 2.0,
          "Photos": [...]
        }
      }
    ],
    "Pagination": {
      "TotalRows": 412,
      "PageSize": 200,
      "TotalPages": 3,
      "CurrentPage": 1
    }
  }
}
```

### SparkQL v1 error response

```json
{
  "D": {
    "Success": false,
    "Code": 1500,
    "Message": "Permission denied for requested data",
    "SparkQLErrors": [{ "token": "City", "message": "Field not searchable" }]
  }
}
```

Spark can return HTTP 200 with `Success: false` — always check `D.Success` and `D.Message`, not just HTTP status. Production code in `lib/spark.ts` handles this via `sparkErrorFromBody()`.

---

## 13. HTTP Status Code Reference

| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Parse body; check `D.Success` |
| 400 | Bad request | Fix filter/params; check `D.SparkQLErrors` |
| 401 | Unauthorized | Re-check `SPARK_API_KEY` |
| 403 | Forbidden | Log, skip permanently — role restriction |
| 404 | Not found | Listing removed; return null |
| 429 | Rate limited | Exponential backoff; production code retries once after 60s |
| 500/503 | Server error | Retry with backoff (3x max) |

---

## 14. Environment Variables

| Variable | Required | Value |
|----------|----------|-------|
| `SPARK_API_KEY` | Yes | Bearer token from COAR/FBS Spark Datamart |
| `SPARK_API_BASE_URL` | Yes | `https://replication.sparkapi.com/v1` |
| `SPARK_AUTH_SCHEME` | No | `Bearer` (default) or `OAuth` |

Verified live 2026-04-27 per `video_production_skills/API_INVENTORY.md`: `SPARK_API_KEY` ✅, `SPARK_API_BASE_URL` ✅.

---

## 15. Cross-References

| Topic | File |
|-------|------|
| SparkQL client implementation | `/lib/spark.ts` |
| RESO OData client | `/lib/spark-odata.ts` |
| Delta sync cron (15-min) | `/app/api/cron/sync-delta/route.ts` |
| Full sync action | `/app/actions/sync-spark.ts` |
| Spark→Supabase row mapper | `/lib/listing-mapper.ts` |
| Supabase `listings` schema + mixed-case column rules | `CLAUDE.md` §"Supabase listings Schema" |
| VideoProps citation types | `/video/market-report/src/VideoProps.ts` |
| Months of supply formula + thresholds | `CLAUDE.md` §"Data Accuracy" |
| API status (keys live/dead) | `video_production_skills/API_INVENTORY.md` |
| Existing Spark reference doc | `docs/SPARK_API_REFERENCE.md` |
| Spark fields audit | `docs/SPARK_FIELDS_AUDIT.md` |
