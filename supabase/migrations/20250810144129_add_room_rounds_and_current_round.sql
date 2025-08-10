-- Create table to persist per-room per-round timer state
create table if not exists public.room_rounds (
  room_id text not null,
  round_number integer not null,
  started_at timestamptz not null,
  duration_sec integer not null,
  constraint room_rounds_pkey primary key (room_id, round_number)
);

-- Helpful indexes
create index if not exists room_rounds_room_idx on public.room_rounds (room_id);
 create index if not exists room_rounds_started_idx on public.room_rounds (started_at);

 -- Ensure server-side defaults and constraints (works for both fresh and existing tables)
 alter table public.room_rounds
   alter column started_at set default now();

 alter table public.room_rounds
   add constraint if not exists room_rounds_duration_check check (duration_sec > 0);

-- Enable RLS and add permissive authenticated policies
alter table public.room_rounds enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'room_rounds' and policyname = 'Room rounds allow authenticated read'
  ) then
    create policy "Room rounds allow authenticated read" on public.room_rounds
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'room_rounds' and policyname = 'Room rounds allow authenticated insert'
  ) then
    create policy "Room rounds allow authenticated insert" on public.room_rounds
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'room_rounds' and policyname = 'Room rounds allow authenticated update'
  ) then
    create policy "Room rounds allow authenticated update" on public.room_rounds
      for update
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

-- Protect immutable fields from being changed by accidental upserts/updates
create or replace function public.room_rounds_protect_immutable()
returns trigger
language plpgsql
as $$
begin
  -- prevent changes after initial insert
  if TG_OP = 'UPDATE' then
    new.started_at := old.started_at;
    new.duration_sec := old.duration_sec;
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_room_rounds_protect_immutable'
  ) then
    create trigger trg_room_rounds_protect_immutable
    before update on public.room_rounds
    for each row
    execute function public.room_rounds_protect_immutable();
  end if;
end $$;

-- Add current round tracking to game_sessions
alter table public.game_sessions
  add column if not exists current_round_number integer;

-- Optional: index for quick lookups by room
create index if not exists game_sessions_room_idx on public.game_sessions (room_id);
