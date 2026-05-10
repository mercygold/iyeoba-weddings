create table if not exists public.guest_invites (
  id uuid primary key default gen_random_uuid(),
  planner_user_id uuid not null references public.users(id) on delete cascade,
  wedding_id uuid references public.weddings(id) on delete cascade,
  guest_name text not null,
  guest_email text not null,
  guest_phone text,
  guest_group text,
  couple_name text not null,
  wedding_date text,
  wedding_time text,
  venue text,
  custom_message text,
  invite_status text not null default 'draft',
  rsvp_status text not null default 'pending',
  rsvp_token text unique not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guest_invites_invite_status_check
    check (invite_status in ('draft', 'sent', 'failed')),
  constraint guest_invites_rsvp_status_check
    check (rsvp_status in ('pending', 'confirmed', 'declined'))
);

create index if not exists guest_invites_planner_created_idx
  on public.guest_invites(planner_user_id, wedding_id, created_at desc);

create index if not exists guest_invites_email_idx
  on public.guest_invites(planner_user_id, guest_email);

create or replace function public.set_guest_invites_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_guest_invites_updated_at
  on public.guest_invites;

create trigger set_guest_invites_updated_at
before update on public.guest_invites
for each row
execute function public.set_guest_invites_updated_at();

alter table public.guest_invites enable row level security;

drop policy if exists "guest_invites_all_own" on public.guest_invites;

create policy "guest_invites_all_own"
on public.guest_invites
for all
to authenticated
using (auth.uid() = planner_user_id)
with check (auth.uid() = planner_user_id);
