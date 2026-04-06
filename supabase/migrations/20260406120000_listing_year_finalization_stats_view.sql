-- Year cohort rollup for sync status reporting (by calendar year of ListDate or OnMarketDate).
-- Consumed by scripts/sync-status-report.mjs via PostgREST.

create or replace view public.listing_year_finalization_stats as
select
  extract(year from coalesce(l."ListDate", l."OnMarketDate"))::integer as list_year,
  count(*)::bigint as total_listings,
  count(*) filter (where l.history_finalized is true)::bigint as finalized_listings,
  count(*) filter (where l.history_verified_full is true)::bigint as verified_full_listings
from public.listings l
where coalesce(l."ListDate", l."OnMarketDate") is not null
group by 1;

comment on view public.listing_year_finalization_stats is
  'Per list-year cohort counts for history_finalized and history_verified_full (sync status report).';

grant select on public.listing_year_finalization_stats to service_role;
