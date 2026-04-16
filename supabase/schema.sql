create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'app_role'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.app_role as enum ('planner', 'vendor', 'admin');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'lead_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.lead_status as enum ('new', 'contacted', 'booked');
  end if;
end
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  role public.app_role not null default 'planner',
  full_name text,
  phone text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.weddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  wedding_type text,
  culture text,
  location text,
  guest_count integer,
  budget_range text,
  wedding_date date,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  slug text not null unique,
  business_name text not null,
  owner_name text,
  category text not null,
  country_region text,
  nigeria_state text,
  phone_code text,
  culture text,
  culture_specialization text,
  location text not null,
  years_experience text,
  primary_social_link text,
  contact_email text,
  instagram text,
  website text,
  whatsapp text,
  description text,
  services_offered text[] not null default '{}'::text[],
  price_currency text,
  price_amount numeric,
  price_range text,
  status text not null default 'draft',
  portfolio_image_urls text[] not null default '{}'::text[],
  government_id_url text,
  profile_status text not null default 'draft',
  onboarding_completed boolean not null default false,
  availability_status text,
  next_available_month text,
  value_statement text,
  verified boolean not null default false,
  approved boolean not null default false,
  last_reviewed_at timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.vendors
  add column if not exists owner_name text;

alter table public.vendors
  add column if not exists country_region text;

alter table public.vendors
  add column if not exists nigeria_state text;

alter table public.vendors
  add column if not exists phone_code text;

alter table public.vendors
  add column if not exists years_experience text;

alter table public.vendors
  add column if not exists primary_social_link text;

alter table public.vendors
  add column if not exists contact_email text;

alter table public.vendors
  add column if not exists custom_category text;

alter table public.vendors
  add column if not exists registered_business boolean not null default false;

alter table public.vendors
  add column if not exists price_currency text;

alter table public.vendors
  add column if not exists price_amount numeric;

alter table public.vendors
  add column if not exists status text not null default 'draft';

alter table public.vendors
  add column if not exists portfolio_image_urls text[] not null default '{}'::text[];

alter table public.vendors
  add column if not exists government_id_url text;

alter table public.vendors
  add column if not exists cac_certificate_url text;

alter table public.vendors
  add column if not exists admin_notes text;

alter table public.vendors
  add column if not exists last_reviewed_at timestamptz;

alter table public.vendors
  add column if not exists reviewed_by uuid references public.users(id) on delete set null;

alter table public.vendors
  add column if not exists profile_status text not null default 'draft';

alter table public.vendors
  add column if not exists onboarding_completed boolean not null default false;

update public.vendors
set status = case
  when coalesce(profile_status, '') in ('draft', 'pending_review', 'approved', 'needs_changes', 'suspended', 'archived')
    then profile_status
  when approved = true
    then 'approved'
  else coalesce(status, 'draft')
end
where status is null
   or status not in ('draft', 'pending_review', 'approved', 'needs_changes', 'suspended', 'archived')
   or (profile_status = 'approved' and status = 'pending_review')
   or (approved = true and status <> 'approved');

update public.vendors
set approved = (status = 'approved'),
    verified = case when status = 'approved' then true else verified end,
    profile_status = status
where coalesce(profile_status, '') <> status
   or approved is distinct from (status = 'approved');

create unique index if not exists vendors_user_id_unique
on public.vendors(user_id)
where user_id is not null;

create table if not exists public.vendor_portfolio (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0
);

create table if not exists public.saved_vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, vendor_id)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  planner_user_id uuid references public.users(id) on delete set null,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  vendor_user_id uuid references public.users(id) on delete set null,
  wedding_id uuid references public.weddings(id) on delete set null,
  message text,
  contact_method text,
  status public.lead_status not null default 'new',
  thread_status text not null default 'open',
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.leads
  add column if not exists planner_user_id uuid references public.users(id) on delete set null;

alter table public.leads
  add column if not exists vendor_user_id uuid references public.users(id) on delete set null;

alter table public.leads
  add column if not exists contact_method text;

alter table public.leads
  add column if not exists thread_status text not null default 'open';

