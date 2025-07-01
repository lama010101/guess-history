-- Drop existing image_feedback table if it exists to avoid conflicts
DROP TABLE IF EXISTS public.image_feedback CASCADE;

-- Create the image_feedback table with proper schema
CREATE TABLE public.image_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_id UUID NOT NULL,
  round_id UUID NOT NULL,
  image_accuracy INTEGER NOT NULL CHECK (image_accuracy >= 1 AND image_accuracy <= 10),
  description_accurate BOOLEAN,
  location_accurate BOOLEAN,
  date_accurate BOOLEAN,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_round_feedback UNIQUE (user_id, round_id)
);

-- Enable Row Level Security
ALTER TABLE public.image_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for image_feedback
-- Allow users to view their own feedback
CREATE POLICY "Users can view their own feedback" 
  ON public.image_feedback 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow users to insert their own feedback
CREATE POLICY "Users can insert their own feedback" 
  ON public.image_feedback 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own feedback
CREATE POLICY "Users can update their own feedback" 
  ON public.image_feedback 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create a trigger function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updated_at column on update
CREATE TRIGGER update_image_feedback_updated_at
BEFORE UPDATE ON public.image_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column();

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON TABLE public.image_feedback TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.image_feedback TO postgres;
