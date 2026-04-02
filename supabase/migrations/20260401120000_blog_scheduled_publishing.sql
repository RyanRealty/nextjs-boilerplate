-- Blog scheduled publishing: add scheduling column and settings table.
-- Enables automatic daily blog post publishing via cron.

-- 1. Add scheduled_at column to blog_posts for future-dated publishing
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

-- 2. Index for efficient cron query: find scheduled posts ready to publish
CREATE INDEX IF NOT EXISTS idx_blog_posts_scheduled
  ON blog_posts (scheduled_at)
  WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

-- 3. Blog automation settings (single-row config table)
CREATE TABLE IF NOT EXISTS blog_settings (
  id text PRIMARY KEY DEFAULT 'default',
  auto_publish_enabled boolean NOT NULL DEFAULT false,
  max_posts_per_day integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE blog_settings IS 'Single-row config for automated blog publishing. Toggle auto_publish_enabled on/off from admin.';

-- Seed default row
INSERT INTO blog_settings (id, auto_publish_enabled, max_posts_per_day)
VALUES ('default', false, 1)
ON CONFLICT (id) DO NOTHING;

-- RLS for blog_settings
ALTER TABLE blog_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages blog_settings" ON blog_settings;
CREATE POLICY "Service role manages blog_settings"
  ON blog_settings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated read blog_settings" ON blog_settings;
CREATE POLICY "Authenticated read blog_settings"
  ON blog_settings FOR SELECT TO authenticated
  USING (true);
