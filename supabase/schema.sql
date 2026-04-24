create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  group_code text,
  preferred_bgm text not null default 'off' check (preferred_bgm in ('white-noise', 'fireplace', 'rain', 'off')),
  default_focus_minutes int not null default 25 check (default_focus_minutes between 1 and 180),
  default_break_minutes int not null default 5 check (default_break_minutes between 1 and 60),
  created_at timestamptz not null default now()
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds int not null check (duration_seconds > 0),
  mode text not null check (mode in ('stopwatch', 'pomodoro')),
  created_at timestamptz not null default now()
);

create index if not exists profiles_group_code_idx on public.profiles (group_code);
create index if not exists study_sessions_user_started_at_idx on public.study_sessions (user_id, started_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  incoming_display_name text;
  incoming_group_code text;
begin
  incoming_display_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  incoming_group_code := nullif(upper(trim(coalesce(new.raw_user_meta_data ->> 'group_code', ''))), '');

  insert into public.profiles (
    id,
    display_name,
    group_code
  )
  values (
    new.id,
    coalesce(incoming_display_name, split_part(new.email, '@', 1)),
    incoming_group_code
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.study_sessions enable row level security;

drop policy if exists "profiles_select_own_or_group" on public.profiles;
create policy "profiles_select_own_or_group"
on public.profiles
for select
using (
  auth.uid() = id
  or (
    group_code is not null
    and exists (
      select 1
      from public.profiles as viewer
      where viewer.id = auth.uid()
        and viewer.group_code is not null
        and viewer.group_code = profiles.group_code
    )
  )
);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "study_sessions_select_own" on public.study_sessions;
create policy "study_sessions_select_own"
on public.study_sessions
for select
using (auth.uid() = user_id);

drop policy if exists "study_sessions_insert_own" on public.study_sessions;
create policy "study_sessions_insert_own"
on public.study_sessions
for insert
with check (auth.uid() = user_id);

drop policy if exists "study_sessions_delete_own" on public.study_sessions;
create policy "study_sessions_delete_own"
on public.study_sessions
for delete
using (auth.uid() = user_id);

create or replace function public.get_group_leaderboard(range_key text default 'week')
returns table (
  user_id uuid,
  display_name text,
  group_code text,
  total_seconds bigint,
  total_hours numeric,
  rank_number bigint
)
language sql
security definer
set search_path = public
as $$
  with viewer as (
    select p.id, p.group_code
    from public.profiles as p
    where p.id = auth.uid()
  ),
  bounds as (
    select
      case
        when coalesce(range_key, 'week') = 'today' then date_trunc('day', now())
        when coalesce(range_key, 'week') = 'week' then date_trunc('week', now())
        when coalesce(range_key, 'week') = 'month' then date_trunc('month', now())
        else null
      end as range_start
  ),
  group_members as (
    select p.id, p.display_name, p.group_code
    from public.profiles as p
    join viewer on viewer.group_code is not null and viewer.group_code <> '' and p.group_code = viewer.group_code
  ),
  aggregated as (
    select
      group_members.id as user_id,
      group_members.display_name,
      group_members.group_code,
      coalesce(sum(study_sessions.duration_seconds), 0)::bigint as total_seconds
    from group_members
    left join public.study_sessions
      on study_sessions.user_id = group_members.id
      and (
        (select range_start from bounds) is null
        or study_sessions.started_at >= (select range_start from bounds)
      )
    group by group_members.id, group_members.display_name, group_members.group_code
  )
  select
    aggregated.user_id,
    aggregated.display_name,
    aggregated.group_code,
    aggregated.total_seconds,
    round(aggregated.total_seconds::numeric / 3600, 1) as total_hours,
    rank() over (order by aggregated.total_seconds desc, coalesce(aggregated.display_name, '') asc) as rank_number
  from aggregated
  order by rank_number, coalesce(display_name, '');
$$;

grant execute on function public.get_group_leaderboard(text) to authenticated;
