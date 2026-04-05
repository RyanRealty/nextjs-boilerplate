-- Data Architecture Phases 8-9: historical monthly + yearly cache refresh.

create or replace function public.refresh_historical_yearly_stats(p_years_back integer default 5)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_year_offset integer := 0;
  v_year_start date;
  v_year_end date;
  v_city_slug text;
  v_city_sub_slug text;
  v_runs integer := 0;
begin
  while v_year_offset < greatest(1, p_years_back) loop
    v_year_start := make_date(extract(year from current_date)::int - v_year_offset, 1, 1);
    v_year_end := make_date(extract(year from current_date)::int - v_year_offset, 12, 31);

    perform public.compute_and_cache_period_stats('region', 'central-oregon', 'yearly', v_year_start, v_year_end);
    v_runs := v_runs + 1;

    for v_city_slug in
      select distinct public.slugify_text("City")
      from public.listings
      where "City" is not null and trim("City") <> ''
    loop
      if coalesce(v_city_slug, '') = '' then
        continue;
      end if;
      perform public.compute_and_cache_period_stats('city', v_city_slug, 'yearly', v_year_start, v_year_end);
      v_runs := v_runs + 1;
    end loop;

    for v_city_sub_slug in
      select distinct public.slugify_text("City") || ':' || public.slugify_text("SubdivisionName")
      from public.listings
      where "City" is not null
        and trim("City") <> ''
        and "SubdivisionName" is not null
        and trim("SubdivisionName") <> ''
    loop
      if coalesce(v_city_sub_slug, '') = '' then
        continue;
      end if;
      perform public.compute_and_cache_period_stats('subdivision', v_city_sub_slug, 'yearly', v_year_start, v_year_end);
      v_runs := v_runs + 1;
    end loop;

    v_year_offset := v_year_offset + 1;
  end loop;

  return jsonb_build_object('ok', true, 'runs', v_runs, 'yearsBack', p_years_back);
end;
$$;

create or replace function public.backfill_all_historical_stats(p_months_back integer default 24)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_i integer := 0;
  v_start date;
  v_end date;
  v_city_slug text;
  v_city_sub_slug text;
  v_runs integer := 0;
  v_errors integer := 0;
begin
  while v_i < greatest(1, p_months_back) loop
    v_start := date_trunc('month', now() - make_interval(months => v_i))::date;
    v_end := (date_trunc('month', now() - make_interval(months => v_i)) + interval '1 month' - interval '1 day')::date;

    begin
      perform public.compute_and_cache_period_stats('region', 'central-oregon', 'monthly', v_start, v_end);
      v_runs := v_runs + 1;
    exception when others then
      v_errors := v_errors + 1;
    end;

    for v_city_slug in
      select distinct public.slugify_text("City")
      from public.listings
      where "City" is not null and trim("City") <> ''
    loop
      begin
        if coalesce(v_city_slug, '') = '' then
          continue;
        end if;
        perform public.compute_and_cache_period_stats('city', v_city_slug, 'monthly', v_start, v_end);
        v_runs := v_runs + 1;
      exception when others then
        v_errors := v_errors + 1;
      end;
    end loop;

    for v_city_sub_slug in
      select distinct public.slugify_text("City") || ':' || public.slugify_text("SubdivisionName")
      from public.listings
      where "City" is not null
        and trim("City") <> ''
        and "SubdivisionName" is not null
        and trim("SubdivisionName") <> ''
    loop
      begin
        if coalesce(v_city_sub_slug, '') = '' then
          continue;
        end if;
        perform public.compute_and_cache_period_stats('subdivision', v_city_sub_slug, 'monthly', v_start, v_end);
        v_runs := v_runs + 1;
      exception when others then
        v_errors := v_errors + 1;
      end;
    end loop;

    v_i := v_i + 1;
  end loop;

  perform public.refresh_historical_yearly_stats(greatest(2, ceil(p_months_back / 12.0)::int));

  return jsonb_build_object(
    'ok', true,
    'runs', v_runs,
    'errors', v_errors,
    'requestedMonthsBack', p_months_back
  );
end;
$$;
