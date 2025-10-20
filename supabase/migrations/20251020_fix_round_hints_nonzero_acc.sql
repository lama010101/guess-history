BEGIN;

-- Ensure no hint purchase with positive XP debt has zero accuracy debt.
-- Prefer authoritative cost_accuracy from public.hints when available; otherwise set a minimal 1%.
UPDATE public.round_hints rh
SET accDebt = GREATEST(1, COALESCE(h.cost_accuracy, rh.accDebt, 0))
FROM public.hints h
WHERE rh.hint_id = h.id
  AND COALESCE(rh.xpDebt, 0) > 0
  AND COALESCE(rh.accDebt, 0) = 0;

-- Fallback: for legacy rows that don't have a matching hints row, enforce a minimum 1% accDebt
UPDATE public.round_hints rh
SET accDebt = 1
WHERE COALESCE(rh.xpDebt, 0) > 0
  AND COALESCE(rh.accDebt, 0) = 0
  AND NOT EXISTS (
    SELECT 1 FROM public.hints h WHERE h.id = rh.hint_id
  );

COMMIT;
