create table if not exists public.vendor_tiktok_feature_requests (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  business_name text,
  category text,
  social_link text not null,
  content_link text not null,
  caption text,
  permission_confirmed boolean not null default false,
  status text not null default 'pending_review',
  eligibility_status text,
  admin_notes text,
  scheduled_for timestamptz,
  posted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint vendor_tiktok_feature_requests_status_check
    check (status in (
      'pending_review',
      'needs_changes',
      'approved',
      'scheduled',
      'posted',
      'not_eligible',
      'cancelled'
    )),
  constraint vendor_tiktok_feature_requests_eligibility_status_check
    check (
      eligibility_status is null
      or eligibility_status in (
        'full_launch_offer',
        'intro_feature_only',
        'needs_profile_completion',
        'not_eligible'
      )
    )
);

create index if not exists vendor_tiktok_feature_requests_vendor_id_idx
  on public.vendor_tiktok_feature_requests(vendor_id);

create index if not exists vendor_tiktok_feature_requests_user_id_idx
  on public.vendor_tiktok_feature_requests(user_id);

create index if not exists vendor_tiktok_feature_requests_status_idx
  on public.vendor_tiktok_feature_requests(status);

create index if not exists vendor_tiktok_feature_requests_created_at_idx
  on public.vendor_tiktok_feature_requests(created_at desc);

create or replace function public.set_vendor_tiktok_feature_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_vendor_tiktok_feature_requests_updated_at
  on public.vendor_tiktok_feature_requests;

create trigger set_vendor_tiktok_feature_requests_updated_at
before update on public.vendor_tiktok_feature_requests
for each row
execute function public.set_vendor_tiktok_feature_requests_updated_at();

alter table public.vendor_tiktok_feature_requests enable row level security;

drop policy if exists "vendor_tiktok_feature_requests_vendor_insert_own"
  on public.vendor_tiktok_feature_requests;

create policy "vendor_tiktok_feature_requests_vendor_insert_own"
on public.vendor_tiktok_feature_requests
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.vendors
    where public.vendors.id = vendor_tiktok_feature_requests.vendor_id
      and public.vendors.user_id = auth.uid()
  )
);

drop policy if exists "vendor_tiktok_feature_requests_vendor_read_own"
  on public.vendor_tiktok_feature_requests;

create policy "vendor_tiktok_feature_requests_vendor_read_own"
on public.vendor_tiktok_feature_requests
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.vendors
    where public.vendors.id = vendor_tiktok_feature_requests.vendor_id
      and public.vendors.user_id = auth.uid()
  )
);

drop policy if exists "vendor_tiktok_feature_requests_admin_read_all"
  on public.vendor_tiktok_feature_requests;

create policy "vendor_tiktok_feature_requests_admin_read_all"
on public.vendor_tiktok_feature_requests
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

drop policy if exists "vendor_tiktok_feature_requests_admin_update_all"
  on public.vendor_tiktok_feature_requests;

create policy "vendor_tiktok_feature_requests_admin_update_all"
on public.vendor_tiktok_feature_requests
for update
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
