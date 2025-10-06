-- Hybrid Sync Phase 0 (2025-10-05)
-- 1. Extend room_rounds with finalized_payload for orchestrator snapshots
-- 2. Create sync_guess_events audit table for submission notifications
-- 3. Provide fetch_round_state helper for reconnect/recovery flows

-- 1) Extend room_rounds with finalized payload snapshot
alter table public.room_rounds
  add column if not exists finalized_payload jsonb;

comment on column public.room_rounds.finalized_payload is 'Authoritative round completion snapshot emitted by orchestrator';

-- 2) sync_guess_events table
create table if not exists public.sync_guess_events (
  room_id text not null,
  round_index integer not null check (round_index >= 0),
  player_id uuid not null,
  submitted_at timestamptz not null default now(),
  constraint sync_guess_events_pkey primary key (room_id, round_index, player_id)
);

create index if not exists sync_guess_events_room_round_idx
  on public.sync_guess_events (room_id, round_index, submitted_at);

alter table public.sync_guess_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sync_guess_events'
      and policyname = 'Sync guess events readable by session members'
  ) then
    create policy "Sync guess events readable by session members" on public.sync_guess_events
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.session_players sp
          where sp.room_id = sync_guess_events.room_id
            and sp.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- 3) fetch_round_state helper
create or replace function public.fetch_round_state(
  p_room_id text,
  p_round_index integer
)
returns table (
  phase text,
  started_at timestamptz,
  duration_sec integer,
  finalized_payload jsonb,
  submitted_player_ids uuid[],
  submitted_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round_number integer := coalesce(p_round_index, 0) + 1;
  v_started_at timestamptz;
  v_duration integer;
  v_final_payload jsonb;
  v_phase text := 'pending';
  v_player_ids uuid[] := array[]::uuid[];
  v_player_count integer := 0;
begin
  select rr.started_at, rr.duration_sec, rr.finalized_payload
    into v_started_at, v_duration, v_final_payload
    from public.room_rounds rr
   where rr.room_id = p_room_id
     and rr.round_number = v_round_number;

  if found then
    if v_final_payload is not null then
      v_phase := 'finalized';
    else
      v_phase := 'active';
    end if;
  end if;

  select coalesce(array_agg(player_id order by submitted_at), array[]::uuid[]), count(*)
    into v_player_ids, v_player_count
    from public.sync_guess_events sge
   where sge.room_id = p_room_id
     and sge.round_index = coalesce(p_round_index, 0);

  return query
    select v_phase,
           v_started_at,
           v_duration,
           v_final_payload,
           v_player_ids,
           v_player_count;
end;
$$;

grant execute on function public.fetch_round_state(text, integer) to authenticated;
