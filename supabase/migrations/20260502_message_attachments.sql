insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments',
  'message-attachments',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.lead_messages(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  uploader_user_id uuid references public.users(id) on delete set null,
  file_name text not null,
  file_type text not null,
  file_size integer not null,
  storage_path text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.message_attachments
  add column if not exists message_id uuid references public.lead_messages(id) on delete cascade;

alter table public.message_attachments
  add column if not exists lead_id uuid references public.leads(id) on delete cascade;

alter table public.message_attachments
  add column if not exists uploader_user_id uuid references public.users(id) on delete set null;

alter table public.message_attachments
  add column if not exists file_name text;

alter table public.message_attachments
  add column if not exists file_type text;

alter table public.message_attachments
  add column if not exists file_size integer;

alter table public.message_attachments
  add column if not exists storage_path text;

alter table public.message_attachments
  add column if not exists created_at timestamptz not null default timezone('utc', now());

create index if not exists message_attachments_message_id_idx
on public.message_attachments(message_id);

create index if not exists message_attachments_lead_id_idx
on public.message_attachments(lead_id);

alter table public.message_attachments enable row level security;

drop policy if exists "message_attachments_participant_read" on public.message_attachments;
create policy "message_attachments_participant_read"
on public.message_attachments
for select
to authenticated
using (
  exists (
    select 1
    from public.leads
    join public.vendors on public.vendors.id = public.leads.vendor_id
      where public.leads.id = message_attachments.lead_id
        and (
          public.leads.user_id = auth.uid()
          or public.leads.planner_user_id = auth.uid()
          or public.vendors.user_id = auth.uid()
        )
    )
);

drop policy if exists "message_attachments_participant_insert" on public.message_attachments;
create policy "message_attachments_participant_insert"
on public.message_attachments
for insert
to authenticated
with check (
  auth.uid() = uploader_user_id
  and exists (
    select 1
    from public.leads
    join public.vendors on public.vendors.id = public.leads.vendor_id
      where public.leads.id = message_attachments.lead_id
        and (
          public.leads.user_id = auth.uid()
          or public.leads.planner_user_id = auth.uid()
          or public.vendors.user_id = auth.uid()
        )
    )
);

drop policy if exists "message_attachments_admin_manage" on public.message_attachments;
create policy "message_attachments_admin_manage"
on public.message_attachments
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
