-- Phase 1 follow-up: chunk backfill to one month per invocation

create or replace function public.backfill_all_historical_stats(p_months_back integer default 24)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_i integer := 0;
  v_start date;
  v_end date;
  v_city text;
  v_runs integer := 0;
  v_errors integer := 0;
  v_chunk_months integer := greatest(1, least(p_months_back, 1));
begin
  while v_i < v_chunk_months loop
    v_start := date_trunc('month', now() - make_interval(months => v_i))::date;
    v_end := (date_trunc('month', now() - make_interval(months => v_i)) + interval '1 month' - interval '1 day')::date;

    begin
      perform public.compute_and_cache_period_stats('region', 'central-oregon', 'monthly', v_start, v_end);
      v_runs := v_runs + 1;
    exception when others then
      v_errors := v_errors + 1;
    end;

    for v_city in
      select lower("City") as city_slug
      from public.listings
      where "City" is not null and trim("City") <> ''
      group by 1
      order by count(*) desc
      limit 10
    loop
      begin
        perform public.compute_and_cache_period_stats('city', v_city, 'monthly', v_start, v_end);
        v_runs := v_runs + 1;
      exception when others then
        v_errors := v_errors + 1;
        continue;
      end;
    end loop;

    v_i := v_i + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'runs', v_runs,
    'errors', v_errors,
    'requestedMonthsBack', p_months_back,
    'processedMonthsThisRun', v_chunk_months
  );
end;
$$;
