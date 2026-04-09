-- Exact listing_history row count for scripts/sync-status-report.mjs.
-- PostgREST select+count=exact over ~4M rows often hits timeouts; COUNT(*) inside Postgres with a raised statement_timeout is stable.

CREATE OR REPLACE FUNCTION public.report_listing_history_row_count()
RETURNS bigint
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n bigint;
BEGIN
  SET LOCAL statement_timeout = '300s';
  SELECT count(*)::bigint INTO n FROM public.listing_history;
  RETURN n;
END;
$$;

COMMENT ON FUNCTION public.report_listing_history_row_count() IS
  'Exact listing_history row count for ops scripts (sync status report). Service role only.';

ALTER FUNCTION public.report_listing_history_row_count() SET statement_timeout = '300s';

REVOKE ALL ON FUNCTION public.report_listing_history_row_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_listing_history_row_count() TO service_role;
