create table if not exists public.ai_planner_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text,
  messages jsonb not null default '[]'::jsonb,
  plan jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_planner_chats
  add column if not exists user_id uuid references public.users(id) on delete cascade,
  add column if not exists title text,
  add column if not exists messages jsonb not null default '[]'::jsonb,
  add column if not exists plan jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists ai_planner_chats_user_id_idx
  on public.ai_planner_chats(user_id);

create index if not exists ai_planner_chats_updated_at_idx
  on public.ai_planner_chats(updated_at desc);

create or replace function public.set_ai_planner_chats_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_ai_planner_chats_updated_at
  on public.ai_planner_chats;

create trigger set_ai_planner_chats_updated_at
before update on public.ai_planner_chats
for each row
execute function public.set_ai_planner_chats_updated_at();

alter table public.ai_planner_chats enable row level security;

drop policy if exists "ai_planner_chats_all_own"
  on public.ai_planner_chats;

create policy "ai_planner_chats_all_own"
on public.ai_planner_chats
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
