create table if not exists public.tiktok_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  refresh_expires_at timestamptz,
  open_id text,
  scope text,
  token_type text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.tiktok_videos
  add column if not exists video_id text;

alter table public.tiktok_videos
  add column if not exists video_url text;

alter table public.tiktok_videos
  add column if not exists status text not null default 'approved';

update public.tiktok_videos
set video_id = coalesce(video_id, post_id),
    video_url = coalesce(video_url, share_url)
where video_id is null
   or video_url is null;

create unique index if not exists tiktok_videos_video_id_unique
on public.tiktok_videos(video_id)
where video_id is not null;
