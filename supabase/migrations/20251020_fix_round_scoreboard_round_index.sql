-- Fix get_round_scoreboard to use 0-based round_index while accepting 1-based roundNumber
-- and keep returning hints_used for UI. SECURITY DEFINER so RLS doesn't block cross-user reads.
-- Date: 2025-10-20

BEGIN;

-- Drop prior definition so we can adjust OUT parameters (e.g., hints_used column)
DROP FUNCTION IF EXISTS public.get_round_scoreboard(text, integer);

CREATE FUNCTION public.get_round_scoreboard(
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
  guess_year integer,
  hints_used integer
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
    rr.guess_year,
    COALESCE(rr.hints_used, 0)::integer AS hints_used
  FROM public.session_players sp
  LEFT JOIN public.round_results rr
    ON rr.room_id = sp.room_id
   AND rr.user_id = sp.user_id
   -- IMPORTANT: DB stores 0-based round_index; API receives 1-based p_round_number
   AND rr.round_index = GREATEST(0, p_round_number - 1)
  WHERE sp.room_id = p_room_id
  ORDER BY COALESCE(rr.score, 0) DESC, COALESCE(rr.accuracy, 0) DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_round_scoreboard(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_round_scoreboard(text, integer) TO authenticated;

COMMIT;
