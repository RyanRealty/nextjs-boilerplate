-- Ensure broker external/profile fields exist for admin management.
-- Safe for existing databases where some columns may already exist.

ALTER TABLE brokers
  ADD COLUMN IF NOT EXISTS mls_id text,
  ADD COLUMN IF NOT EXISTS social_x text,
  ADD COLUMN IF NOT EXISTS zillow_id text,
  ADD COLUMN IF NOT EXISTS realtor_id text,
  ADD COLUMN IF NOT EXISTS yelp_id text,
  ADD COLUMN IF NOT EXISTS google_business_id text;

COMMENT ON COLUMN brokers.mls_id IS 'MLS ID for broker profile.';
COMMENT ON COLUMN brokers.social_x IS 'X (Twitter) profile URL.';
COMMENT ON COLUMN brokers.zillow_id IS 'Zillow agent ID or profile reference.';
COMMENT ON COLUMN brokers.realtor_id IS 'Realtor.com profile ID.';
COMMENT ON COLUMN brokers.yelp_id IS 'Yelp business/profile ID.';
COMMENT ON COLUMN brokers.google_business_id IS 'Google Business Profile ID.';
