# Full sync: listings, history, photos, videos

## Always-on sync (production)

Sync is designed to run **in the background** with no manual babysitting:

- **Delta sync** — `GET /api/cron/sync-delta` runs the shared delta pipeline and writes a row to `sync_checkpoints` on every success or failure. This keeps active and pending listings current and emits activity events for new listings, price drops, pending transitions, closed transitions, expired/off-market transitions, and back-on-market listings.
- **Full sync** — `GET /api/cron/sync-full` advances the chunked full sync cursor. Each invocation runs up to `SYNC_MAX_CHUNKS_PER_REQUEST` chunks. Each chunk does 5 listing pages **or** 30 history listings by default. Newer listing pages are processed first; then history is backfilled for non-finalized listings.
- **Year sync** — `GET /api/cron/sync-year-by-year` advances the historical year-by-year backfill matrix one chunk at a time.
- **Terminal history sync** — `GET /api/cron/sync-history-terminal` advances closed, expired, withdrawn, and canceled listing finalization in the configured terminal year scope.

**Admin → Sync** is the **status page**: Spark API vs database, last sync times, by-city breakdown, delta run log, terminal-history completion, and yearly backfill progress. Manual controls are for one-off catch-up or troubleshooting; normal production behavior should come from scheduled background runs.

**Cron is on by default.** The `sync_cursor` row has `cron_enabled = true` (see migration `20260415120000_sync_cron_always_on.sql`). To disable background full sync, set `cron_enabled` to `false` in the database or via the Advanced section.

## Recommended production scheduler

The repository now includes a GitHub Actions workflow at `.github/workflows/sync-scheduler.yml` that calls the protected sync endpoints on a reliable cadence:

- `/api/cron/sync-delta` every 10 minutes
- `/api/cron/sync-full` every 15 minutes
- `/api/cron/sync-year-by-year` every 20 minutes
- `/api/cron/sync-history-terminal?limit=40` every 20 minutes

Required repository configuration:

- **Repository variable:** `SITE_URL` = your production site base URL, e.g. `https://ryan-realty.com`
- **Repository secret:** `CRON_SECRET` = the same secret your app expects for cron route authorization

This workflow is the recommended always-on scheduler when Vercel cron cadence is too sparse or does not match the required sync frequency.

## What gets synced

1. **Listings** – Fetched from Spark with `expand=Photos,FloorPlans,Videos,VirtualTours,OpenHouses,Documents`. Each listing is upserted into `listings` with:
   - Core fields (ListPrice, City, StandardStatus, ListDate, CloseDate, etc.)
   - `PhotoURL` = first/primary photo URL
   - `details` (JSONB) = full Spark StandardFields, including **Photos**, **Videos**, FloorPlans, VirtualTours, etc.

2. **History** – For each listing we call Spark’s history (or price history) API and store rows in `listing_history` (event_date, event, price, price_change, raw). Closed listings are marked `history_finalized` after a successful fetch so future syncs skip them.

3. **Photos/videos** – Not in separate tables. They live inside `listings.details` (e.g. `details.Photos`, `details.Videos`). Admin counts use `get_listing_media_counts()` (listings with PhotoURL, listings with `details.Videos` array length > 0).

## How to run sync (override / local)

### Option A: Admin UI (Advanced)

Open **Admin → Sync**, expand **Advanced / override**, and use **Full sync (Smart Sync)**, **Refresh active & pending**, **Trigger delta sync**, or **Sync history** as needed. Use only for troubleshooting or one-off backfills; background sync handles normal updates.

### Option B: Script (local hands-off)

