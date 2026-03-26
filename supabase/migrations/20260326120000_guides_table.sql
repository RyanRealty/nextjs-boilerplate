create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  meta_description text,
  content_html text not null,
  category text,
  city text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_guides_status_published_at on public.guides (status, published_at desc);
create index if not exists idx_guides_city on public.guides (city);

create or replace function public.set_guides_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists guides_set_updated_at on public.guides;
create trigger guides_set_updated_at
before update on public.guides
for each row
execute function public.set_guides_updated_at();

alter table public.guides enable row level security;

drop policy if exists "Public can read published guides" on public.guides;
create policy "Public can read published guides"
on public.guides
for select
using (status = 'published');

drop policy if exists "Service role manages guides" on public.guides;
create policy "Service role manages guides"
on public.guides
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
