-- Restore write policies for sync_room_players (dropped in 20251019 but not recreated)
-- Date: 2025-01-01

BEGIN;

-- Recreate INSERT policy for sync_room_players
DROP POLICY IF EXISTS srp_upsert_self ON public.sync_room_players;
CREATE POLICY srp_upsert_self
  ON public.sync_room_players
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Recreate UPDATE policy for sync_room_players
DROP POLICY IF EXISTS srp_update_self ON public.sync_room_players;
CREATE POLICY srp_update_self
  ON public.sync_room_players
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Recreate DELETE policy for sync_room_players
DROP POLICY IF EXISTS srp_delete_self ON public.sync_room_players;
CREATE POLICY srp_delete_self
  ON public.sync_room_players
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

COMMIT;
