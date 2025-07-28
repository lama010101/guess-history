-- Migration: Create round_results table for per-round game results
-- Created: 2025-07-28

CREATE TABLE IF NOT EXISTS public.round_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    round_index INTEGER NOT NULL,
    image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    accuracy NUMERIC(5,2) NOT NULL,
    xp_total INTEGER NOT NULL,
    xp_where INTEGER NOT NULL,
    xp_when INTEGER NOT NULL,
    hints_used INTEGER NOT NULL DEFAULT 0,
    xp_debt INTEGER NOT NULL DEFAULT 0,
    acc_debt INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, game_id, round_index)
);

-- Index for fast lookup by game/round
CREATE INDEX IF NOT EXISTS idx_round_results_game ON public.round_results(game_id, round_index);

-- RLS policies should be added after table creation.
