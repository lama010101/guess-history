-- Add per-mode aggregates to user_metrics
-- This migration adds columns to track XP, games played, and overall accuracy per game mode.
-- Modes: solo, level, compete, collaborate

BEGIN;

-- Ensure table exists before altering (will error if table missing)
-- Add columns with defaults so existing rows are backfilled automatically
ALTER TABLE IF EXISTS public.user_metrics
  ADD COLUMN IF NOT EXISTS xp_total_solo numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS games_played_solo integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overall_accuracy_solo numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_total_level numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS games_played_level integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overall_accuracy_level numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_total_compete numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS games_played_compete integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overall_accuracy_compete numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_total_collaborate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS games_played_collaborate integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overall_accuracy_collaborate numeric NOT NULL DEFAULT 0;

-- Accuracy sanity constraints (0..100)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_metrics_overall_accuracy_solo'
  ) THEN
    ALTER TABLE public.user_metrics
      ADD CONSTRAINT chk_user_metrics_overall_accuracy_solo CHECK (overall_accuracy_solo >= 0 AND overall_accuracy_solo <= 100);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_metrics_overall_accuracy_level'
  ) THEN
    ALTER TABLE public.user_metrics
      ADD CONSTRAINT chk_user_metrics_overall_accuracy_level CHECK (overall_accuracy_level >= 0 AND overall_accuracy_level <= 100);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_metrics_overall_accuracy_compete'
  ) THEN
    ALTER TABLE public.user_metrics
      ADD CONSTRAINT chk_user_metrics_overall_accuracy_compete CHECK (overall_accuracy_compete >= 0 AND overall_accuracy_compete <= 100);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_metrics_overall_accuracy_collaborate'
  ) THEN
    ALTER TABLE public.user_metrics
      ADD CONSTRAINT chk_user_metrics_overall_accuracy_collaborate CHECK (overall_accuracy_collaborate >= 0 AND overall_accuracy_collaborate <= 100);
  END IF;
END $$;

COMMIT;
