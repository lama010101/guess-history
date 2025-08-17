-- Create table to persist deterministic image order per multiplayer room
create table if not exists public.game_sessions (
  room_id text primary key,
  seed text not null,
  image_ids text[] not null,
  current_round_number integer not null default 1,
  started_at timestamptz not null default now()
);

-- Helpful index
create index if not exists idx_game_sessions_started_at on public.game_sessions (started_at desc);

-- Enable Row Level Security
alter table public.game_sessions enable row level security;

-- Policies: allow authenticated users to read/write (multiplayer sessions are shared by room code)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'game_sessions'
      AND policyname = 'game_sessions_select_auth'
  ) THEN
    CREATE POLICY game_sessions_select_auth
      ON public.game_sessions FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'game_sessions'
      AND policyname = 'game_sessions_insert_auth'
  ) THEN
    CREATE POLICY game_sessions_insert_auth
      ON public.game_sessions FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'game_sessions'
      AND policyname = 'game_sessions_update_auth'
  ) THEN
    CREATE POLICY game_sessions_update_auth
      ON public.game_sessions FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
