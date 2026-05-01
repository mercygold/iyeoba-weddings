create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  admin_id uuid not null references public.users(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.admin_notes enable row level security;

drop policy if exists "admin_notes_vendor_read_own" on public.admin_notes;
create policy "admin_notes_vendor_read_own"
on public.admin_notes
for select
to authenticated
using (
  exists (
    select 1
    from public.vendors
    where public.vendors.id = admin_notes.vendor_id
      and public.vendors.user_id = auth.uid()
  )
);
