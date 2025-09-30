-- Migration: Create sync_round_scores table for Compete Sync scoreboard
-- Date: 2025-09-25

BEGIN;

CREATE TABLE IF NOT EXISTS public.sync_room_players (
  room_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS sync_room_players_room_idx
  ON public.sync_room_players(room_id);

ALTER TABLE public.sync_room_players ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sync_room_players'
      AND policyname = 'srp_select_room_players'
  ) THEN
    CREATE POLICY srp_select_room_players ON public.sync_room_players
      FOR SELECT TO authenticated
      USING (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1
          FROM public.sync_room_players p2
          WHERE p2.room_id = sync_room_players.room_id
            AND p2.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sync_room_players'
      AND policyname = 'srp_upsert_self'
  ) THEN
    CREATE POLICY srp_upsert_self ON public.sync_room_players
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sync_room_players'
      AND policyname = 'srp_update_self'
  ) THEN
    CREATE POLICY srp_update_self ON public.sync_room_players
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sync_room_players'
      AND policyname = 'srp_delete_self'
  ) THEN
    CREATE POLICY srp_delete_self ON public.sync_room_players
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.sync_round_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL,
  round_number integer NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  xp_total numeric NOT NULL DEFAULT 0,
  time_accuracy numeric NOT NULL DEFAULT 0,
  location_accuracy numeric NOT NULL DEFAULT 0,
  distance_km numeric,
  year_difference integer,
  guess_year integer,
  guess_lat double precision,
  guess_lng double precision,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sync_round_scores_room_round_user_idx
  ON public.sync_round_scores(room_id, round_number, user_id);

CREATE INDEX IF NOT EXISTS sync_round_scores_room_round_idx
  ON public.sync_round_scores(room_id, round_number);

ALTER TABLE public.sync_round_scores ENABLE ROW LEVEL SECURITY;

-- Allow players in the room (and the owner of the row) to read scoreboard entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sync_round_scores'
      AND policyname = 'srs_select_room_players'
  ) THEN
    CREATE POLICY srs_select_room_players ON public.sync_round_scores
      FOR SELECT TO authenticated
      USING (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1 FROM public.sync_room_players srp
          WHERE srp.room_id = sync_round_scores.room_id
            AND srp.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Players can insert their own row for a round
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sync_round_scores'
      AND policyname = 'srs_insert_self'
  ) THEN
    CREATE POLICY srs_insert_self ON public.sync_round_scores
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Players can update their own row (e.g., corrections)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sync_round_scores'
      AND policyname = 'srs_update_self'
  ) THEN
    CREATE POLICY srs_update_self ON public.sync_round_scores
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Players can delete their own row if necessary
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sync_round_scores'
      AND policyname = 'srs_delete_self'
  ) THEN
    CREATE POLICY srs_delete_self ON public.sync_round_scores
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

COMMIT;
