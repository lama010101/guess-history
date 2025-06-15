-- Create the image_feedback table
CREATE TABLE IF NOT EXISTS public.image_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  round_id TEXT NOT NULL, -- Assuming round_id is a string, adjust if it's a UUID referencing another table
  image_accuracy SMALLINT NOT NULL CHECK (image_accuracy >= 0 AND image_accuracy <= 10),
  description_accurate BOOLEAN,
  location_accurate BOOLEAN,
  date_accurate BOOLEAN,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_image_round_feedback UNIQUE (user_id, image_id, round_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.image_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback" 
ON public.image_feedback 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own feedback
CREATE POLICY "Users can update their own feedback" 
ON public.image_feedback 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can select their own feedback
CREATE POLICY "Users can select their own feedback" 
ON public.image_feedback 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Policy: Users can delete their own feedback (optional, if you want to allow deletions)
-- CREATE POLICY "Users can delete their own feedback" 
-- ON public.image_feedback 
-- FOR DELETE 
-- TO authenticated 
-- USING (auth.uid() = user_id);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_image_feedback_updated
  BEFORE UPDATE ON public.image_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add comments to the table and columns for clarity
COMMENT ON TABLE public.image_feedback IS 'Stores user feedback on image accuracy and metadata.';
COMMENT ON COLUMN public.image_feedback.image_accuracy IS 'Overall image accuracy rating (0-10).';
COMMENT ON COLUMN public.image_feedback.description_accurate IS 'Was the image description accurate? (true/false/null).';
COMMENT ON COLUMN public.image_feedback.location_accurate IS 'Was the image location accurate? (true/false/null).';
COMMENT ON COLUMN public.image_feedback.date_accurate IS 'Was the image date accurate? (true/false/null).';
COMMENT ON COLUMN public.image_feedback.comments IS 'Optional user comments.';
COMMENT ON CONSTRAINT unique_user_image_round_feedback ON public.image_feedback IS 'Ensures a user can only provide one feedback entry per image per round.';

-- Note: If your round_id is actually a UUID and references a `game_rounds` table, 
-- you might want to change the round_id column definition to:
-- round_id UUID NOT NULL REFERENCES public.game_rounds(id) ON DELETE CASCADE, 
-- And update the unique constraint accordingly.
