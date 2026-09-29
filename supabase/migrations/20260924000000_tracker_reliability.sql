begin;

-- Profiles are private. Group summaries are exposed only through membership-aware RPCs.
drop policy if exists profiles_select_own_or_group on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = (select auth.uid()));
alter table public.profiles add column if not exists timezone text not null default 'Asia/Kolkata';
alter table public.study_sessions add column if not exists subject text;
alter table public.study_sessions add column if not exists task_id uuid;
-- NOT VALID preserves legacy records; constraints still enforce all new writes/edits.
alter table public.study_sessions add constraint session_time_order check (ended_at >= started_at) not valid;
alter table public.study_sessions add constraint session_plausible_duration check (
  duration_seconds between 1 and 86400 and duration_seconds <= extract(epoch from ended_at - started_at) + 1
) not valid;
alter table public.study_sessions add constraint session_text_lengths check (length(note) <= 2000 and length(subject) <= 120) not valid;
create policy study_sessions_update_own on public.study_sessions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table public.tasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200), completed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.study_sessions add constraint study_sessions_task_fk foreign key(task_id) references public.tasks(id) on delete set null;
create index tasks_user_created on public.tasks(user_id, created_at desc);
alter table public.tasks enable row level security;
create policy tasks_own on public.tasks for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create table public.daily_goals (
  user_id uuid not null default auth.uid() references auth.users on delete cascade, day date not null,
  seconds integer not null check (seconds between 1 and 86400), primary key(user_id, day)
);
alter table public.daily_goals enable row level security;
create policy goals_own on public.daily_goals for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Codes from the old app become names, never reusable credentials. Existing circles retain members.
create table public.study_groups (id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 60), owner_id uuid not null references auth.users on delete cascade, created_at timestamptz not null default now());
create table public.group_members (user_id uuid primary key references auth.users on delete cascade, group_id uuid not null references public.study_groups on delete cascade);
create index group_members_group on public.group_members(group_id);
create table public.group_invites (id uuid primary key default gen_random_uuid(), group_id uuid not null references public.study_groups on delete cascade, token text not null unique default replace(gen_random_uuid()::text,'-',''), expires_at timestamptz not null default now() + interval '7 days', revoked boolean not null default false);
alter table public.study_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
create policy membership_own on public.group_members for select to authenticated using (user_id = (select auth.uid()));
-- Other group tables deliberately have no direct access policies. RPCs below check membership/ownership.
do $$ declare circle record; gid uuid; begin
  for circle in select group_code, (array_agg(id order by created_at,id))[1] owner_id from public.profiles where nullif(trim(group_code),'') is not null group by group_code loop
    insert into public.study_groups(name,owner_id) values(left(circle.group_code,60),circle.owner_id) returning id into gid;
    insert into public.group_members(user_id,group_id) select id,gid from public.profiles where group_code=circle.group_code;
  end loop;
end $$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,display_name) values(new.id, coalesce(nullif(left(trim(new.raw_user_meta_data->>'display_name'),80),''),split_part(new.email,'@',1))) on conflict(id) do nothing;
  return new;
end $$;

create or replace function public.save_study_session(session_id uuid, session_start timestamptz, session_end timestamptz, seconds integer, timer_mode text, session_note text default null, session_subject text default null, session_task uuid default null)
returns public.study_sessions language plpgsql security invoker set search_path = '' as $$
declare result public.study_sessions; begin
  if auth.uid() is null then raise exception 'Sign in to save a session.'; end if;
  select * into result from public.study_sessions where id=session_id and user_id=auth.uid();
  if result.id is not null then return result; end if;
  if session_end > now() + interval '5 minutes' then raise exception 'Session end cannot be in the future.'; end if;
  -- A task may have been deleted on another device while the timer ran. Keep the study session and subject.
  if session_task is not null and not exists(select 1 from public.tasks where id=session_task and user_id=auth.uid()) then session_task := null; end if;
  insert into public.study_sessions(id,user_id,started_at,ended_at,duration_seconds,mode,note,subject,task_id)
    values(session_id,auth.uid(),session_start,session_end,seconds,timer_mode,session_note,session_subject,session_task) on conflict(id) do nothing;
  select * into result from public.study_sessions where id=session_id and user_id=auth.uid();
  if result.id is null then raise exception 'This session ID is unavailable.'; end if;
  return result;