1. **Env** – In `.env.local` set:
   - `CRON_SECRET` (any string, e.g. `local-sync-secret`)
   - `SPARK_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (already required for sync).

2. **Terminal 1** – Start the app:
   ```bash
   npm run dev
   ```

3. **Terminal 2** – Run the sync loop (calls `/api/cron/sync-full` until both phases are done):
   ```bash
   npm run sync:full
   ```
   Uses `?pages=20&history_limit=100` so each request does more work. Run until you see “Full sync complete.”

### Option C: Protected cron endpoints (production – automatic)

Use a scheduler to invoke the protected sync endpoints with `Authorization: Bearer <CRON_SECRET>`. The recommended scheduler is the GitHub Actions workflow in `.github/workflows/sync-scheduler.yml`. If you prefer a different scheduler, call these endpoints directly:

- `GET /api/cron/sync-delta`
- `GET /api/cron/sync-full`
- `GET /api/cron/sync-year-by-year`
- `GET /api/cron/sync-history-terminal?limit=40`

## Spark: Listing History vs Historical Listings

Flexmls/Spark expose two different concepts:

| Concept | Purpose | Endpoint (example) | Docs |
|--------|---------|--------------------|------|
| **Listing History** | Status/event changes on a *specific* listing: status changes, who made them, price change data. | `GET /v1/listings/{id}/history` | [Listings: History](https://sparkplatform.com/docs/api_services/listings/history) |
| **Historical Listings** | Listings that have since gone *off market* — full listing objects for prior MLS records for the same property. | `GET /v1/listings/{id}/historical` (and `/historical/pricehistory` for a price timeline) | [Listings: Historical](https://sparkplatform.com/docs/api_services/listings/historical) |

We use **Listing History** to power the “Price & status history” section on the listing page (and to backfill `listing_history`). We try `/history` first, then `/historical/pricehistory` if the first returns no events. **Historical Listings** (`/historical`) is available via `fetchSparkHistoricalListings` for “previously listed at $X” or full prior listing details.

## Listing history and API key role

**To get any listing history data, your Spark API key must have the Private role.** The [Spark Listings: History](https://sparkplatform.com/docs/api_services/listings/history) docs state:

- **Private** — Only private roles see full listing history.
- **IDX, VOW, Portal, Public** — See a condensed set and **may be completely restricted from access by the MLS**.

If you run a full sync and `listing_history` stays empty, Spark is returning 0 events for every listing; the app only stores what Spark returns. Run `npm run test:history` (or **Admin → Sync → Test listing history API**) to confirm; both show HTTP status and item counts for a few listings. To get history, contact your MLS or Spark to obtain an API key with **Private** role, then re-run the history phase (or reset `history_finalized` and run full sync again).

## What can block or limit sync

| Issue | What to do |
|-------|------------|
| **CRON_SECRET not set** | Add `CRON_SECRET=any-value` to `.env.local` for the script or cron. |
| **Supabase “statement timeout”** | Listing upserts use chunk size 12 and retry in sub-chunks of 5 on timeout. If timeouts persist, reduce load (e.g. fewer `?pages=` per request). |
| **No history from Spark** | Your key must be **Private** role; IDX/VOW/Portal are often restricted to 0 history. See [Listing history and API key role](#listing-history-and-api-key-role) above and [Spark Listings: History](https://sparkplatform.com/docs/api_services/listings/history). Use Admin → Sync → “Test listing history API” to confirm. |
| **Missing photos/videos** | They come from the same listing request (expand). If Spark doesn’t return Photos/Videos for some listings, those rows will have empty arrays in `details`. |

## Finalization rules

- **Active / pending listings** stay syncable and continue receiving delta updates.
- **Closed / expired / withdrawn / canceled listings** are finalized only after the history pipeline has completed for that listing (`history_finalized = true`, `is_finalized = true`).
- **Back on market** listings are automatically unfrozen by delta sync. If a previously finalized terminal listing returns to an active or pending status, delta sync clears `history_finalized`, `is_finalized`, and `media_finalized` so the listing can re-enter the normal lifecycle.

## After sync

- **Refresh report cache:** The full-sync route refreshes `refresh_market_pulse`, `refresh_current_period_stats`, and `refreshListingsBreakdown()` when the history phase completes.
- **Delta observability:** Every delta run writes to `sync_checkpoints`, and `sync_state.last_delta_sync_at` is updated only after the shared delta pipeline completes successfully.
- **Counts:** Admin Sync page shows total listings, history rows, and (via `get_listing_media_counts()`) listings with photos and with videos.
