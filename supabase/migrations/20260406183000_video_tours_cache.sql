-- Precomputed rows for home Popular Tours and /videos hub (cron-refreshed). Reads are O(1) for the site.

CREATE TABLE IF NOT EXISTS video_tours_cache (
  scope text PRIMARY KEY,
  listings jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO video_tours_cache (scope, listings) VALUES
  ('central_oregon_home', '[]'::jsonb),
  ('central_oregon_hub', '[]'::jsonb)
ON CONFLICT (scope) DO NOTHING;

ALTER TABLE video_tours_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_tours_cache_select_public"
  ON video_tours_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON TABLE video_tours_cache IS 'Precomputed video tour tile payloads; refresh via /api/cron/refresh-video-tours-cache.';
