-- Create image_feedback table
CREATE TABLE IF NOT EXISTS public.image_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  image_accuracy INTEGER NOT NULL CHECK (image_accuracy >= 0 AND image_accuracy <= 10),
  description_accurate BOOLEAN,
  location_accurate BOOLEAN,
  date_accurate BOOLEAN,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Add a unique constraint to ensure one feedback per user per round
  CONSTRAINT unique_user_round_feedback UNIQUE (user_id, round_id)
);

-- Add RLS policies
ALTER TABLE public.image_feedback ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to insert their own feedback
CREATE POLICY insert_own_feedback ON public.image_feedback
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to select their own feedback
CREATE POLICY select_own_feedback ON public.image_feedback
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Add the table to the public schema
GRANT ALL ON public.image_feedback TO postgres, service_role;
