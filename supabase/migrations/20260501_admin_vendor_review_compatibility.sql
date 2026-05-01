alter table public.vendors
  add column if not exists admin_notes text;

alter table public.vendors
  add column if not exists last_reviewed_at timestamptz;

alter table public.vendors
  add column if not exists reviewed_by uuid references public.users(id) on delete set null;

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  admin_id uuid not null references public.users(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.admin_notes enable row level security;

drop policy if exists "vendors_admin_manage" on public.vendors;
create policy "vendors_admin_manage"
on public.vendors
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

drop policy if exists "admin_notes_admin_read" on public.admin_notes;
create policy "admin_notes_admin_read"
on public.admin_notes
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

drop policy if exists "admin_notes_admin_manage" on public.admin_notes;
create policy "admin_notes_admin_manage"
on public.admin_notes
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
