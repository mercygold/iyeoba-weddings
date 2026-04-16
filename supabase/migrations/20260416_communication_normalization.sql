-- Communication schema normalization (non-destructive)
-- Keeps legacy leads/lead_messages intact while introducing
-- inquiries/inquiry_messages as the source of truth.

create extension if not exists "pgcrypto";

-- 1) Canonical user/profile views over existing public.users
create or replace view public.profiles as
select
  id,
  role::text as role,
  full_name,
  email,
  null::text as avatar_url,
  created_at
from public.users;

create or replace view public.vendor_profiles as
select
  id,
  user_id,
  business_name,
  category,
  coalesce(custom_category, null) as subcategory,
  location,
  coalesce(culture_specialization, culture, 'Nigerian weddings') as culture,
  description,
  coalesce(
    (select vp.image_url
      from public.vendor_portfolio vp
      where vp.vendor_id = vendors.id
      order by vp.sort_order asc, vp.id asc
      limit 1),
    portfolio_image_urls[1]
  ) as profile_image_url,
  approved as is_approved,
  (status = 'approved') as is_published,
  created_at
from public.vendors;

create table if not exists public.planner_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  wedding_date date,
  location text,
  culture text,
  created_at timestamptz not null default timezone('utc', now())
);

-- 2) Normalized communication tables
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  planner_user_id uuid not null references public.users(id) on delete cascade,
  vendor_user_id uuid references public.users(id) on delete set null,
  vendor_profile_id uuid not null references public.vendors(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'contacted', 'closed', 'archived')),
  initial_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.inquiry_messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  sender_user_id uuid references public.users(id) on delete set null,
  message_body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

-- 3) Backfill existing communication data into normalized tables
insert into public.inquiries (
  id,
  planner_user_id,
  vendor_user_id,
  vendor_profile_id,
  status,
  initial_message,
  created_at,
  updated_at
)
select
  l.id,
  coalesce(l.planner_user_id, l.user_id) as planner_user_id,
  coalesce(l.vendor_user_id, v.user_id) as vendor_user_id,
  l.vendor_id as vendor_profile_id,
  case
    when l.thread_status in ('open', 'contacted', 'closed', 'archived') then l.thread_status
    when l.status = 'contacted' then 'contacted'
    when l.status = 'booked' then 'closed'
    else 'open'
  end as status,
  l.message as initial_message,
  l.created_at,
  coalesce(l.updated_at, l.created_at, timezone('utc', now())) as updated_at
from public.leads l
left join public.vendors v on v.id = l.vendor_id
where not exists (
  select 1 from public.inquiries i where i.id = l.id
);

insert into public.inquiry_messages (id, inquiry_id, sender_user_id, message_body, created_at)
select
  lm.id,
  lm.lead_id as inquiry_id,
  lm.sender_user_id,
  coalesce(lm.body, lm.message, '') as message_body,
  lm.created_at
from public.lead_messages lm
where coalesce(lm.body, lm.message, '') <> ''
  and not exists (
    select 1 from public.inquiry_messages im where im.id = lm.id
  );

-- 4) Indexes for runtime reads
create index if not exists inquiries_planner_user_id_idx on public.inquiries(planner_user_id);
create index if not exists inquiries_vendor_user_id_idx on public.inquiries(vendor_user_id);
create index if not exists inquiries_vendor_profile_id_idx on public.inquiries(vendor_profile_id);
create index if not exists inquiries_created_at_idx on public.inquiries(created_at desc);
create index if not exists inquiries_updated_at_idx on public.inquiries(updated_at desc);
create index if not exists inquiry_messages_inquiry_id_idx on public.inquiry_messages(inquiry_id);
create index if not exists inquiry_messages_created_at_idx on public.inquiry_messages(created_at asc);

-- 5) Updated_at trigger for inquiries
create or replace function public.touch_inquiry_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists inquiries_touch_updated_at on public.inquiries;
create trigger inquiries_touch_updated_at
before update on public.inquiries
for each row
execute procedure public.touch_inquiry_updated_at();

-- 6) RLS and policies
alter table public.inquiries enable row level security;
alter table public.inquiry_messages enable row level security;
alter table public.planner_profiles enable row level security;

drop policy if exists "inquiries_all_own_side" on public.inquiries;
create policy "inquiries_all_own_side"
on public.inquiries
for all
to authenticated
using (
  planner_user_id = auth.uid()
  or vendor_user_id = auth.uid()
  or exists (
    select 1
    from public.vendors v
    where v.id = vendor_profile_id
      and v.user_id = auth.uid()
  )
)
with check (
  planner_user_id = auth.uid()
  or vendor_user_id = auth.uid()
  or exists (
    select 1
    from public.vendors v
    where v.id = vendor_profile_id
      and v.user_id = auth.uid()
  )
);

drop policy if exists "inquiry_messages_all_own_side" on public.inquiry_messages;
create policy "inquiry_messages_all_own_side"
on public.inquiry_messages
for all
to authenticated
using (
  exists (
    select 1
    from public.inquiries i
    left join public.vendors v on v.id = i.vendor_profile_id
    where i.id = inquiry_id
      and (
        i.planner_user_id = auth.uid()
        or i.vendor_user_id = auth.uid()
        or v.user_id = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.inquiries i
    left join public.vendors v on v.id = i.vendor_profile_id
    where i.id = inquiry_id
      and (
        i.planner_user_id = auth.uid()
        or i.vendor_user_id = auth.uid()
        or v.user_id = auth.uid()
      )
  )
);

drop policy if exists "planner_profiles_all_own" on public.planner_profiles;
create policy "planner_profiles_all_own"
on public.planner_profiles
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
