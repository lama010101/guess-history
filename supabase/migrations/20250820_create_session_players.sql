-- Migration: Create session_players for multiplayer room membership
-- Date: 2025-08-20

BEGIN;

CREATE TABLE IF NOT EXISTS public.session_players (
  room_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_session_players_room ON public.session_players(room_id);
CREATE INDEX IF NOT EXISTS idx_session_players_user ON public.session_players(user_id);

-- Enable RLS and set policies
ALTER TABLE public.session_players ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to SELECT rows (used by RPCs and RLS checks on other tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_players' AND policyname='sp_select_all_authenticated'
  ) THEN
    CREATE POLICY sp_select_all_authenticated ON public.session_players
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- Insert: only allow inserting yourself
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_players' AND policyname='sp_insert_own'
  ) THEN
    CREATE POLICY sp_insert_own ON public.session_players
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Update: only allow updating your own row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_players' AND policyname='sp_update_own'
  ) THEN
    CREATE POLICY sp_update_own ON public.session_players
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Delete: only allow deleting your own row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_players' AND policyname='sp_delete_own'
  ) THEN
    CREATE POLICY sp_delete_own ON public.session_players
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

COMMIT;
