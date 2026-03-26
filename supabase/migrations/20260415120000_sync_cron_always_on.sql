-- Background sync: cron runs every 10 min. Default cron_enabled to true so sync runs without manual toggle.
ALTER TABLE sync_cursor
  ALTER COLUMN cron_enabled SET DEFAULT true;

UPDATE sync_cursor
SET cron_enabled = true
WHERE id = 'default' AND (cron_enabled IS NULL OR cron_enabled = false);

COMMENT ON COLUMN sync_cursor.cron_enabled IS 'When false, cron endpoint skips running. Default true so background sync runs every 10 min.';
