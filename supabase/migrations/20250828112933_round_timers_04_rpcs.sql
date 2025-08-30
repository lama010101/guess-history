-- 04_rpcs_round_timers.sql

-- Start or restart a timer for the current user.
-- Upserts (user_id, timer_id), computes end_at on the server.
create or replace function public.start_timer(
  p_timer_id text,
  p_duration_sec integer
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
begin
  if p_duration_sec is null or p_duration_sec <= 0 then
    raise exception 'duration_sec must be positive';
  end if;

  insert into public.round_timers as rt (
    user_id, timer_id, started_at, end_at, duration_sec
  ) values (
    auth.uid(), p_timer_id, now(), now() + (p_duration_sec || ' seconds')::interval, p_duration_sec
  )
  on conflict (user_id, timer_id)
  do update set
    started_at = excluded.started_at,
    end_at = excluded.end_at,
    duration_sec = excluded.duration_sec
  where rt.user_id = auth.uid();

  return query
  select p_timer_id as timer_id,
         rt.end_at,
         now() as server_now,
         rt.duration_sec,
         rt.started_at
  from public.round_timers rt
  where rt.user_id = auth.uid() and rt.timer_id = p_timer_id;
end;
$$;

-- Fetch an existing timer for the current user.
create or replace function public.get_timer(
  p_timer_id text
)
returns table (
  timer_id text,
  end_at timestamptz,
  server_now timestamptz,
  duration_sec integer,
  started_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select rt.timer_id,
         rt.end_at,
         now() as server_now,
         rt.duration_sec,
         rt.started_at
  from public.round_timers rt
  where rt.user_id = auth.uid() and rt.timer_id = p_timer_id;
$$;
