alter table public.blueprints
  add column if not exists budget_json jsonb not null default '{}'::jsonb;

create index if not exists blueprints_user_wedding_created_idx
  on public.blueprints(user_id, wedding_id, created_at desc);

