BEGIN;

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
  guess_year integer,
  hints_used integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
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
   AND rr.round_index = p_round_number
  WHERE sp.room_id = p_room_id
  ORDER BY COALESCE(rr.score, 0) DESC, COALESCE(rr.accuracy, 0) DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_round_scoreboard(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_round_scoreboard(text, integer) TO authenticated;

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
  net_avg_accuracy numeric(5,2),
  total_hints_used integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
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
    COALESCE(SUM(rr.score)::integer, 0) AS total_score,
    COALESCE(SUM(rr.xp_total)::integer, 0) AS total_xp,
    COALESCE(SUM(rr.xp_debt)::integer, 0) AS total_xp_debt,
    (COALESCE(SUM(rr.xp_total), 0) - COALESCE(SUM(rr.xp_debt), 0))::integer AS net_xp,
    COUNT(rr.id)::integer AS rounds_played,
    COALESCE(ROUND(AVG(rr.accuracy)::numeric, 2), 0)::numeric(5,2) AS avg_accuracy,
    COALESCE(ROUND(AVG(GREATEST(0, rr.accuracy - rr.acc_debt))::numeric, 2), 0)::numeric(5,2) AS net_avg_accuracy,
    COALESCE(SUM(rr.hints_used)::integer, 0) AS total_hints_used
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
