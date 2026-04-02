# Sync Handoff — Current State

This document is a handoff for another agent. It describes the current Spark/MLS sync procedures, where each piece lives, what fields are synced, what keeps active listings fresh, what backfills history, and what gaps are still known.

Use this as the source of truth for the current implementation state in this branch.

---

## 1. High-level mental model

There are **four** distinct sync jobs in the repo:

1. **Delta sync** — keeps changed/current listings fresh.
2. **Full sync** — broad listing sweep plus active/pending history phase.
3. **Terminal history sync** — finalizes closed/expired/withdrawn/canceled listings.
4. **Year-by-year backfill** — historical lane for older years and a dedicated current-year lane for 2026.

These jobs are related, but they are not the same thing.

### The two operator goals

The codebase is effectively trying to satisfy two separate goals:

- **Keep current listings fresh**
  - current status
  - price changes
  - active/pending transitions
  - newly closed / expired / withdrawn / canceled changes

- **Complete historical data**
  - fill `listing_history`
  - finalize terminal listings once their history has been captured
  - drain older-year backlog year by year

Do not conflate the active freshness path with the historical backfill path.

---

## 2. Core files and what they do

### Delta / active freshness

- `app/actions/sync-spark.ts`
  - `syncSparkListingsDelta()`
  - incremental active freshness path
  - uses `sync_state.last_delta_sync_at`
  - writes `sync_checkpoints`
  - emits activity-event categories

- `app/api/cron/sync-delta/route.ts`
  - thin authenticated cron wrapper around `syncSparkListingsDelta()`

### Full listing sweep

- `app/actions/sync-full-cron.ts`
  - `runOneFullSyncChunk()`
  - state machine for `sync_cursor`
  - `phase = listings | history | idle | refresh_active_pending`

- `app/api/cron/sync-full/route.ts`
  - authenticated cron wrapper for full sync chunks

### Listing/history fetch logic

- `lib/spark.ts`
  - `fetchSparkListingsPage()`
  - `fetchSparkListingHistory()`
  - `fetchSparkPriceHistory()`
  - `fetchSparkHistoricalListings()`
  - `sparkListingToSupabaseRow()`

- `lib/spark-odata.ts`
  - RESO OData client
  - `SPARK_SELECT_FIELDS`

- `app/actions/sync-spark.ts`
  - `syncListingHistory()`
  - `runOnePageActivePendingSync()`
  - `syncSparkListingsActiveAndPending()`

### Historical / year lanes

- `app/api/admin/sync/_shared/run-year-sync.ts`
  - `runYearSyncChunk()`
  - current year + historical backlog lane state machine

- `app/api/cron/sync-year-by-year/route.ts`
  - authenticated year sync chunk route
  - supports `?year=` and `?lane=`

- `scripts/run-year-sync.mjs`
  - single year runner / loop

- `scripts/run-sync-range.mjs`
  - descending historical range runner

### Terminal-only finalization

- `app/api/cron/sync-history-terminal/route.ts`
  - terminal history chunk route
  - supports worker sharding and year scoping
  - uses dedicated cursor id `terminal-history`

### Status / admin views

- `app/admin/(protected)/sync/page.tsx`
  - current sync dashboard composition

- `app/admin/(protected)/sync/SyncLiveStatusAndTerminal.tsx`
  - active/full/terminal visibility

- `app/admin/(protected)/sync/SyncHeavyStatusSections.tsx`
  - Spark vs DB counts and admin controls

- `app/admin/(protected)/sync/YearSyncLanes.tsx`
  - separate `2026 now` vs `historical backfill` lane UI

- `app/admin/(protected)/sync/SyncRunLog.tsx`
  - collapsible delta/full run log

---

## 3. Delta sync — how current listings are kept fresh

### Code path

- Entry point: `GET /api/cron/sync-delta`
- Wrapper: `app/api/cron/sync-delta/route.ts`
- Main logic: `app/actions/sync-spark.ts` → `syncSparkListingsDelta()`

### Logic

1. Read `sync_state.last_delta_sync_at`.
2. Build Spark filter:
   - `ModificationTimestamp Gt ${sinceIso}`
3. Fetch changed listings page by page from Spark.
4. Upsert changed rows into `listings`.
5. Compare the new row to the old row and detect:
   - new listing
   - pending
   - closed
   - expired / withdrawn / canceled
   - back on market
   - price drop
6. Write a `sync_checkpoints` row for the run.
7. Update `sync_state.last_delta_sync_at` **only after success**.

### Why this matters

This is the timestamped “what changed since the last successful run?” path for active freshness.

### Data written

- `listings`
- `activity_events`
- `sync_checkpoints`
- `sync_state.last_delta_sync_at`

### Important limitation

This path keeps listing rows fresh, but it does **not** by itself guarantee complete history coverage for active listings.

That is a separate problem.

---

## 4. Full sync — what it actually does

### Code path

- Entry point: `GET /api/cron/sync-full`
- Wrapper: `app/api/cron/sync-full/route.ts`
- State machine: `app/actions/sync-full-cron.ts`

### Cursor table

Uses `sync_cursor` row:
- `id = 'default'`
- `phase`
- `next_listing_page`
- `next_history_offset`
- run counters / flags

### Listing phase

`runOneFullSyncChunk()`:
- calls `syncSparkListings()`
- processes a fixed number of listing pages per request
- updates:
  - `next_listing_page`
  - `run_listings_upserted`

### History phase

Only after all listing pages are done, full sync enters:
- `phase = history`
- then calls `syncListingHistory({ activeAndPendingOnly: true })`

### Important limitation

This is one of the key current design problems:

