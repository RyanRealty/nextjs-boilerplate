-- Performance indexes for slow queries identified in profiling session.
-- Homepage was taking 13.8s due to full table scans on 586K listings.

-- ListOfficeName: brokerage listings slider queries ILIKE on this column (no index existed)
-- Before: 1,400ms for eq, 602ms for ilike. After: should be < 50ms.
CREATE INDEX IF NOT EXISTS idx_listings_list_office_name
  ON listings ("ListOfficeName");

-- City btree index for exact-match queries (eq, not ilike)
-- The existing functional index on LOWER(TRIM()) only helps ILIKE patterns.
-- eq queries need a plain btree index.
CREATE INDEX IF NOT EXISTS idx_listings_city
  ON listings ("City");

-- StandardStatus: plain btree for eq queries.
-- Many queries use .eq('StandardStatus', 'Active') which needs btree, not functional.
CREATE INDEX IF NOT EXISTS idx_listings_standard_status_btree
  ON listings ("StandardStatus");

-- Composite: City + StandardStatus for the most common filter combination
-- (active listings in a city). Covers homepage, search, city pages.
CREATE INDEX IF NOT EXISTS idx_listings_city_status
  ON listings ("City", "StandardStatus");

-- listing_history: listing_key for timeline queries on listing detail page
-- 2.09M rows; every listing detail page queries this table.
CREATE INDEX IF NOT EXISTS idx_listing_history_listing_key
  ON listing_history (listing_key);

-- listing_history: event_date for recent activity feed queries
CREATE INDEX IF NOT EXISTS idx_listing_history_event_date
  ON listing_history (event_date DESC);

-- listing_history: composite for the activity feed pattern (listing_key + event_date)
CREATE INDEX IF NOT EXISTS idx_listing_history_key_date
  ON listing_history (listing_key, event_date DESC);

-- ListNumber: used as fallback lookup in listing detail resolution
CREATE INDEX IF NOT EXISTS idx_listings_list_number
  ON listings ("ListNumber");

-- ModificationTimestamp: ORDER BY DESC for "most recent" queries
CREATE INDEX IF NOT EXISTS idx_listings_mod_ts_desc
  ON listings ("ModificationTimestamp" DESC NULLS LAST);
