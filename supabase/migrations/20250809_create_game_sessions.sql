-- Create table to persist deterministic image order per multiplayer room
create table if not exists public.game_sessions (
  room_id text primary key,
  seed text not null,
  image_ids text[] not null,
  started_at timestamptz not null default now()
);

-- Helpful index
create index if not exists idx_game_sessions_started_at on public.game_sessions (started_at desc);

-- Enable Row Level Security
alter table public.game_sessions enable row level security;

-- Policies: allow authenticated users to read/write (multiplayer sessions are shared by room code)
create policy if not exists "game_sessions_select_auth"
  on public.game_sessions for select
  to authenticated
  using (true);

create policy if not exists "game_sessions_insert_auth"
  on public.game_sessions for insert
  to authenticated
  with check (true);

create policy if not exists "game_sessions_update_auth"
  on public.game_sessions for update
  to authenticated
  using (true)
  with check (true);
