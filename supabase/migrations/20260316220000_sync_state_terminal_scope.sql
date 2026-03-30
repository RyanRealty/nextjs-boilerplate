-- Persisted global scope for terminal history backfill.
-- Null values mean "no explicit year range" (fallback to lookback env/default).

ALTER TABLE sync_state
  ADD COLUMN IF NOT EXISTS terminal_from_year integer,
  ADD COLUMN IF NOT EXISTS terminal_to_year integer;

COMMENT ON COLUMN sync_state.terminal_from_year IS 'Global terminal history backfill start year (inclusive). Null uses lookback mode.';
COMMENT ON COLUMN sync_state.terminal_to_year IS 'Global terminal history backfill end year (inclusive). Null uses lookback mode.';
