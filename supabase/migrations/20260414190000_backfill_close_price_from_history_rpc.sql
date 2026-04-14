-- Batch backfill listings.ClosePrice from listing_history (FieldChange ClosePrice or MlsStatus→Closed).
-- Callable from scripts/backfill-close-price-from-history.mjs via service role.
-- OriginalListPrice: one-shot UPDATE from details JSONB (batched via limit for progress).

CREATE OR REPLACE FUNCTION public.apply_close_price_from_history_batch(p_limit integer DEFAULT 2000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  IF p_limit IS NULL OR p_limit < 1 THEN
    p_limit := 2000;
  END IF;
  IF p_limit > 10000 THEN
    p_limit := 10000;
  END IF;

  WITH candidates AS (
    SELECT l."ListingKey"
    FROM public.listings l
    WHERE l."StandardStatus" ILIKE '%Closed%'
      AND l."ClosePrice" IS NULL
    ORDER BY l."ListingKey"
    LIMIT p_limit
  ),
  ranked AS (
    SELECT
      c."ListingKey",
      lh.price,
      lh.event_date,
      CASE
        WHEN lh.description ILIKE 'ClosePrice%' THEN 0
        WHEN lh.description ILIKE 'MlsStatus%'
          AND lh.description ILIKE '%Closed%' THEN 1
        ELSE 2
      END AS prio
    FROM candidates c
    INNER JOIN public.listing_history lh ON lh.listing_key = c."ListingKey"
    WHERE lh.price IS NOT NULL
      AND lh.price > 0
      AND lh.event = 'FieldChange'
      AND (
        lh.description ILIKE 'ClosePrice%'
        OR (
          lh.description ILIKE 'MlsStatus%'
          AND lh.description ILIKE '%Closed%'
        )
      )
  ),
  best AS (
    SELECT DISTINCT ON ("ListingKey")
      "ListingKey",
      price
    FROM ranked
    WHERE prio <= 1
    ORDER BY "ListingKey", prio ASC, event_date DESC NULLS LAST
  )
  UPDATE public.listings l
  SET "ClosePrice" = b.price
  FROM best b
  WHERE l."ListingKey" = b."ListingKey";

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN jsonb_build_object('updated', updated_count);
END;
$$;

COMMENT ON FUNCTION public.apply_close_price_from_history_batch(integer) IS
  'Sets listings.ClosePrice from listing_history for closed rows missing ClosePrice; service role only.';

ALTER FUNCTION public.apply_close_price_from_history_batch(integer) SET statement_timeout = '120s';

REVOKE ALL ON FUNCTION public.apply_close_price_from_history_batch(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_close_price_from_history_batch(integer) TO service_role;

-- Batched OriginalListPrice from details JSON (numeric string only).
CREATE OR REPLACE FUNCTION public.apply_original_list_price_from_details_batch(p_limit integer DEFAULT 5000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  IF p_limit IS NULL OR p_limit < 1 THEN
    p_limit := 5000;
  END IF;
  IF p_limit > 50000 THEN
    p_limit := 50000;
  END IF;

  WITH picked AS (
    SELECT l."ListingKey"
    FROM public.listings l
    WHERE l."OriginalListPrice" IS NULL
      AND l.details ? 'OriginalListPrice'
      AND (l.details->>'OriginalListPrice') ~ '^[0-9]+(\.[0-9]+)?$'
    ORDER BY l."ListingKey"
    LIMIT p_limit
  )
  UPDATE public.listings l
  SET "OriginalListPrice" = (l.details->>'OriginalListPrice')::numeric
  FROM picked p
  WHERE l."ListingKey" = p."ListingKey";

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN jsonb_build_object('updated', updated_count);
END;
$$;

COMMENT ON FUNCTION public.apply_original_list_price_from_details_batch(integer) IS
  'Sets listings.OriginalListPrice from details JSONB where missing; service role only.';

ALTER FUNCTION public.apply_original_list_price_from_details_batch(integer) SET statement_timeout = '120s';

REVOKE ALL ON FUNCTION public.apply_original_list_price_from_details_batch(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_original_list_price_from_details_batch(integer) TO service_role;