update public.leads
set planner_user_id = user_id
where planner_user_id is null;

update public.leads
set vendor_user_id = public.vendors.user_id
from public.vendors
where public.vendors.id = public.leads.vendor_id
  and public.leads.vendor_user_id is null;

update public.leads
set thread_status = case
  when status = 'contacted' then 'contacted'
  when status = 'booked' then 'closed'
  else 'open'
end
where thread_status is null
   or thread_status not in ('open', 'contacted', 'closed', 'archived');

create table if not exists public.lead_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  sender_user_id uuid references public.users(id) on delete set null,
  sender_role text not null,
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.lead_messages
  add column if not exists body text;

alter table public.lead_messages
  add column if not exists message text;

update public.lead_messages
set message = body
where message is null
  and body is not null;

update public.lead_messages
set body = message
where body is null
  and message is not null;

create table if not exists public.blueprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  wedding_id uuid references public.weddings(id) on delete cascade,
  summary text,
  timeline_json jsonb not null default '[]'::jsonb,
  checklist_json jsonb not null default '[]'::jsonb,
  vendor_categories_json jsonb not null default '[]'::jsonb,
  missing_items_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tiktok_videos (
  id uuid primary key default gen_random_uuid(),
  post_id text not null unique,
  share_url text not null,
  title text,
  thumbnail_url text,
  caption text not null,
  category text,
  culture text default 'Yoruba',
  vendor_slug text,
  views bigint default 0,
  likes bigint default 0,
  engagement_badge text default 'Featured on TikTok',
  featured_home boolean not null default false,
  featured_landing boolean not null default false,
  featured_profile boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.tiktok_videos
  add column if not exists title text;

alter table public.tiktok_videos
  add column if not exists thumbnail_url text;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  source text,
  path text,
  vendor_slug text,
  role text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tracking (
  id uuid primary key default gen_random_uuid(),
  source text,
  event text not null,
  page text,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.safe_app_role(role_text text)
returns public.app_role
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  return case lower(coalesce(role_text, ''))
    when 'vendor' then 'vendor'::public.app_role
    when 'admin' then 'admin'::public.app_role
    else 'planner'::public.app_role
  end;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.users (id, email, role, full_name, phone)
  values (
    new.id,
    new.email,
    public.safe_app_role(new.raw_user_meta_data ->> 'role'),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    role = excluded.role,
    full_name = excluded.full_name,
    phone = excluded.phone;

  return new;
end;
$$;

revoke all on function public.safe_app_role(text) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.users enable row level security;
alter table public.weddings enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_portfolio enable row level security;
alter table public.saved_vendors enable row level security;
alter table public.leads enable row level security;
alter table public.lead_messages enable row level security;
alter table public.blueprints enable row level security;
alter table public.tiktok_videos enable row level security;
alter table public.analytics_events enable row level security;
alter table public.tracking enable row level security;

insert into storage.buckets (id, name, public)
values ('vendor-portfolio', 'vendor-portfolio', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('vendor-documents', 'vendor-documents', false)
on conflict (id) do nothing;

drop policy if exists "vendor_portfolio_storage_public_read" on storage.objects;
drop policy if exists "vendor_portfolio_storage_vendor_upload" on storage.objects;
drop policy if exists "vendor_documents_storage_vendor_upload" on storage.objects;
drop policy if exists "vendor_documents_storage_admin_read" on storage.objects;
drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_insert_own" on public.users;
drop policy if exists "users_update_own" on public.users;
drop policy if exists "weddings_all_own" on public.weddings;
drop policy if exists "vendors_public_read_approved" on public.vendors;
drop policy if exists "vendors_insert_own" on public.vendors;
drop policy if exists "vendors_update_own" on public.vendors;
drop policy if exists "vendor_portfolio_public_read" on public.vendor_portfolio;
drop policy if exists "vendor_portfolio_modify_own" on public.vendor_portfolio;
drop policy if exists "saved_vendors_all_own" on public.saved_vendors;
drop policy if exists "leads_all_own_side" on public.leads;
drop policy if exists "lead_messages_all_own_side" on public.lead_messages;
drop policy if exists "blueprints_all_own" on public.blueprints;
drop policy if exists "tiktok_videos_public_read_active" on public.tiktok_videos;
drop policy if exists "tiktok_videos_admin_manage" on public.tiktok_videos;
drop policy if exists "analytics_events_admin_read" on public.analytics_events;
drop policy if exists "analytics_events_admin_manage" on public.analytics_events;
drop policy if exists "tracking_admin_read" on public.tracking;
drop policy if exists "tracking_admin_manage" on public.tracking;

create policy "users_select_own"
on public.users
for select
to authenticated
using (auth.uid() = id);

create policy "users_insert_own"
on public.users
for insert
to authenticated
with check (auth.uid() = id);

create policy "users_update_own"
on public.users
for update
to authenticated
using (auth.uid() = id);

create policy "weddings_all_own"
on public.weddings
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "vendors_public_read_approved"
on public.vendors
for select
to anon, authenticated
using (status = 'approved' or auth.uid() = user_id);

create policy "vendors_insert_own"
on public.vendors
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "vendors_update_own"
on public.vendors
for update
to authenticated
using (auth.uid() = user_id);

create policy "vendor_portfolio_public_read"
on public.vendor_portfolio
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.vendors
    where public.vendors.id = vendor_id
      and (public.vendors.status = 'approved' or public.vendors.user_id = auth.uid())
  )
);

create policy "vendor_portfolio_modify_own"
on public.vendor_portfolio
for all
to authenticated
using (
  exists (
    select 1
    from public.vendors
    where public.vendors.id = vendor_id
      and public.vendors.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.vendors
    where public.vendors.id = vendor_id
      and public.vendors.user_id = auth.uid()
  )
);

create policy "saved_vendors_all_own"
on public.saved_vendors
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "leads_all_own_side"
on public.leads
for all
to authenticated
using (
  auth.uid() = user_id or exists (
    select 1
    from public.vendors
    where public.vendors.id = vendor_id
      and public.vendors.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id or exists (
    select 1
    from public.vendors
    where public.vendors.id = vendor_id
      and public.vendors.user_id = auth.uid()
  )
);

create policy "lead_messages_all_own_side"
on public.lead_messages
for all
to authenticated
using (
  exists (
    select 1
    from public.leads
    join public.vendors on public.vendors.id = public.leads.vendor_id
    where public.leads.id = lead_id
      and (
        public.leads.user_id = auth.uid()
        or public.leads.planner_user_id = auth.uid()
        or public.vendors.user_id = auth.uid()
        or public.leads.vendor_user_id = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.leads
    join public.vendors on public.vendors.id = public.leads.vendor_id
    where public.leads.id = lead_id
      and (
        public.leads.user_id = auth.uid()
        or public.leads.planner_user_id = auth.uid()
        or public.vendors.user_id = auth.uid()
        or public.leads.vendor_user_id = auth.uid()
      )
  )
);

create policy "blueprints_all_own"
on public.blueprints
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "tiktok_videos_public_read_active"
on public.tiktok_videos
for select
to anon, authenticated
using (active = true);

create policy "tiktok_videos_admin_manage"
on public.tiktok_videos
for all
to authenticated
using (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.role = 'admin'
  )
 );

create policy "analytics_events_admin_read"
on public.analytics_events
for select
to authenticated
using (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.role = 'admin'
  )
);

create policy "analytics_events_admin_manage"
on public.analytics_events
for all
to authenticated
using (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.role = 'admin'
  )
);

create policy "tracking_admin_read"
on public.tracking
for select
to authenticated
using (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.role = 'admin'
  )
);

create policy "tracking_admin_manage"
on public.tracking
for all
to authenticated
using (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.role = 'admin'
  )
);

create policy "vendor_portfolio_storage_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'vendor-portfolio');

create policy "vendor_portfolio_storage_vendor_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vendor-portfolio'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "vendor_documents_storage_vendor_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vendor-documents'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "vendor_documents_storage_admin_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'vendor-documents'
  and exists (
    select 1
    from public.users
    where public.users.id = auth.uid()
      and public.users.role = 'admin'
  )
);
