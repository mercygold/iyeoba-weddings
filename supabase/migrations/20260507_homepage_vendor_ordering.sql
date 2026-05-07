alter table public.vendors
  add column if not exists homepage_carousel boolean not null default false;

alter table public.vendors
  add column if not exists homepage_order integer;

alter table public.vendors
  add column if not exists approved_at timestamptz;

alter table public.vendors
  drop constraint if exists vendors_homepage_carousel_position_range;

alter table public.vendors
  drop constraint if exists vendors_homepage_order_range;

alter table public.vendors
  add constraint vendors_homepage_order_range
  check (
    homepage_order is null
    or (homepage_order between 1 and 10)
  );

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vendors'
      and column_name = 'homepage_carousel_position'
  ) then
    execute '
      update public.vendors
      set homepage_order = homepage_carousel_position
      where homepage_order is null
        and homepage_carousel_position between 1 and 10
    ';
  end if;
end $$;

update public.vendors
set approved_at = coalesce(last_reviewed_at, updated_at, created_at)
where approved_at is null
  and (status = 'approved' or approved = true);

drop index if exists public.vendors_homepage_carousel_order_idx;

create index if not exists vendors_homepage_carousel_order_idx
on public.vendors(homepage_carousel desc, homepage_order asc, approved_at desc, last_reviewed_at desc, created_at desc);
