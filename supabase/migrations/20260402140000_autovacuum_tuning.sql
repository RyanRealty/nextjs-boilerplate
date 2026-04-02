-- Autovacuum tuning for high-churn tables.
-- Default PostgreSQL autovacuum settings (threshold=50, scale_factor=0.2)
-- are too conservative for tables with high insert/update/delete rates.
-- This migration sets aggressive autovacuum parameters per table based on
-- actual write patterns observed in the codebase.

-- ============================================================================
-- TIER 1: Very high churn — insert-heavy event streams
-- These tables receive inserts on every page view or user interaction.
-- Default autovacuum would wait until 20% of the table is dead before running.
-- ============================================================================

-- listing_views: insert per listing detail page view, used for trending (24h window).
-- Rows beyond 90 days are cleaned up by cleanup_old_events().
ALTER TABLE listing_views SET (
  autovacuum_vacuum_threshold = 1000,
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_threshold = 500,
  autovacuum_analyze_scale_factor = 0.005
);

-- user_events: insert per tracked page view/interaction.
-- Rows beyond 180 days are cleaned up by cleanup_old_events().
ALTER TABLE user_events SET (
  autovacuum_vacuum_threshold = 1000,
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_threshold = 500,
  autovacuum_analyze_scale_factor = 0.005
);

-- visits: insert per consenting navigation event.
-- Rows beyond 90 days are cleaned up by cleanup_old_events().
ALTER TABLE visits SET (
  autovacuum_vacuum_threshold = 1000,
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_threshold = 500,
  autovacuum_analyze_scale_factor = 0.005
);

-- activity_events: inserts during delta sync when MLS listings change status/price.
-- Append-only event stream, no deletes in application code.
ALTER TABLE activity_events SET (
  autovacuum_vacuum_threshold = 500,
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_threshold = 500,
  autovacuum_analyze_scale_factor = 0.01
);

-- ============================================================================
-- TIER 2: High churn — upsert/replace patterns during sync
-- These tables are heavily written during MLS sync runs (every 15 minutes).
-- ============================================================================

-- listings: ~586K rows, upsert on ListNumber during every delta sync.
-- The primary data table — query planner stats must stay fresh.
ALTER TABLE listings SET (
  autovacuum_vacuum_threshold = 5000,
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_threshold = 2000,
  autovacuum_analyze_scale_factor = 0.005
);

-- listing_history: ~2M+ rows, delete-then-insert per listing during history sync.
-- Heavy write churn generates many dead tuples.
ALTER TABLE listing_history SET (
  autovacuum_vacuum_threshold = 2000,
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_threshold = 1000,
  autovacuum_analyze_scale_factor = 0.005
);

-- listing_photo_classifications: upsert per photo during classification runs.
ALTER TABLE listing_photo_classifications SET (
  autovacuum_vacuum_threshold = 500,
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_threshold = 500,
  autovacuum_analyze_scale_factor = 0.01
);

-- ============================================================================
-- TIER 3: Moderate churn — counter updates and sync state
-- These tables have frequent updates to the same rows.
-- ============================================================================

-- engagement_metrics: view_count/like_count/save_count updated per interaction.
ALTER TABLE engagement_metrics SET (
  autovacuum_vacuum_threshold = 200,
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_threshold = 200,
  autovacuum_analyze_scale_factor = 0.02
);

-- sync_cursor: single-row table updated many times per sync run.
ALTER TABLE sync_cursor SET (
  autovacuum_vacuum_threshold = 50,
  autovacuum_vacuum_scale_factor = 0.0,
  autovacuum_analyze_threshold = 50,
  autovacuum_analyze_scale_factor = 0.0
);

-- sync_state: single-row table updated after each sync run.
ALTER TABLE sync_state SET (
  autovacuum_vacuum_threshold = 50,
  autovacuum_vacuum_scale_factor = 0.0,
  autovacuum_analyze_threshold = 50,
  autovacuum_analyze_scale_factor = 0.0
);

-- notification_queue: inserts then status updates by background worker.
ALTER TABLE notification_queue SET (
  autovacuum_vacuum_threshold = 100,
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_threshold = 100,
  autovacuum_analyze_scale_factor = 0.02
);

-- ============================================================================
-- TIER 4: Moderate churn — community/market cache tables
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_engagement_metrics') THEN
    ALTER TABLE community_engagement_metrics SET (
      autovacuum_vacuum_threshold = 100,
      autovacuum_vacuum_scale_factor = 0.05,
      autovacuum_analyze_threshold = 100,
      autovacuum_analyze_scale_factor = 0.02
    );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'market_stats_cache') THEN
    ALTER TABLE market_stats_cache SET (
      autovacuum_vacuum_threshold = 100,
      autovacuum_vacuum_scale_factor = 0.05,
      autovacuum_analyze_threshold = 50,
      autovacuum_analyze_scale_factor = 0.02
    );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'market_pulse_live') THEN
    ALTER TABLE market_pulse_live SET (
      autovacuum_vacuum_threshold = 50,
      autovacuum_vacuum_scale_factor = 0.05,
      autovacuum_analyze_threshold = 50,
      autovacuum_analyze_scale_factor = 0.02
    );
  END IF;
END $$;

-- reporting_cache: periodic recomputation during cron/sync.
ALTER TABLE reporting_cache SET (
  autovacuum_vacuum_threshold = 100,
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_threshold = 50,
  autovacuum_analyze_scale_factor = 0.02
);

-- report_listings_breakdown: single-row table rewritten after every sync.
ALTER TABLE report_listings_breakdown SET (
  autovacuum_vacuum_threshold = 10,
  autovacuum_vacuum_scale_factor = 0.0,
  autovacuum_analyze_threshold = 10,
  autovacuum_analyze_scale_factor = 0.0
);

-- ============================================================================
-- TIER 5: History/status tables written during sync pipelines
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'status_history') THEN
    ALTER TABLE status_history SET (
      autovacuum_vacuum_threshold = 500,
      autovacuum_vacuum_scale_factor = 0.02,
      autovacuum_analyze_threshold = 500,
      autovacuum_analyze_scale_factor = 0.01
    );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'price_history') THEN
    ALTER TABLE price_history SET (
      autovacuum_vacuum_threshold = 500,
      autovacuum_vacuum_scale_factor = 0.02,
      autovacuum_analyze_threshold = 500,
      autovacuum_analyze_scale_factor = 0.01
    );
  END IF;
END $$;

-- listing_inquiries: inserts from contact forms, read by admin.
ALTER TABLE listing_inquiries SET (
  autovacuum_vacuum_threshold = 100,
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_threshold = 100,
  autovacuum_analyze_scale_factor = 0.05
);

-- likes: user like/unlike toggles (insert + delete).
ALTER TABLE likes SET (
  autovacuum_vacuum_threshold = 100,
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_threshold = 100,
  autovacuum_analyze_scale_factor = 0.02
);

-- saved_listings: user save/unsave toggles (insert + delete).
ALTER TABLE saved_listings SET (
  autovacuum_vacuum_threshold = 100,
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_threshold = 100,
  autovacuum_analyze_scale_factor = 0.02
);
