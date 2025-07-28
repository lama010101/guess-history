-- Migration: Add missing columns to round_hints table
-- Timestamp: 2025-07-28 11:10 (+07:00)

-- Add missing columns that code expects
ALTER TABLE public.round_hints
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS hint_type TEXT,
  ADD COLUMN IF NOT EXISTS xpDebt INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accDebt INTEGER DEFAULT 0;

-- Update existing records to use the new columns
UPDATE public.round_hints 
SET label = 'Hint',
    hint_type = CASE 
      WHEN hint_id IN (SELECT id FROM public.hints WHERE type LIKE '%where%') THEN 'where'
      WHEN hint_id IN (SELECT id FROM public.hints WHERE type LIKE '%when%') THEN 'when'
      ELSE 'unknown'
    END,
    xpDebt = cost_xp,
    accDebt = cost_accuracy
WHERE label IS NULL;
