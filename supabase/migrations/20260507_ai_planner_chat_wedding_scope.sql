alter table public.ai_planner_chats
  add column if not exists wedding_id uuid references public.weddings(id) on delete cascade;

create index if not exists ai_planner_chats_user_wedding_updated_idx
  on public.ai_planner_chats(user_id, wedding_id, updated_at desc);