end $$;

-- All metrics and leaderboard ranges use the same stored profile timezone.
-- Sessions crossing midnight are credited to their start day, including their active duration only.
create or replace function public.get_study_summary() returns jsonb language sql stable security invoker set search_path = '' as $$
with pref as (select timezone as tz from public.profiles where id=auth.uid()),
clock as (select (now() at time zone coalesce((select tz from pref),'Asia/Kolkata'))::date as today),
daily as (select (started_at at time zone coalesce((select tz from pref),'Asia/Kolkata'))::date as day, sum(duration_seconds)::bigint as seconds from public.study_sessions where user_id=auth.uid() group by 1),
islands as (select day, day - (row_number() over(order by day))::int as island from daily where seconds > 0 and day <= (select today from clock)),
streaks as (select count(*)::int length,max(day) last_day from islands group by island)
select jsonb_build_object(
  'timezone',coalesce((select tz from pref),'Asia/Kolkata'), 'today',(select today from clock),
  'total_seconds',coalesce((select sum(seconds) from daily),0), 'first_day',(select min(day) from daily),
  'today_seconds',coalesce((select seconds from daily where day=(select today from clock)),0),
  'week_seconds',coalesce((select sum(seconds) from daily where day between date_trunc('week',(select today from clock))::date and (select today from clock)),0),
  'month_seconds',coalesce((select sum(seconds) from daily where day between date_trunc('month',(select today from clock))::date and (select today from clock)),0),
  'current_streak',coalesce((select max(length) from streaks where last_day >= (select today-1 from clock)),0),
  'best_streak',coalesce((select max(length) from streaks),0),
  'days',coalesce((select jsonb_agg(jsonb_build_object('date',d.day,'seconds',coalesce(daily.seconds,0)) order by d.day) from (select (select today from clock)-n as day from generate_series(0,55) n) d left join daily on daily.day=d.day),'[]'::jsonb)
);
$$;

create or replace function public.manage_group(action text, value text default '') returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); gid uuid; grp public.study_groups; invitation public.group_invites; begin
  if uid is null then raise exception 'Sign in to manage your group.'; end if;
  -- Serialize membership changes, including concurrent create/join requests for one user.
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select group_id into gid from public.group_members where user_id=uid;
  if action='create' then
    if gid is not null then raise exception 'Leave your current group first.'; end if;
    insert into public.study_groups(name,owner_id) values(trim(value),uid) returning id into gid;
    insert into public.group_members values(uid,gid);
  elsif action='join' then
    if gid is not null then raise exception 'Leave your current group first.'; end if;
    select * into invitation from public.group_invites where token=trim(value) and not revoked and expires_at>now() for update;
    if invitation.id is null then raise exception 'Invitation is invalid, expired, or revoked.'; end if;
    gid := invitation.group_id;
    insert into public.group_members values(uid,gid);
  elsif action='leave' then
    if exists(select 1 from public.study_groups where id=gid and owner_id=uid) then
      if exists(select 1 from public.group_members where group_id=gid and user_id<>uid) then raise exception 'The group owner must remain while other members belong to the group.'; end if;
      delete from public.study_groups where id=gid;
    else delete from public.group_members where user_id=uid; end if;
    gid := null;
  elsif action in ('invite','revoke') then
    if not exists(select 1 from public.study_groups where id=gid and owner_id=uid) then raise exception 'Only the group owner can manage invitations.'; end if;
    if action='invite' then
      update public.group_invites set revoked=true where group_id=gid;
      insert into public.group_invites(group_id) values(gid);
    else update public.group_invites set revoked=true where group_id=gid; end if;
  elsif action <> 'get' then raise exception 'Unknown group action.';
  end if;
  select * into grp from public.study_groups where id=gid;
  if grp.id is null then return null; end if;
  return jsonb_build_object('id',grp.id,'name',grp.name,'is_owner',grp.owner_id=uid,
    'member_count',(select count(*) from public.group_members where group_id=gid),
    'invite',case when grp.owner_id=uid then (select jsonb_build_object('token',token,'expires_at',expires_at) from public.group_invites where group_id=gid and not revoked and expires_at>now() order by expires_at desc limit 1) else null end);
