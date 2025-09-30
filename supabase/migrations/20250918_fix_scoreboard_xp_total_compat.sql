-- Migration: Fix scoreboard RPCs to avoid referencing rr.xp_total when absent
-- Date: 2025-09-18

BEGIN;

-- get_round_scoreboard: compute xp_total from xp_where + xp_when (no direct rr.xp_total reference)
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
    COALESCE(rr.xp_where, 0) + COALESCE(rr.xp_when, 0) AS xp_total,
    rr.xp_debt,
    rr.acc_debt,
    rr.distance_km,
    rr.guess_year
  FROM public.session_players sp
  LEFT JOIN public.round_results rr
    ON rr.room_id = sp.room_id
   AND rr.user_id = sp.user_id
   -- p_round_number is 1-based in UI; convert to 0-based for DB
   AND rr.round_index = GREATEST(0, p_round_number - 1)
  WHERE sp.room_id = p_room_id
  ORDER BY COALESCE(rr.score, 0) DESC, COALESCE(rr.accuracy, 0) DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_round_scoreboard(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_round_scoreboard(text, integer) TO authenticated;

-- get_final_scoreboard: aggregate using xp_where + xp_when
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
    COALESCE(SUM(COALESCE(rr.xp_where, 0) + COALESCE(rr.xp_when, 0)), 0) AS total_xp,
    COALESCE(SUM(rr.xp_debt), 0) AS total_xp_debt,
    COALESCE(SUM(COALESCE(rr.xp_where, 0) + COALESCE(rr.xp_when, 0)) - SUM(rr.xp_debt), 0) AS net_xp,
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