**Active/pending history refresh is blocked behind the giant listings sweep.**

That means active rows can be current while many active listings still have no `listing_history`.

---

## 5. Active listing history — current behavior and gap

### Current behavior

`syncListingHistory({ activeAndPendingOnly: true })`:
- fetches candidate active/pending rows from `listings`
- for each listing:
  - tries Spark `/history`
  - if empty, tries Spark `/historical/pricehistory`
  - writes timeline rows into `listing_history`

### Current live gap

At the time of the last live check in this branch:
- active/pending total: `6648`
- active/pending with history: `1602`
- active/pending without history: `5046`

That means active listing freshness is working, but active history completeness is still behind.

### Key reason

The full sync only reaches active history **after** the massive listing phase finishes.
Delta does not currently perform targeted active history refresh.

---

## 6. Terminal listing finalization — when listings stop being looked at

### Terminal statuses

These are treated as terminal:
- closed
- expired
- withdrawn
- canceled / cancelled

See `isTerminalStatus()` in `app/actions/sync-spark.ts`.

### Finalization rule

A listing is only considered fully finalized when:
- `history_finalized = true`
- `is_finalized = true`

That happens only after the history pipeline has successfully run for that terminal listing.

### What finalization means

Once terminal and finalized:
- it stops being retried in the normal freshness paths
- it is excluded from future terminal-history retry loops

### Back on market behavior

If a previously finalized listing becomes active/pending again, delta sync clears:
- `history_finalized`
- `is_finalized`
- `media_finalized`

so the listing re-enters the active lifecycle.

---

## 7. 2026 lane vs historical lane

There are conceptually two year lanes in the admin/dashboard:

- `current-year`
  - dedicated 2026 catch-up lane

- `default`
  - historical backlog lane

### Implementation reality

The UI now exposes both lanes separately, but the actual running helpers still matter.
Only one process should own each lane.

### Current historical order

The historical range runner was corrected to run descending:
- `2014 -> 2013 -> 2012 -> ... -> 1990`

Not ascending from 1990 anymore.

---

## 8. Photos and field freshness — likely source of missing data

If another agent is investigating “why aren’t all current photos / fields staying fresh?”, this is the important split:

### Path A — full listing sweep (`syncSparkListings`)

- Uses `fetchSparkListingsPage(... expand = Photos,FloorPlans,Videos,VirtualTours,OpenHouses,Documents)`
- Maps into RESO-style `listings` rows via `sparkListingToSupabaseRow()`
- `details` JSON gets the full Spark standard fields
- `PhotoURL` gets the first photo
- `syncListingVideosForRows()` also updates `listing_videos`

### Path B — active/pending OData refresh (`runOnePageActivePendingSync`)

- First tries OData:
  - `select = SPARK_SELECT_FIELDS`
  - `expand = Media`
- Processes each record through `processSparkListing()`

### Important divergence

`processSparkListing()` writes into a **different shape/path** than the bulk RESO-style `listings` upsert:
- it handles `listing_photos`
- `listing_agents`
- `status_history`
- `price_history`
- `expired_listings`

That means “fresh active listings” can come through a different ingestion path than the broad bulk listing sweep.

If active listings are missing media/fields, another agent should compare:
- bulk `sparkListingToSupabaseRow()` path
- OData `processSparkListing()` path

because they do **not** populate the same columns in the same way.

### One especially important field issue

In the current checked code, `sparkListingToSupabaseRow()` clearly maps:
- `ListPrice`
- `CloseDate`
- `OnMarketDate`
- `details`

but it does **not** obviously map `OriginalListPrice` / `ClosePrice` into explicit top-level columns in that function body.

Those values may be present in `details` and later backfilled by migrations, but another agent should confirm whether the top-level `listings` row is always receiving those fields directly in the active freshness path.

That is likely part of the “missing field freshness” complaint.

---

## 9. Current known operational gaps

Another agent should be aware of these:

1. **Active listing history coverage is incomplete**
   - many active/pending listings still have no `listing_history`

2. **Delta freshness and history freshness are not fully coupled**
   - delta updates listing rows
   - history refresh is separate

3. **Full sync helper wrapper (`scripts/run-full-sync.mjs`) is noisy**
   - long route responses hit wrapper timeouts
   - route itself may still be fine

4. **Historical helper overlap can hijack the default year lane**
   - if stale helper processes remain alive

5. **Terminal history cursor exists separately**
   - `sync_cursor.id = 'terminal-history'`
   - do not confuse this with `sync_cursor.id = 'default'`

---

## 10. Recommended questions for the next agent

If another agent picks this up, they should answer:

1. Why do **5046** active/pending listings still lack history?
2. Should delta sync trigger targeted history refresh for active listings immediately?
3. Are `ClosePrice`, `OriginalListPrice`, and full media payloads guaranteed to stay fresh on the active path?
4. Are the OData + `processSparkListing()` path and the bulk RESO path diverging in ways that drop data?
5. Should the active history path get its own dedicated cursor / scheduler instead of waiting behind full listings?

---

## 11. Current live status snapshot (at handoff time)

At the time of the latest checks in this branch:

- **Active/current listing sync**
  - `last_delta_sync_at = 2026-04-01T08:15:25.595Z`
  - `last_full_sync_at = 2026-04-01T23:06:22.437Z`
  - broad listing cursor still in `phase = listings`

- **Historical lane**
  - moved from 2014 completion into 2013
  - current `2013` progress reached roughly:
    - `7760 / 20164`
  - helper logs showed continued movement

- **2026**
  - completed

These numbers are time-sensitive. Another agent should re-check live DB state before acting.

