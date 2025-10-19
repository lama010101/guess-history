-- Fix session player helper functions to bypass RLS recursion
-- Date: 2025-10-19

BEGIN;

-- Drop policies that reference helper functions to avoid dependency errors
DROP POLICY IF EXISTS session_players_select ON public.session_players;
DROP POLICY IF EXISTS session_players_insert_self ON public.session_players;
DROP POLICY IF EXISTS session_players_update_self ON public.session_players;
DROP POLICY IF EXISTS session_players_delete_self ON public.session_players;
DROP POLICY IF EXISTS sp_select_participants ON public.session_players;
DROP POLICY IF EXISTS sp_insert_self ON public.session_players;
DROP POLICY IF EXISTS sp_update_self_or_host ON public.session_players;
DROP POLICY IF EXISTS sp_delete_self_or_host ON public.session_players;
DROP POLICY IF EXISTS participants_select_sync_room_players ON public.sync_room_players;
DROP POLICY IF EXISTS participants_select_sync_round_scores ON public.sync_round_scores;
DROP POLICY IF EXISTS round_results_select ON public.round_results;
DROP POLICY IF EXISTS sync_round_scores_select ON public.sync_round_scores;
DROP POLICY IF EXISTS sync_room_players_select ON public.sync_room_players;
DROP POLICY IF EXISTS round_hints_select ON public.round_hints;

-- Replace helper functions with SECURITY DEFINER plpgsql versions that disable RLS during execution
DROP FUNCTION IF EXISTS public.room_participant_has_access(uuid);
DROP FUNCTION IF EXISTS public.room_participant_has_access(text);
DROP FUNCTION IF EXISTS public.is_room_host(uuid);
DROP FUNCTION IF EXISTS public.is_room_host(text);
DROP FUNCTION IF EXISTS public.is_room_participant(uuid);
DROP FUNCTION IF EXISTS public.is_room_participant(text);

CREATE FUNCTION public.is_room_participant(room text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
SET row_security = off
AS $$
DECLARE
  has_access boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.session_players
    WHERE room_id = room
      AND user_id = auth.uid()
  )
  INTO has_access;
  RETURN has_access;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_room_participant(text) TO authenticated;

CREATE FUNCTION public.is_room_participant(room uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
SET row_security = off
AS $$
BEGIN
  RETURN public.is_room_participant(room::text);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_room_participant(uuid) TO authenticated, anon;

CREATE FUNCTION public.is_room_host(room text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
SET row_security = off
AS $$
DECLARE
  is_host boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.session_players
    WHERE room_id = room
      AND user_id = auth.uid()
      AND is_host = TRUE
  )
  INTO is_host;
  RETURN is_host;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_room_host(text) TO authenticated;

CREATE FUNCTION public.is_room_host(room uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
SET row_security = off
AS $$
BEGIN
  RETURN public.is_room_host(room::text);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_room_host(uuid) TO authenticated, anon;

CREATE FUNCTION public.room_participant_has_access(room text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
SET row_security = off
AS $$
BEGIN
  RETURN public.is_room_participant(room);
END;
$$;

GRANT EXECUTE ON FUNCTION public.room_participant_has_access(text) TO authenticated, anon;

CREATE FUNCTION public.room_participant_has_access(room uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
SET row_security = off
AS $$
BEGIN
  RETURN public.is_room_participant(room::text);
END;
$$;

GRANT EXECUTE ON FUNCTION public.room_participant_has_access(uuid) TO authenticated, anon;

-- Restore policies using the rebuilt helpers
-- IMPORTANT: Avoid recursion on session_players by using self-only policies.
CREATE POLICY session_players_select
  ON public.session_players
  FOR SELECT
  USING (
    auth.uid() = user_id
  );

CREATE POLICY session_players_insert_self
  ON public.session_players
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

CREATE POLICY session_players_update_self
  ON public.session_players
  FOR UPDATE
  USING (
    auth.uid() = user_id
  )
  WITH CHECK (
    auth.uid() = user_id
  );

CREATE POLICY session_players_delete_self
  ON public.session_players
  FOR DELETE
  USING (
    auth.uid() = user_id
  );

CREATE POLICY round_results_select
  ON public.round_results
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      room_id IS NOT NULL
      AND public.room_participant_has_access(room_id)
    )
  );

CREATE POLICY sync_round_scores_select
  ON public.sync_round_scores
  FOR SELECT
  USING (
    room_id IS NOT NULL
    AND public.room_participant_has_access(room_id)
  );

CREATE POLICY sync_room_players_select
  ON public.sync_room_players
  FOR SELECT
  USING (
    room_id IS NOT NULL
    AND public.room_participant_has_access(room_id)
  );

CREATE POLICY round_hints_select
  ON public.round_hints
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      round_id LIKE 'gh:%'
      AND public.room_participant_has_access(
        split_part(round_id, ':', 2)
      )
    )
  );

COMMIT;
