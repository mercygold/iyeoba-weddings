alter table public.blueprints
  add column if not exists budget_json jsonb not null default '{}'::jsonb;
