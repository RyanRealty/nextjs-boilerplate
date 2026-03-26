-- Phase 5.2: semantic listing search with pgvector
create extension if not exists vector;

create table if not exists public.listing_embeddings (
  listing_key text primary key references public.listings("ListingKey") on delete cascade,
  city text null,
  search_content text not null,
  embedding vector(1536) not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_listing_embeddings_city on public.listing_embeddings (city);

create index if not exists idx_listing_embeddings_embedding
  on public.listing_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function public.match_listings_semantic(
  query_embedding vector(1536),
  match_count int default 20,
  city_filter text default null
)
returns table (
  listing_key text,
  similarity double precision
)
language sql
stable
as $$
  select
    le.listing_key,
    1 - (le.embedding <=> query_embedding) as similarity
  from public.listing_embeddings le
  where city_filter is null
     or lower(coalesce(le.city, '')) = lower(city_filter)
  order by le.embedding <=> query_embedding
  limit greatest(1, least(match_count, 100));
$$;
