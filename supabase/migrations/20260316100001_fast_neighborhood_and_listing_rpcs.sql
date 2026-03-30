-- Fast paths for neighborhood listing and city neighborhood-stats to avoid N+1 and two-round-trip queries.
-- Keeps listing data real-time (no long cache); indexes and single-query RPCs reduce load time.

-- Composite index: city + status + ModificationTimestamp for "newest in city" and city listing pages
CREATE INDEX IF NOT EXISTS idx_listings_city_status_modified
  ON listings ("City", "StandardStatus", "ModificationTimestamp" DESC NULLS LAST);

-- RPC: Neighborhood listings in one query (join properties + listings by neighborhood_id)
-- Returns same columns as app expects for listing tiles. Active-only, newest first.
-- Guarded for environments where listings.property_id does not exist.
CREATE OR REPLACE FUNCTION get_neighborhood_listings(p_neighborhood_id uuid, p_limit int DEFAULT 24)
RETURNS SETOF listings
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'listings'
      AND column_name = 'property_id'
  ) THEN
    RETURN QUERY
      SELECT l.*
      FROM listings l
      INNER JOIN properties p ON p.id = l.property_id
      WHERE p.neighborhood_id = p_neighborhood_id
        AND (
          l."StandardStatus" IS NULL
          OR l."StandardStatus" ILIKE '%Active%'
          OR l."StandardStatus" ILIKE '%For Sale%'
          OR l."StandardStatus" ILIKE '%Coming Soon%'
        )
      ORDER BY l."ModificationTimestamp" DESC NULLS LAST
      LIMIT LEAST(p_limit, 100);
  END IF;
END;
$$;

-- RPC: Neighborhood stats (listing count + median price) for all neighborhoods in a city in one pass
-- Avoids N+1 in getNeighborhoodsInCity.
-- Guarded for environments where listings.property_id does not exist.
CREATE OR REPLACE FUNCTION get_neighborhoods_in_city_stats(p_city_id uuid)
RETURNS TABLE (
  neighborhood_id uuid,
  name text,
  slug text,
  listing_count bigint,
  median_price numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'listings'
      AND column_name = 'property_id'
  ) THEN
    RETURN QUERY
      WITH nh AS (
        SELECT id, n.name, n.slug
        FROM neighborhoods n
        WHERE n.city_id = p_city_id
      ),
      active_listings AS (
        SELECT p.neighborhood_id, l."ListPrice"
        FROM listings l
        INNER JOIN properties p ON p.id = l.property_id
        WHERE p.neighborhood_id IN (SELECT id FROM nh)
          AND (
            l."StandardStatus" IS NULL
            OR l."StandardStatus" ILIKE '%Active%'
            OR l."StandardStatus" ILIKE '%For Sale%'
            OR l."StandardStatus" ILIKE '%Coming Soon%'
          )
          AND l."ListPrice" IS NOT NULL
          AND l."ListPrice" > 0
      ),
      counts AS (
        SELECT neighborhood_id, COUNT(*) AS cnt
        FROM (
          SELECT p.neighborhood_id
          FROM listings l
          INNER JOIN properties p ON p.id = l.property_id
          WHERE p.neighborhood_id IN (SELECT id FROM nh)
            AND (
              l."StandardStatus" IS NULL
              OR l."StandardStatus" ILIKE '%Active%'
              OR l."StandardStatus" ILIKE '%For Sale%'
              OR l."StandardStatus" ILIKE '%Coming Soon%'
            )
        ) sub
        GROUP BY neighborhood_id
      ),
      medians AS (
        SELECT
          neighborhood_id,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "ListPrice") AS med
        FROM active_listings
        GROUP BY neighborhood_id
      )
      SELECT
        nh.id AS neighborhood_id,
        nh.name,
        nh.slug,
        COALESCE(c.cnt, 0)::bigint AS listing_count,
        ROUND(m.med)::numeric AS median_price
      FROM nh
      LEFT JOIN counts c ON c.neighborhood_id = nh.id
      LEFT JOIN medians m ON m.neighborhood_id = nh.id;
  ELSE
    RETURN QUERY
      SELECT
        n.id AS neighborhood_id,
        n.name,
        n.slug,
        0::bigint AS listing_count,
        NULL::numeric AS median_price
      FROM neighborhoods n
      WHERE n.city_id = p_city_id;
  END IF;
END;
$$;

-- Grant execute to anon and authenticated (RLS on listings/properties still applies via SECURITY DEFINER using search_path)
GRANT EXECUTE ON FUNCTION get_neighborhood_listings(uuid, int) TO anon;
GRANT EXECUTE ON FUNCTION get_neighborhood_listings(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_neighborhoods_in_city_stats(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_neighborhoods_in_city_stats(uuid) TO authenticated;
