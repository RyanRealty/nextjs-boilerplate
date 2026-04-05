-- Data Architecture Phase 2: correct stats computation and pulse aggregation.

create or replace function public.slugify_text(p_input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(regexp_replace(lower(coalesce(p_input, '')), '[^a-z0-9]+', '-', 'g'), '-+', '-', 'g'));
$$;

create or replace function public.compute_and_cache_period_stats(
  p_geo_type text,
  p_geo_slug text,
  p_period_type text,
  p_period_start date,
  p_period_end date default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_period_end date := coalesce(p_period_end, (p_period_start + interval '1 month' - interval '1 day')::date);
  v_geo_label text := p_geo_slug;
  v_city_slug text;
  v_sub_slug text;
  v_city_label text;
  v_sold_count integer := 0;
  v_median_sale_price numeric;
  v_avg_sale_price numeric;
  v_total_volume numeric;
  v_median_dom numeric;
  v_speed_p25 numeric;
  v_speed_p50 numeric;
  v_speed_p75 numeric;
  v_median_ppsf numeric;
  v_avg_sale_to_list_ratio numeric;
  v_price_band_counts jsonb := '{}'::jsonb;
  v_bedroom_breakdown jsonb := '{}'::jsonb;
  v_property_type_breakdown jsonb := '{}'::jsonb;
  v_market_health_score numeric := 0;
  v_market_health_label text := 'Cold';
begin
  if p_geo_type = 'region' then
    v_geo_label := 'Central Oregon';
  elsif p_geo_type = 'city' then
    v_geo_label := p_geo_slug;
  elsif p_geo_type = 'subdivision' then
    v_city_slug := split_part(coalesce(p_geo_slug, ''), ':', 1);
    v_sub_slug := split_part(coalesce(p_geo_slug, ''), ':', 2);
    if coalesce(v_city_slug, '') = '' or coalesce(v_sub_slug, '') = '' then
      raise exception 'Invalid subdivision geo_slug format (expected city:community): %', p_geo_slug;
    end if;
    select min("City")
    into v_city_label
    from public.listings
    where public.slugify_text("City") = v_city_slug;
    v_geo_label := coalesce(v_city_label || ': ' || replace(v_sub_slug, '-', ' '), p_geo_slug);
  else
    raise exception 'Invalid geo_type: %', p_geo_type;
  end if;

  with closed_sales as (
    select
      coalesce("ClosePrice", ("details"->>'ClosePrice')::numeric, "ListPrice") as close_price,
      "ListPrice" as list_price,
      greatest(
        0,
        coalesce(("CloseDate" - coalesce("OnMarketDate", "ListDate"))::int, 0)
      )::numeric as dom,
      nullif("TotalLivingAreaSqFt", 0)::numeric as living_area,
      "BedroomsTotal" as beds_total,
      "PropertyType" as property_type
    from public.listings l
    where coalesce("StandardStatus", '') ilike '%Closed%'
      and "CloseDate" is not null
      and "CloseDate" >= p_period_start
      and "CloseDate" <= v_period_end
      and coalesce("ClosePrice", ("details"->>'ClosePrice')::numeric, "ListPrice") is not null
      and (
        p_geo_type = 'region'
        or (
          p_geo_type = 'city'
          and public.slugify_text(l."City") = p_geo_slug
        )
        or (
          p_geo_type = 'subdivision'
          and public.slugify_text(l."City") = v_city_slug
          and public.slugify_text(l."SubdivisionName") = v_sub_slug
        )
      )
  ),
  base as (
    select
      count(*)::int as sold_count,
      percentile_cont(0.5) within group (order by close_price) as median_sale_price,
      avg(close_price) as avg_sale_price,
      sum(close_price) as total_volume,
      percentile_cont(0.5) within group (order by dom) as median_dom,
      percentile_cont(0.25) within group (order by dom) as speed_p25,
      percentile_cont(0.5) within group (order by dom) as speed_p50,
      percentile_cont(0.75) within group (order by dom) as speed_p75,
      percentile_cont(0.5) within group (
        order by case when living_area is not null then close_price / living_area else null end
      ) as median_ppsf,
      avg(case when list_price > 0 then close_price / list_price else null end) as avg_sale_to_list_ratio
    from closed_sales
  ),
  price_bands as (
    select coalesce(jsonb_object_agg(label, cnt), '{}'::jsonb) as bands
    from (
      select
        case
          when close_price < 300000 then 'under_300k'
          when close_price < 500000 then '300k_500k'
          when close_price < 750000 then '500k_750k'
          when close_price < 1000000 then '750k_1m'
          else 'over_1m'
        end as label,
        count(*)::int as cnt
      from closed_sales
      group by 1
    ) b
  ),
  beds as (
    select coalesce(jsonb_object_agg(label, cnt), '{}'::jsonb) as bands
    from (
      select coalesce(beds_total::text, 'unknown') as label, count(*)::int as cnt
      from closed_sales
      group by 1
    ) b
  ),
  prop_types as (
    select coalesce(jsonb_object_agg(label, cnt), '{}'::jsonb) as bands
    from (
      select coalesce(property_type, 'unknown') as label, count(*)::int as cnt
      from closed_sales
      group by 1
    ) b
  )
  select
    coalesce(base.sold_count, 0),
    base.median_sale_price,
    base.avg_sale_price,
    base.total_volume,
    base.median_dom,
    base.speed_p25,
    base.speed_p50,
    base.speed_p75,
    base.median_ppsf,
    base.avg_sale_to_list_ratio,
    price_bands.bands,
    beds.bands,
    prop_types.bands
  into
    v_sold_count,
    v_median_sale_price,
    v_avg_sale_price,
    v_total_volume,
    v_median_dom,
    v_speed_p25,
    v_speed_p50,
    v_speed_p75,
    v_median_ppsf,
    v_avg_sale_to_list_ratio,
    v_price_band_counts,
    v_bedroom_breakdown,
    v_property_type_breakdown
  from base
  cross join price_bands
  cross join beds
  cross join prop_types;

  v_market_health_score :=
    least(25, greatest(0, coalesce((30 - coalesce(v_median_dom, 30)) * (25.0 / 30.0), 0))) +
    least(20, greatest(0, coalesce((coalesce(v_avg_sale_to_list_ratio, 1) - 0.95) * 400, 0))) +
    least(20, greatest(0, coalesce(v_sold_count / 10.0, 0))) +
    least(20, greatest(0, coalesce((750000 - coalesce(v_median_sale_price, 750000)) / 50000.0, 0))) +
    least(10, greatest(0, coalesce((coalesce(v_avg_sale_price, 0) - coalesce(v_median_sale_price, 0)) / nullif(v_median_sale_price, 0), 0) * 100));

  v_market_health_score := greatest(0, least(100, round(v_market_health_score, 2)));
  v_market_health_label := case
    when v_market_health_score >= 80 then 'Very Hot'
    when v_market_health_score >= 60 then 'Hot'
    when v_market_health_score >= 40 then 'Warm'
    when v_market_health_score >= 20 then 'Cool'
    else 'Cold'
  end;

  insert into public.market_stats_cache (
    geo_type, geo_slug, geo_label, period_type, period_start, period_end,
    sold_count, median_sale_price, avg_sale_price, total_volume, median_dom,
    speed_p25, speed_p50, speed_p75, median_ppsf, avg_sale_to_list_ratio,
    price_band_counts, bedroom_breakdown, property_type_breakdown,
    market_health_score, market_health_label, computed_at, updated_at
  )
  values (
    p_geo_type, p_geo_slug, v_geo_label, p_period_type, p_period_start, v_period_end,
    v_sold_count, v_median_sale_price, v_avg_sale_price, v_total_volume, v_median_dom,
    v_speed_p25, v_speed_p50, v_speed_p75, v_median_ppsf, v_avg_sale_to_list_ratio,
    v_price_band_counts, v_bedroom_breakdown, v_property_type_breakdown,
    v_market_health_score, v_market_health_label, now(), now()
  )
  on conflict (geo_type, geo_slug, period_type, period_start)
  do update set
    sold_count = excluded.sold_count,
    median_sale_price = excluded.median_sale_price,
    avg_sale_price = excluded.avg_sale_price,
    total_volume = excluded.total_volume,
    median_dom = excluded.median_dom,
    speed_p25 = excluded.speed_p25,
    speed_p50 = excluded.speed_p50,
    speed_p75 = excluded.speed_p75,
    median_ppsf = excluded.median_ppsf,
    avg_sale_to_list_ratio = excluded.avg_sale_to_list_ratio,
    price_band_counts = excluded.price_band_counts,
    bedroom_breakdown = excluded.bedroom_breakdown,
    property_type_breakdown = excluded.property_type_breakdown,
    market_health_score = excluded.market_health_score,
    market_health_label = excluded.market_health_label,
    computed_at = now(),
    updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.refresh_market_pulse()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_rows integer := 0;
begin
  with city_base as (
    select
      public.slugify_text("City") as city_slug,
      min("City") as city_label,
      count(*) filter (
        where lower(coalesce("StandardStatus", '')) like '%active%'
      )::int as active_count,
      count(*) filter (
        where lower(coalesce("StandardStatus", '')) like '%pending%'
          or lower(coalesce("StandardStatus", '')) like '%under contract%'
      )::int as pending_count,
      count(*) filter (
        where coalesce("OnMarketDate", "ListDate") >= current_date - interval '7 days'
      )::int as new_count_7d,
      count(*) filter (
        where coalesce("OnMarketDate", "ListDate") >= current_date - interval '30 days'
      )::int as new_count_30d,
      percentile_cont(0.5) within group (order by "ListPrice") as median_list_price,
      avg("ListPrice") as avg_list_price
    from public.listings
    where "City" is not null and trim("City") <> ''
    group by 1
  ),
  subdivision_base as (
    select
      public.slugify_text("City") as city_slug,
      public.slugify_text("SubdivisionName") as subdivision_slug,
      min("City") as city_label,
      min("SubdivisionName") as subdivision_label,
      count(*) filter (
        where lower(coalesce("StandardStatus", '')) like '%active%'
      )::int as active_count,
      count(*) filter (
        where lower(coalesce("StandardStatus", '')) like '%pending%'
          or lower(coalesce("StandardStatus", '')) like '%under contract%'
      )::int as pending_count,
      count(*) filter (
        where coalesce("OnMarketDate", "ListDate") >= current_date - interval '7 days'
      )::int as new_count_7d,
      count(*) filter (
        where coalesce("OnMarketDate", "ListDate") >= current_date - interval '30 days'
      )::int as new_count_30d,
      percentile_cont(0.5) within group (order by "ListPrice") as median_list_price,
      avg("ListPrice") as avg_list_price
    from public.listings
    where "City" is not null
      and trim("City") <> ''
      and "SubdivisionName" is not null
      and trim("SubdivisionName") <> ''
    group by 1, 2
  )
  insert into public.market_pulse_live (
    geo_type, geo_slug, geo_label, active_count, pending_count, new_count_7d,
    new_count_30d, median_list_price, avg_list_price, market_health_score, market_health_label, updated_at
  )
  select
    'city',
    city_slug,
    city_label,
    active_count,
    pending_count,
    new_count_7d,
    new_count_30d,
    median_list_price,
    avg_list_price,
    null,
    null,
    now()
  from city_base
  where city_slug <> ''
  union all
  select
    'subdivision',
    city_slug || ':' || subdivision_slug,
    city_label || ': ' || subdivision_label,
    active_count,
    pending_count,
    new_count_7d,
    new_count_30d,
    median_list_price,
    avg_list_price,
    null,
    null,
    now()
  from subdivision_base
  where city_slug <> '' and subdivision_slug <> ''
  on conflict (geo_type, geo_slug)
  do update set
    geo_label = excluded.geo_label,
    active_count = excluded.active_count,
    pending_count = excluded.pending_count,
    new_count_7d = excluded.new_count_7d,
    new_count_30d = excluded.new_count_30d,
    median_list_price = excluded.median_list_price,
    avg_list_price = excluded.avg_list_price,
    market_health_score = excluded.market_health_score,
    market_health_label = excluded.market_health_label,
    updated_at = now();

  get diagnostics v_rows = row_count;
  return jsonb_build_object('ok', true, 'rows', v_rows);
end;
$$;

create or replace function public.refresh_current_period_stats()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_month_start date := date_trunc('month', now())::date;
  v_month_end date := (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date;
  v_city_slug text;
  v_city_sub_slug text;
begin
  perform public.compute_and_cache_period_stats('region', 'central-oregon', 'monthly', v_month_start, v_month_end);

  for v_city_slug in
    select distinct public.slugify_text("City")
    from public.listings
    where "City" is not null and trim("City") <> ''
  loop
    if coalesce(v_city_slug, '') = '' then
      continue;
    end if;
    perform public.compute_and_cache_period_stats('city', v_city_slug, 'monthly', v_month_start, v_month_end);
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
    perform public.compute_and_cache_period_stats('subdivision', v_city_sub_slug, 'monthly', v_month_start, v_month_end);
  end loop;

  return jsonb_build_object('ok', true);
end;
$$;
