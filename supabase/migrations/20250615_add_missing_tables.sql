-- Create badges table
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  description TEXT NOT NULL,
  icon_name VARCHAR NOT NULL,
  category VARCHAR NOT NULL,
  difficulty VARCHAR NOT NULL,
  requirement_code VARCHAR NOT NULL,
  requirement_value INTEGER NOT NULL,
  image_url VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for badges
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read badges
CREATE POLICY "Anyone can read badges" 
  ON public.badges 
  FOR SELECT 
  USING (true);

-- Only allow authenticated users with admin role to modify badges
CREATE POLICY "Only admins can insert badges" 
  ON public.badges 
  FOR INSERT 
  TO authenticated 
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can update badges" 
  ON public.badges 
  FOR UPDATE 
  TO authenticated 
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can delete badges" 
  ON public.badges 
  FOR DELETE 
  TO authenticated 
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create image_feedback table
CREATE TABLE IF NOT EXISTS public.image_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  image_id UUID NOT NULL,
  round_id UUID NOT NULL,
  image_accuracy INTEGER NOT NULL,
  description_accurate BOOLEAN,
  location_accurate BOOLEAN,
  date_accurate BOOLEAN,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, round_id)
);

-- Add RLS policies for image_feedback
ALTER TABLE public.image_feedback ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own feedback
CREATE POLICY "Users can insert their own feedback" 
  ON public.image_feedback 
  FOR INSERT 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Allow users to update their own feedback
CREATE POLICY "Users can update their own feedback" 
  ON public.image_feedback 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Allow users to read their own feedback
CREATE POLICY "Users can read their own feedback" 
  ON public.image_feedback 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Allow admins to read all feedback
CREATE POLICY "Admins can read all feedback" 
  ON public.image_feedback 
  FOR SELECT 
  TO authenticated 
  USING (auth.jwt() ->> 'role' = 'admin');

-- Add earned_badges column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'earned_badges'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN earned_badges UUID[] DEFAULT '{}';
  END IF;
END $$;
