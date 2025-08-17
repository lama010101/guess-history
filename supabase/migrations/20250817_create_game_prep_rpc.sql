-- Migration: Game preparation RPC and tables
-- Date: 2025-08-17

-- Ensure required extension
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- 1) Ensure images has RLS and allow selecting only ready images to anon/auth
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'images'
  ) THEN
    EXECUTE 'ALTER TABLE public.images ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'images' AND policyname = 'images_select_ready_anon'
    ) THEN
      EXECUTE 'CREATE POLICY images_select_ready_anon ON public.images
        FOR SELECT TO anon USING (ready = true)';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'images' AND policyname = 'images_select_ready_auth'
    ) THEN
      EXECUTE 'CREATE POLICY images_select_ready_auth ON public.images
        FOR SELECT TO authenticated USING (ready = true)';
    END IF;
  END IF;
END $$;

-- 2) Create played_images table to track history per user
CREATE TABLE IF NOT EXISTS public.played_images (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_id uuid NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  played_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, image_id)
);

ALTER TABLE public.played_images ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'played_images' AND policyname = 'played_images_select_own'
  ) THEN
    CREATE POLICY played_images_select_own ON public.played_images
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'played_images' AND policyname = 'played_images_insert_own'
  ) THEN
    CREATE POLICY played_images_insert_own ON public.played_images
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Helpful index for exclusion checks
CREATE INDEX IF NOT EXISTS idx_played_images_user ON public.played_images(user_id, image_id);

-- 3) RPC: create_game_session_and_pick_images
-- Picks p_count eligible images (ready, not in recent history) using UUID-range sampling
-- Persists to game_sessions if p_room_id is provided and returns rows (image_id, order_index)
CREATE OR REPLACE FUNCTION public.create_game_session_and_pick_images(
  p_count integer,
  p_user_id uuid DEFAULT NULL,
  p_room_id text DEFAULT NULL,
  p_seed uuid DEFAULT gen_random_uuid()
)
RETURNS TABLE(image_id uuid, order_index integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_candidate_ids uuid[];
  v_i integer := 1;
BEGIN
  IF p_count IS NULL OR p_count <= 0 THEN
    RETURN;
  END IF;

  -- Build eligible set (ready and excluding player's history if user is provided)
  WITH eligible AS (
    SELECT i.id
    FROM public.images i
    WHERE i.ready = true
      AND NOT EXISTS (
        SELECT 1 FROM public.played_images p
        WHERE p.user_id = p_user_id AND p.image_id = i.id
      )
  ),
  first_pass AS (
    SELECT id FROM eligible WHERE id >= p_seed ORDER BY id ASC LIMIT (p_count * 3)
  ),
  second_pass AS (
    SELECT id FROM eligible WHERE id <  p_seed ORDER BY id ASC LIMIT (p_count * 3)
  ),
  combined AS (
    SELECT id FROM first_pass
    UNION ALL
    SELECT id FROM second_pass
  )
  SELECT ARRAY(SELECT DISTINCT id FROM combined LIMIT p_count) INTO v_candidate_ids;

  -- Persist room session if requested
  IF p_room_id IS NOT NULL AND array_length(v_candidate_ids, 1) IS NOT NULL THEN
    INSERT INTO public.game_sessions(room_id, seed, image_ids, current_round_number, started_at)
    VALUES (p_room_id, p_seed::text, ARRAY(SELECT (x)::text FROM unnest(v_candidate_ids) AS x), 1, now())
    ON CONFLICT (room_id) DO UPDATE
      SET seed = EXCLUDED.seed,
          image_ids = EXCLUDED.image_ids,
          -- IMPORTANT: on new session, reset round number to 1, not increment
          current_round_number = 1,
          started_at = EXCLUDED.started_at;
  END IF;

  -- Return ordered list using deterministic hash on seed+id
  IF array_length(v_candidate_ids, 1) IS NOT NULL THEN
    RETURN QUERY
    SELECT x.id, row_number() OVER (ORDER BY md5(p_seed::text || x.id::text)) AS order_index
    FROM unnest(v_candidate_ids) AS x(id);
  END IF;

  RETURN;
END;
$$;

-- Allow execution from anon/auth (function is SECURITY DEFINER and enforces its own checks)
REVOKE ALL ON FUNCTION public.create_game_session_and_pick_images(integer, uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_game_session_and_pick_images(integer, uuid, text, uuid) TO anon, authenticated;
