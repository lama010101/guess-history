
-- Create game_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id),
  game_mode TEXT NOT NULL DEFAULT 'daily',
  settings JSONB NOT NULL DEFAULT '{"gameMode": "daily", "distanceUnit": "km", "timerEnabled": false, "timerDuration": 5}'::jsonb,
  events JSONB[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for game_sessions
CREATE POLICY "Anyone can view daily game sessions"
  ON public.game_sessions
  FOR SELECT
  USING (game_mode = 'daily' OR auth.uid() = creator_id);

CREATE POLICY "Users can create game sessions"
  ON public.game_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own game sessions"
  ON public.game_sessions
  FOR UPDATE
  USING (auth.uid() = creator_id);

-- Create game_results table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  session_id UUID REFERENCES public.game_sessions(id),
  total_score INTEGER NOT NULL,
  round_results JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for game_results
CREATE POLICY "Users can view all game results for leaderboards"
  ON public.game_results
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own game results"
  ON public.game_results
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own game results"
  ON public.game_results
  FOR UPDATE
  USING (auth.uid() = user_id);
