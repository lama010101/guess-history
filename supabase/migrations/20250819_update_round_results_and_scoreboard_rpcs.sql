-- Migration: Align round_results with multiplayer and add scoreboard RPCs
-- Date: 2025-08-19

BEGIN;

-- Ensure useful extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bump-updated-at helper (idempotent)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- Create table when missing; otherwise ALTER below will enrich it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'round_results'
  ) THEN
    CREATE TABLE public.round_results (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      -- Multiplayer room scope (nullable for solo/legacy)
      room_id text NULL,
      -- Keep existing name for compatibility
      round_index integer NOT NULL,
      image_id uuid NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
      score integer NOT NULL DEFAULT 0,
      accuracy numeric(5,2) NOT NULL DEFAULT 0,
      xp_total integer NOT NULL DEFAULT 0,
      xp_where integer NOT NULL DEFAULT 0,
      xp_when integer NOT NULL DEFAULT 0,
      hints_used integer NOT NULL DEFAULT 0,
      xp_debt integer NOT NULL DEFAULT 0,
      acc_debt integer NOT NULL DEFAULT 0,
      -- Newly aligned fields
      guess_year integer,
      guess_lat double precision,
      guess_lng double precision,
      actual_lat double precision,
      actual_lng double precision,
      distance_km numeric(8,3),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Enrich existing table with missing columns (no-ops if already present)
ALTER TABLE public.round_results ADD COLUMN IF NOT EXISTS room_id text;
ALTER TABLE public.round_results ADD COLUMN IF NOT EXISTS guess_year integer;
ALTER TABLE public.round_results ADD COLUMN IF NOT EXISTS guess_lat double precision;
ALTER TABLE public.round_results ADD COLUMN IF NOT EXISTS guess_lng double precision;
ALTER TABLE public.round_results ADD COLUMN IF NOT EXISTS actual_lat double precision;
ALTER TABLE public.round_results ADD COLUMN IF NOT EXISTS actual_lng double precision;
ALTER TABLE public.round_results ADD COLUMN IF NOT EXISTS distance_km numeric(8,3);
ALTER TABLE public.round_results ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.round_results ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Helpful indexes for scoreboard queries
CREATE INDEX IF NOT EXISTS idx_round_results_room_round ON public.round_results (room_id, round_index);
CREATE INDEX IF NOT EXISTS idx_round_results_room_user  ON public.round_results (room_id, user_id);

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_round_results_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_round_results_set_updated_at
    BEFORE UPDATE ON public.round_results
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- RLS: participant-safe reads; own-only writes
ALTER TABLE public.round_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Select own rows
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='round_results' AND policyname='rr_select_own'
  ) THEN
    CREATE POLICY rr_select_own ON public.round_results
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- Insert own rows only
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='round_results' AND policyname='rr_insert_own'
  ) THEN
    CREATE POLICY rr_insert_own ON public.round_results
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Update own rows only
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='round_results' AND policyname='rr_update_own'
  ) THEN
    CREATE POLICY rr_update_own ON public.round_results
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Delete own rows only
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='round_results' AND policyname='rr_delete_own'
  ) THEN
    CREATE POLICY rr_delete_own ON public.round_results
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- Additional SELECT: any participant in a room can read that room's rows
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='round_results' AND policyname='rr_select_participants_in_room'
  ) THEN
    CREATE POLICY rr_select_participants_in_room ON public.round_results
      FOR SELECT TO authenticated
      USING (
        room_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.session_players sp
          WHERE sp.room_id = round_results.room_id AND sp.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- RPC: get_round_scoreboard(room_id, round_number)
CREATE OR REPLACE FUNCTION public.get_round_scoreboard(
  p_room_id text,
  p_round_number integer
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  score integer,
  accuracy numeric(5,2),
  xp_total integer,
  xp_debt integer,
  acc_debt integer,
  distance_km numeric(8,3),
  guess_year integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Authorization: only room participants may call
  IF NOT EXISTS (
    SELECT 1 FROM public.session_players sp
    WHERE sp.room_id = p_room_id AND sp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not a participant';
  END IF;

  RETURN QUERY
  SELECT
    sp.user_id,
    sp.display_name,
    COALESCE(rr.score, 0) AS score,
    rr.accuracy,
    rr.xp_total,
    rr.xp_debt,
    rr.acc_debt,
    rr.distance_km,
    rr.guess_year
  FROM public.session_players sp
  LEFT JOIN public.round_results rr
    ON rr.room_id = sp.room_id
   AND rr.user_id = sp.user_id
   AND rr.round_index = p_round_number
  WHERE sp.room_id = p_room_id
  ORDER BY COALESCE(rr.score, 0) DESC, COALESCE(rr.accuracy, 0) DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_round_scoreboard(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_round_scoreboard(text, integer) TO authenticated;

-- RPC: get_final_scoreboard(room_id)
CREATE OR REPLACE FUNCTION public.get_final_scoreboard(
  p_room_id text
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  total_score integer,
  total_xp integer,
  total_xp_debt integer,
  net_xp integer,
  rounds_played integer,
  avg_accuracy numeric(5,2),
  net_avg_accuracy numeric(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Authorization: only room participants may call
  IF NOT EXISTS (
    SELECT 1 FROM public.session_players sp
    WHERE sp.room_id = p_room_id AND sp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not a participant';
  END IF;

  RETURN QUERY
  SELECT
    sp.user_id,
    sp.display_name,
    COALESCE(SUM(rr.score), 0) AS total_score,
    COALESCE(SUM(rr.xp_total), 0) AS total_xp,
    COALESCE(SUM(rr.xp_debt), 0) AS total_xp_debt,
    COALESCE(SUM(rr.xp_total) - SUM(rr.xp_debt), 0) AS net_xp,
    COALESCE(COUNT(rr.id), 0) AS rounds_played,
    COALESCE(ROUND(AVG(rr.accuracy)::numeric, 2), 0)::numeric(5,2) AS avg_accuracy,
    COALESCE(ROUND(AVG(GREATEST(0, rr.accuracy - rr.acc_debt))::numeric, 2), 0)::numeric(5,2) AS net_avg_accuracy
  FROM public.session_players sp
  LEFT JOIN public.round_results rr
    ON rr.room_id = sp.room_id
   AND rr.user_id = sp.user_id
  WHERE sp.room_id = p_room_id
  GROUP BY sp.user_id, sp.display_name
  ORDER BY net_xp DESC, total_score DESC, avg_accuracy DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_final_scoreboard(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_final_scoreboard(text) TO authenticated;

COMMIT;
