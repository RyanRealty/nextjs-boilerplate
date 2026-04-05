-- Data Architecture Phase 1: schema foundation
-- Idempotent migration to establish required columns and cache tables.

create extension if not exists pgcrypto;

alter table if exists public.listings
  add column if not exists mls_source text not null default 'central_oregon',
  add column if not exists property_cluster_id uuid,
  add column if not exists has_virtual_tour boolean not null default false;

create table if not exists public.market_stats_cache (
  id uuid primary key default gen_random_uuid(),
  geo_type text not null,
  geo_slug text not null,
  geo_label text not null,
  period_type text not null,
  period_start date not null,
  period_end date not null,
  sold_count integer not null default 0,
  median_sale_price numeric,
  avg_sale_price numeric,
  total_volume numeric,
  median_dom numeric,
  speed_p25 numeric,
  speed_p50 numeric,
  speed_p75 numeric,
  median_ppsf numeric,
  avg_sale_to_list_ratio numeric,
  price_band_counts jsonb not null default '{}'::jsonb,
  bedroom_breakdown jsonb not null default '{}'::jsonb,
  property_type_breakdown jsonb not null default '{}'::jsonb,
  market_health_score numeric,
  market_health_label text,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_stats_cache_unique_period unique (geo_type, geo_slug, period_type, period_start)
);

create table if not exists public.market_pulse_live (
  id uuid primary key default gen_random_uuid(),
  geo_type text not null,
  geo_slug text not null,
  geo_label text not null,
  active_count integer not null default 0,
  pending_count integer not null default 0,
  new_count_7d integer not null default 0,
  new_count_30d integer not null default 0,
  median_list_price numeric,
  avg_list_price numeric,
  market_health_score numeric,
  market_health_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_pulse_live_unique_geo unique (geo_type, geo_slug)
);

create index if not exists idx_market_stats_geo_period
  on public.market_stats_cache (geo_type, geo_slug, period_type, period_start desc);

create index if not exists idx_market_stats_period_start
  on public.market_stats_cache (period_start desc);

create index if not exists idx_market_pulse_geo
  on public.market_pulse_live (geo_type, geo_slug);

create index if not exists idx_market_pulse_updated_at
  on public.market_pulse_live (updated_at desc);

create index if not exists idx_listings_mls_source
  on public.listings (mls_source);

create index if not exists idx_listings_has_virtual_tour
  on public.listings (has_virtual_tour)
  where has_virtual_tour = true;

-- Closed-sale analytics indexes aligned with planned stats predicates.
create index if not exists idx_listings_closed_city_date
  on public.listings (lower("City"), "CloseDate")
  where "CloseDate" is not null
    and coalesce("StandardStatus", '') ilike '%Closed%';

create index if not exists idx_listings_closed_city_subdivision_date
  on public.listings (lower("City"), lower("SubdivisionName"), "CloseDate")
  where "CloseDate" is not null
    and "SubdivisionName" is not null
    and coalesce("StandardStatus", '') ilike '%Closed%';
