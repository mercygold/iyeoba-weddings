create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  wedding_id uuid references public.weddings(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  guest_group text,
  invite_status text not null default 'Not invited',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guests_invite_status_check
    check (invite_status in ('Not invited', 'Invited', 'Confirmed', 'Declined', 'Maybe'))
);

create index if not exists guests_user_wedding_created_idx
  on public.guests(user_id, wedding_id, created_at desc);

create or replace function public.set_guests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_guests_updated_at
  on public.guests;

create trigger set_guests_updated_at
before update on public.guests
for each row
execute function public.set_guests_updated_at();

alter table public.guests enable row level security;

drop policy if exists "guests_all_own" on public.guests;

create policy "guests_all_own"
on public.guests
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

