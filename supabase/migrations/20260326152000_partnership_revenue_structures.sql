-- Phase 6.3 + 6.4: partnership revenue structures and revenue dashboard data model

create table if not exists public.partner_programs (
  slug text primary key,
  name text not null,
  category text not null check (category in ('lender_referral', 'relocation_referral', 'report_sponsorship', 'vendor_membership')),
  default_payout numeric(12,2) null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.partner_programs (slug, name, category, default_payout, active)
values
  ('lender_referral', 'Lender referral', 'lender_referral', 300, true),
  ('relocation_referral', 'Relocation referral', 'relocation_referral', 2500, true),
  ('annual_report_sponsorship', 'Annual report sponsorship', 'report_sponsorship', 1500, true),
  ('vendor_membership', 'Vendor marketplace membership', 'vendor_membership', 125, true)
on conflict (slug) do update
set
  name = excluded.name,
  category = excluded.category,
  default_payout = excluded.default_payout,
  active = excluded.active,
  updated_at = now();

create table if not exists public.partner_referrals (
  id uuid primary key default gen_random_uuid(),
  partner_slug text not null references public.partner_programs(slug) on update cascade,
  lead_source text not null,
  lead_identifier text null,
  campaign_source text null,
  campaign_medium text null,
  estimated_value numeric(12,2) null,
  actual_value numeric(12,2) null,
  status text not null default 'new' check (status in ('new', 'qualified', 'closed_won', 'closed_lost')),
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_partner_referrals_partner_slug on public.partner_referrals(partner_slug);
create index if not exists idx_partner_referrals_status on public.partner_referrals(status);
create index if not exists idx_partner_referrals_created_at on public.partner_referrals(created_at desc);

create table if not exists public.revenue_events (
  id uuid primary key default gen_random_uuid(),
  revenue_type text not null check (revenue_type in ('adsense', 'partner_referral', 'sponsorship', 'membership', 'other')),
  page_cluster text not null default 'unknown',
  amount numeric(12,2) not null,
  event_date date not null default current_date,
  source_label text null,
  reference_id text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_revenue_events_event_date on public.revenue_events(event_date desc);
create index if not exists idx_revenue_events_page_cluster on public.revenue_events(page_cluster);
create index if not exists idx_revenue_events_revenue_type on public.revenue_events(revenue_type);

alter table public.partner_programs enable row level security;
alter table public.partner_referrals enable row level security;
alter table public.revenue_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'partner_programs' and policyname = 'partner_programs_service_role_all'
  ) then
    create policy partner_programs_service_role_all
      on public.partner_programs
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'partner_referrals' and policyname = 'partner_referrals_service_role_all'
  ) then
    create policy partner_referrals_service_role_all
      on public.partner_referrals
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'revenue_events' and policyname = 'revenue_events_service_role_all'
  ) then
    create policy revenue_events_service_role_all
      on public.revenue_events
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;
