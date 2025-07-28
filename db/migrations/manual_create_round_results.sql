-- Manual SQL command to create round_results table
-- Run this in your Supabase SQL editor or psql

CREATE TABLE IF NOT EXISTS public.round_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL,
    round_index INTEGER NOT NULL,
    image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
    score INTEGER,
    accuracy NUMERIC,
    xp_where INTEGER,
    xp_when INTEGER,
    hints_used INTEGER DEFAULT 0,
    distance_km NUMERIC,
    guess_year INTEGER,
    guess_lat NUMERIC,
    guess_lng NUMERIC,
    actual_lat NUMERIC,
    actual_lng NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, game_id, round_index)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_round_results_user_id ON public.round_results(user_id);
CREATE INDEX IF NOT EXISTS idx_round_results_game_id ON public.round_results(game_id);
CREATE INDEX IF NOT EXISTS idx_round_results_user_game ON public.round_results(user_id, game_id);

-- Enable RLS
ALTER TABLE public.round_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own round results" ON public.round_results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own round results" ON public.round_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own round results" ON public.round_results
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own round results" ON public.round_results
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_round_results_updated_at
    BEFORE UPDATE ON public.round_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
