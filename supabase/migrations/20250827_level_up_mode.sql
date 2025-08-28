-- Level Up Mode MVP migration (safe/conditional)
-- Adds profiles.level_up_best_level, games.level, and extends game_mode enum with 'level_up' if present

-- 1) profiles.level_up_best_level
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS level_up_best_level integer NOT NULL DEFAULT 0;

-- 2) games.level (only if games table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'games'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'games' AND column_name = 'level'
    ) THEN
      EXECUTE 'ALTER TABLE public.games ADD COLUMN level integer NOT NULL DEFAULT 1';
    END IF;
  END IF;
END $$;

-- 3) Extend game_mode enum with 'level_up' if enum exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'game_mode' AND n.nspname = 'public'
  ) THEN
    -- add value if not exists (Postgres doesn't support IF NOT EXISTS directly for enum values in all versions)
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'game_mode' AND n.nspname = 'public' AND e.enumlabel = 'level_up'
    ) THEN
      EXECUTE 'ALTER TYPE public.game_mode ADD VALUE ''level_up''';
    END IF;
  END IF;
END $$;

-- 4) RLS: profiles already RLS-enabled in prior migrations; no policy changes needed
