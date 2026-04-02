-- Drop redundant indexes that waste write throughput and disk space.
-- Each drop is justified by a covering index or constraint that already exists.
-- All drops are guarded with IF EXISTS for idempotency.

-- ============================================================================
-- LISTINGS TABLE
-- ============================================================================

-- idx_listings_standard_status_btree duplicates idx_listings_standard_status
-- (same column "StandardStatus", same btree type, different names).
-- Keep: idx_listings_standard_status (created first, widely referenced).
DROP INDEX IF EXISTS idx_listings_standard_status_btree;

-- idx_listings_modification_ts duplicates idx_listings_modification_timestamp
-- and idx_listings_mod_ts_desc (same column, three indexes).
-- idx_listings_modification_timestamp: ("ModificationTimestamp" DESC NULLS LAST)
-- idx_listings_mod_ts_desc: ("ModificationTimestamp" DESC NULLS LAST)
-- idx_listings_modification_ts: ("ModificationTimestamp") — ASC, no NULLS clause.
-- btree scans work in both directions, so one DESC index handles ASC queries too.
-- Keep: idx_listings_mod_ts_desc (most descriptive name).
-- Drop: idx_listings_modification_ts (redundant ASC on same column).
-- Note: idx_listings_modification_timestamp and idx_listings_mod_ts_desc are
-- identical definitions; IF NOT EXISTS means only one physical index was created
-- under whichever name ran first. We drop the other name safely.
DROP INDEX IF EXISTS idx_listings_modification_ts;
DROP INDEX IF EXISTS idx_listings_modification_timestamp;

-- idx_listings_city_close is covered by idx_listings_city_closedate
-- (same leading columns City + CloseDate, newer adds DESC NULLS LAST).
-- Both have WHERE "CloseDate" IS NOT NULL partial predicate.
DROP INDEX IF EXISTS idx_listings_city_close;

-- idx_listings_close_price is nearly identical to idx_listings_close_price_btree
-- (same column, both partial; the newer is stricter with > 0).
-- CMA queries always filter ClosePrice > 0, so the stricter index covers them.
-- Keep: idx_listings_close_price_btree.
DROP INDEX IF EXISTS idx_listings_close_price;

-- ============================================================================
-- LISTING_HISTORY
-- ============================================================================

-- idx_listing_history_event_listing and idx_listing_history_key_date are
-- identical: both (listing_key, event_date DESC).
-- Keep: idx_listing_history_key_date (more descriptive name).
DROP INDEX IF EXISTS idx_listing_history_event_listing;

-- idx_listing_history_listing_key is a prefix of idx_listing_history_key_date
-- (listing_key, event_date DESC). PostgreSQL uses the composite for
-- listing_key-only lookups efficiently.
DROP INDEX IF EXISTS idx_listing_history_listing_key;

-- ============================================================================
-- SAVED_LISTINGS
-- ============================================================================

-- idx_saved_listings_user and idx_saved_listings_user_id are both on (user_id).
-- Two separate physical indexes on the same column.
-- Keep: idx_saved_listings_user_id (clearer naming convention).
DROP INDEX IF EXISTS idx_saved_listings_user;

-- ============================================================================
-- OPEN_HOUSES
-- ============================================================================

-- idx_open_houses_date and idx_open_houses_event_date are both on (event_date).
-- Two separate physical indexes on the same column.
-- Keep: idx_open_houses_event_date (consistent with comprehensive migration naming).
DROP INDEX IF EXISTS idx_open_houses_date;

-- idx_open_houses_listing_key is a prefix of idx_open_houses_listing_date
-- (listing_key, event_date ASC). The composite covers listing_key-only lookups.
DROP INDEX IF EXISTS idx_open_houses_listing_key;

-- ============================================================================
-- BROKER_STATS
-- ============================================================================

-- idx_broker_stats_broker (broker_id) is a prefix of idx_broker_stats_lookup
-- (broker_id, period_type, period_start DESC).
DROP INDEX IF EXISTS idx_broker_stats_broker;

-- ============================================================================
-- BLOG_POSTS
-- ============================================================================

-- idx_blog_posts_slug duplicates the UNIQUE constraint on slug column.
-- The unique constraint already creates an implicit btree index.
DROP INDEX IF EXISTS idx_blog_posts_slug;

-- idx_blog_posts_status (WHERE status = 'published') is weaker than
-- idx_blog_posts_published_at (published_at DESC WHERE status = 'published').
-- The published_at index covers both "find published posts" and "order by date".
DROP INDEX IF EXISTS idx_blog_posts_status;

-- ============================================================================
-- ENGAGEMENT_METRICS
-- ============================================================================

-- idx_engagement_metrics_listing_key duplicates the UNIQUE constraint on listing_key.
DROP INDEX IF EXISTS idx_engagement_metrics_listing_key;

-- ============================================================================
-- EXPIRED_LISTINGS
-- ============================================================================

-- idx_expired_listings_listing_key duplicates the UNIQUE constraint on listing_key.
DROP INDEX IF EXISTS idx_expired_listings_listing_key;

-- ============================================================================
-- BANNER_IMAGES
-- ============================================================================

-- idx_banner_images_entity on (entity_type, entity_key) duplicates the
-- UNIQUE constraint on (entity_type, entity_key).
DROP INDEX IF EXISTS idx_banner_images_entity;

-- ============================================================================
-- PLACE_ATTRACTIONS
-- ============================================================================

-- idx_place_attractions_entity and idx_place_attractions_entity_key are
-- both on (entity_key) — two physical indexes on the same column.
-- Keep: idx_place_attractions_entity_key (consistent naming).
DROP INDEX IF EXISTS idx_place_attractions_entity;

-- ============================================================================
-- USER_ACTIVITIES
-- ============================================================================

-- idx_user_activities_entity on (entity_type, entity_id) is a prefix of
-- idx_user_activities_recent on (entity_type, entity_id, created_at).
DROP INDEX IF EXISTS idx_user_activities_entity;

-- ============================================================================
-- STATUS_HISTORY / PRICE_HISTORY
-- ============================================================================

-- idx_status_history_listing_key is a prefix of idx_status_history_listing_date
-- (listing_key, changed_at DESC).
DROP INDEX IF EXISTS idx_status_history_listing_key;

-- idx_price_history_listing_key is a prefix of idx_price_history_listing_key_changed
-- (listing_key, changed_at) and idx_price_history_listing_date (listing_key, changed_at DESC).
-- Both composites cover listing_key-only lookups.
DROP INDEX IF EXISTS idx_price_history_listing_key;

-- ============================================================================
-- Also remove the now-redundant idx_expired_listings_listing_key from the
-- comprehensive migration. Since it used IF NOT EXISTS and the UNIQUE
-- constraint exists, it was a no-op anyway. No action needed here — the
-- DROP above handles it if it was somehow created.
-- ============================================================================
