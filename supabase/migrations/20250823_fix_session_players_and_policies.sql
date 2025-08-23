-- Fix/standardize session_players schema and policies for multiplayer
-- Date: 2025-08-23

BEGIN;

-- Ensure helper exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- Ensure table exists with required columns
CREATE TABLE IF NOT EXISTS public.session_players (
  room_id      TEXT    NOT NULL,
  user_id      UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  is_host      BOOLEAN NOT NULL DEFAULT FALSE,
  ready        BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inserted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT session_players_pkey PRIMARY KEY (room_id, user_id)
);

-- Backfill columns for existing deployments (no-op if present)
ALTER TABLE public.session_players ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.session_players ADD COLUMN IF NOT EXISTS is_host BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.session_players ADD COLUMN IF NOT EXISTS ready BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.session_players ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.session_players ADD COLUMN IF NOT EXISTS inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.session_players ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS session_players_room_idx ON public.session_players (room_id);
CREATE INDEX IF NOT EXISTS session_players_room_host_idx ON public.session_players (room_id, is_host);
CREATE INDEX IF NOT EXISTS session_players_room_ready_idx ON public.session_players (room_id, ready);

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_session_players_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_session_players_set_updated_at
    BEFORE UPDATE ON public.session_players
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Enable RLS and standardize policies
ALTER TABLE public.session_players ENABLE ROW LEVEL SECURITY;

-- Drop legacy permissive policies if any (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_players' AND policyname='sp_select_all_authenticated'
  ) THEN
    DROP POLICY sp_select_all_authenticated ON public.session_players;
  END IF;
END $$;

-- Participant SELECT: anyone in the same room can read roster
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_players' AND policyname='sp_select_participants'
  ) THEN
    CREATE POLICY sp_select_participants ON public.session_players
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.session_players sp2
          WHERE sp2.room_id = session_players.room_id AND sp2.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Insert: only insert yourself
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_players' AND policyname='sp_insert_self'
  ) THEN
    CREATE POLICY sp_insert_self ON public.session_players
      FOR INSERT TO authenticated
      WITH CHECK ( user_id = auth.uid() );
  END IF;
END $$;

-- Update: self or room host may update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_players' AND policyname='sp_update_self_or_host'
  ) THEN
    CREATE POLICY sp_update_self_or_host ON public.session_players
      FOR UPDATE TO authenticated
      USING (
        user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.session_players h
          WHERE h.room_id = session_players.room_id AND h.user_id = auth.uid() AND h.is_host = TRUE
        )
      )
      WITH CHECK (
        user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.session_players h
          WHERE h.room_id = session_players.room_id AND h.user_id = auth.uid() AND h.is_host = TRUE
        )
      );
  END IF;
END $$;

-- Delete: self or room host may delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_players' AND policyname='sp_delete_self_or_host'
  ) THEN
    CREATE POLICY sp_delete_self_or_host ON public.session_players
      FOR DELETE TO authenticated
      USING (
        user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.session_players h
          WHERE h.room_id = session_players.room_id AND h.user_id = auth.uid() AND h.is_host = TRUE
        )
      );
  END IF;
END $$;

COMMIT;
