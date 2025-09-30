-- 20250920_update_start_timer_add_user_param.sql
-- Update start_timer to accept an optional p_user_id and use it when present.
-- This allows server-to-server calls (e.g., PartyKit lobby) to create timers under a stable user id.

create or replace function public.start_timer(
  p_timer_id text,
  p_duration_sec integer,
  p_user_id uuid default null
)
returns table (
  timer_id text,
  end_at timestamptz,
  server_now timestamptz,
  duration_sec integer,
  started_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  if p_duration_sec is null or p_duration_sec <= 0 then
    raise exception 'duration_sec must be positive';
  end if;

  v_user := coalesce(p_user_id, auth.uid());
  if v_user is null then
    raise exception 'user_id is required (either p_user_id or auth.uid())';
  end if;

  insert into public.round_timers as rt (
    user_id, timer_id, started_at, end_at, duration_sec
  ) values (
    v_user, p_timer_id, now(), now() + (p_duration_sec || ' seconds')::interval, p_duration_sec
  )
  on conflict (user_id, timer_id)
  do update set
    started_at = excluded.started_at,
    end_at = excluded.end_at,
    duration_sec = excluded.duration_sec
  where rt.user_id = v_user;

  return query
  select p_timer_id as timer_id,
         rt.end_at,
         now() as server_now,
         rt.duration_sec,
         rt.started_at
  from public.round_timers rt
  where rt.user_id = v_user and rt.timer_id = p_timer_id;
end;
$$;
