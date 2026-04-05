-- Data Architecture Phase 10: CMA comps by listing key/list number.

create or replace function public.get_cma_comps_by_listing_key(
  p_listing_key text,
  p_radius_miles numeric default 2,
  p_months_back integer default 12,
  p_max_count integer default 10
)
returns table (
  listing_key text,
  listing_id text,
  address text,
  close_price numeric,
  close_date date,
  beds_total integer,
  baths_full numeric,
  living_area numeric,
  lot_size_acres numeric,
  year_built integer,
  garage_spaces integer,
  pool_yn boolean,
  property_type text,
  distance_miles numeric
)
language sql
stable
as $$
with subject as (
  select
    l."ListingKey" as listing_key,
    l."ListNumber" as listing_id,
    l."Latitude"::numeric as lat,
    l."Longitude"::numeric as lon
  from public.listings l
  where l."ListingKey" = p_listing_key
     or l."ListNumber" = p_listing_key
  order by l."ModificationTimestamp" desc nulls last
  limit 1
),
closed_candidates as (
  select
    c."ListingKey" as listing_key,
    c."ListNumber" as listing_id,
    concat_ws(' ', c."StreetNumber", c."StreetName") || coalesce(', ' || c."City", '') as address,
    coalesce(c."ClosePrice", (c.details->>'ClosePrice')::numeric, c."ListPrice") as close_price,
    c."CloseDate"::date as close_date,
    c."BedroomsTotal"::integer as beds_total,
    c."BathroomsFull"::numeric as baths_full,
    c."TotalLivingAreaSqFt"::numeric as living_area,
    nullif(c."LotSizeAcres", 0)::numeric as lot_size_acres,
    c."YearBuilt"::integer as year_built,
    c."GarageSpaces"::integer as garage_spaces,
    coalesce(c."PoolYN", false) as pool_yn,
    c."PropertyType"::text as property_type,
    round(
      (
        st_distance(
          st_setsrid(st_makepoint(c."Longitude"::numeric, c."Latitude"::numeric), 4326)::geography,
          st_setsrid(st_makepoint(s.lon, s.lat), 4326)::geography
        ) / 1609.34
      )::numeric,
      3
    ) as distance_miles
  from public.listings c
  cross join subject s
  where c."Latitude" is not null
    and c."Longitude" is not null
    and c."CloseDate" is not null
    and coalesce(c."StandardStatus", '') ilike '%Closed%'
    and c."CloseDate" >= (current_date - make_interval(months => greatest(1, p_months_back)))
    and coalesce(c."ClosePrice", (c.details->>'ClosePrice')::numeric, c."ListPrice") is not null
    and (c."ListingKey" <> s.listing_key and coalesce(c."ListNumber", '') <> coalesce(s.listing_id, ''))
    and st_dwithin(
      st_setsrid(st_makepoint(c."Longitude"::numeric, c."Latitude"::numeric), 4326)::geography,
      st_setsrid(st_makepoint(s.lon, s.lat), 4326)::geography,
      greatest(0.1, p_radius_miles) * 1609.34
    )
)
select
  cc.listing_key,
  cc.listing_id,
  cc.address,
  cc.close_price,
  cc.close_date,
  cc.beds_total,
  cc.baths_full,
  cc.living_area,
  cc.lot_size_acres,
  cc.year_built,
  cc.garage_spaces,
  cc.pool_yn,
  cc.property_type,
  cc.distance_miles
from closed_candidates cc
order by cc.distance_miles asc nulls last, cc.close_date desc nulls last
limit greatest(1, p_max_count);
$$;