end $$;

drop function public.get_group_leaderboard(text);
create function public.get_group_leaderboard(range_key text default 'week') returns table(user_id uuid,display_name text,group_code text,total_seconds bigint,total_hours numeric,rank_number bigint)
language sql stable security definer set search_path = '' as $$
with viewer as (select m.group_id,p.timezone from public.group_members m join public.profiles p on p.id=m.user_id where m.user_id=auth.uid()),
bounds as (select case range_key when 'today' then date_trunc('day',now() at time zone timezone) at time zone timezone when 'week' then date_trunc('week',now() at time zone timezone) at time zone timezone when 'month' then date_trunc('month',now() at time zone timezone) at time zone timezone else null end as start from viewer),
totals as (select p.id,p.display_name,g.name,coalesce(sum(s.duration_seconds),0)::bigint seconds from viewer v join public.group_members m on m.group_id=v.group_id join public.profiles p on p.id=m.user_id join public.study_groups g on g.id=m.group_id left join public.study_sessions s on s.user_id=p.id and s.started_at<=now() and ((select start from bounds) is null or s.started_at >= (select start from bounds)) group by p.id,p.display_name,g.name)
select id,display_name,name,seconds,seconds::numeric/3600,rank() over(order by seconds desc) from totals order by seconds desc,display_name,id;
$$;

-- Enforce timezones and future dates on direct writes as well as RPC calls.
create function public.validate_profile_timezone() returns trigger language plpgsql set search_path = '' as $$ begin
 if not exists(select 1 from pg_timezone_names where name=new.timezone) then raise exception 'Choose a valid timezone.'; end if;
 return new; end $$;
create trigger validate_profile_timezone before insert or update on public.profiles for each row execute function public.validate_profile_timezone();
create function public.validate_session() returns trigger language plpgsql set search_path = '' as $$ begin
 if new.ended_at > now()+interval '5 minutes' then raise exception 'Session end cannot be in the future.'; end if;
 if new.task_id is not null and not exists(select 1 from public.tasks where id=new.task_id and user_id=new.user_id) then raise exception 'Task must belong to the session owner.'; end if;
 return new; end $$;
create trigger validate_session before insert or update on public.study_sessions for each row execute function public.validate_session();

revoke all on function public.manage_group(text,text) from public,anon;
revoke all on function public.get_group_leaderboard(text) from public,anon;
revoke all on function public.get_study_summary() from public,anon;
revoke all on function public.save_study_session(uuid,timestamptz,timestamptz,integer,text,text,text,uuid) from public,anon;
grant execute on function public.manage_group(text,text), public.get_group_leaderboard(text), public.get_study_summary(), public.save_study_session(uuid,timestamptz,timestamptz,integer,text,text,text,uuid) to authenticated;
grant select,insert,update,delete on public.tasks,public.daily_goals to authenticated;
create index if not exists study_sessions_history_cursor on public.study_sessions(user_id, started_at desc, id desc);
create function public.get_session_history(after_start timestamptz default null, after_id uuid default null, filter_start date default null, filter_end date default null, search_text text default '', page_size integer default 50)
returns setof public.study_sessions language sql stable security invoker set search_path = '' as $$
 select s.* from public.study_sessions s
 where s.user_id=auth.uid()
 and (after_start is null or (s.started_at,s.id)<(after_start,after_id))
 and (filter_start is null or s.started_at >= filter_start::timestamp at time zone coalesce((select timezone from public.profiles where id=auth.uid()),'Asia/Kolkata'))
 and (filter_end is null or s.started_at < (filter_end+1)::timestamp at time zone coalesce((select timezone from public.profiles where id=auth.uid()),'Asia/Kolkata'))
 and (search_text='' or position(lower(search_text) in lower(coalesce(s.subject,'') || ' ' || coalesce(s.note,''))) > 0)
 order by s.started_at desc,s.id desc limit greatest(1,least(page_size,500));
$$;
revoke all on function public.get_session_history(timestamptz,uuid,date,date,text,integer) from public,anon;
grant execute on function public.get_session_history(timestamptz,uuid,date,date,text,integer) to authenticated;
commit;
