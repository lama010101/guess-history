-- Migration: Add unique index for room-based upserts and supportive indexes
-- Date: 2025-08-21

BEGIN;

-- Ensure game_id exists for legacy/solo scenarios (no-op if already present)
ALTER TABLE public.round_results
  ADD COLUMN IF NOT EXISTS game_id uuid;

-- Supportive index for legacy/solo queries
CREATE INDEX IF NOT EXISTS idx_round_results_game_round
  ON public.round_results (game_id, round_index);

-- Unique index to enable ON CONFLICT upserts for multiplayer room scope
-- Note: UNIQUE treats NULLs as distinct, so solo (NULL room_id) rows are unaffected
CREATE UNIQUE INDEX IF NOT EXISTS uniq_round_results_room_user_round
  ON public.round_results (room_id, user_id, round_index);

-- Unique index for legacy/solo upserts (matches onConflict 'user_id,game_id,round_index')
CREATE UNIQUE INDEX IF NOT EXISTS uniq_round_results_user_game_round
  ON public.round_results (user_id, game_id, round_index);

COMMIT;
