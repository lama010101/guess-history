-- Migration: Add fallback to ensure at-least-p_count images for multiplayer prep
-- Date: 2025-10-12

CREATE OR REPLACE FUNCTION public.create_game_session_and_pick_images(
  p_count integer,
  p_user_id uuid DEFAULT NULL,
  p_room_id text DEFAULT NULL,
  p_seed uuid DEFAULT gen_random_uuid(),
  p_min_year integer DEFAULT NULL,
  p_max_year integer DEFAULT NULL
)
RETURNS TABLE(image_id uuid, order_index integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_primary uuid[];
  v_fallback uuid[];
  v_out uuid[];
BEGIN
  IF p_count IS NULL OR p_count <= 0 THEN
    RETURN;
  END IF;

  -- Primary: respect history if p_user_id provided
  WITH eligible AS (
    SELECT i.id
    FROM public.images i
    WHERE i.ready = true
      AND (p_min_year IS NULL OR i.year >= p_min_year)
      AND (p_max_year IS NULL OR i.year <= p_max_year)
      AND NOT EXISTS (
        SELECT 1 FROM public.played_images p
        WHERE (p_user_id IS NOT NULL AND p.user_id = p_user_id AND p.image_id = i.id)
      )
  )
  SELECT ARRAY(
    SELECT id FROM eligible
    ORDER BY md5(p_seed::text || id::text)
    LIMIT p_count
  ) INTO v_primary;

  -- Fallback: ignore history if not enough
  IF COALESCE(array_length(v_primary, 1), 0) < p_count THEN
    WITH eligible_any AS (
      SELECT i.id
      FROM public.images i
      WHERE i.ready = true
        AND (p_min_year IS NULL OR i.year >= p_min_year)
        AND (p_max_year IS NULL OR i.year <= p_max_year)
    )
    SELECT ARRAY(
      SELECT id FROM eligible_any
      ORDER BY md5(p_seed::text || id::text)
      LIMIT p_count
    ) INTO v_fallback;
    v_out := v_fallback;
  ELSE
    v_out := v_primary;
  END IF;

  -- Persist session if requested
  IF p_room_id IS NOT NULL AND array_length(v_out, 1) IS NOT NULL THEN
    INSERT INTO public.game_sessions(room_id, seed, image_ids, current_round_number, started_at)
    VALUES (p_room_id, p_seed::text, ARRAY(SELECT (x)::text FROM unnest(v_out) AS x), 1, now())
    ON CONFLICT (room_id) DO UPDATE
      SET seed = EXCLUDED.seed,
          image_ids = EXCLUDED.image_ids,
          current_round_number = 1,
          started_at = EXCLUDED.started_at;
  END IF;

  -- Return deterministic order
  IF array_length(v_out, 1) IS NOT NULL THEN
    RETURN QUERY
    SELECT x.id AS image_id,
           (row_number() OVER (ORDER BY md5(p_seed::text || x.id::text)))::integer AS order_index
    FROM unnest(v_out) AS x(id);
  END IF;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.create_game_session_and_pick_images(integer, uuid, text, uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_game_session_and_pick_images(integer, uuid, text, uuid, integer, integer) TO anon, authenticated;
