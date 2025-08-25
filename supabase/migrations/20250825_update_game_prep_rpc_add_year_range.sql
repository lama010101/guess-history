-- Migration: Update game prep RPC to support year range filtering
-- Date: 2025-08-25

-- Update RPC: create_game_session_and_pick_images
-- Add optional p_min_year and p_max_year params to filter eligible images by year
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
      AND (p_min_year IS NULL OR i.year >= p_min_year)
      AND (p_max_year IS NULL OR i.year <= p_max_year)
      AND NOT EXISTS (
        SELECT 1 FROM public.played_images p
        WHERE p_user_id IS NOT NULL AND p.user_id = p_user_id AND p.image_id = i.id
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

-- Update grants to new function signature
REVOKE ALL ON FUNCTION public.create_game_session_and_pick_images(integer, uuid, text, uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_game_session_and_pick_images(integer, uuid, text, uuid, integer, integer) TO anon, authenticated;
