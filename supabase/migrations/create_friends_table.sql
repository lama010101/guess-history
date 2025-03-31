
-- Create friends table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.friends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  friend_id UUID REFERENCES auth.users NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Ensure uniqueness of friend relationships
  UNIQUE(user_id, friend_id)
);

-- Enable Row Level Security
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for friends
CREATE POLICY "Users can view their own friends"
  ON public.friends
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add friends"
  ON public.friends
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own friends"
  ON public.friends
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own friends"
  ON public.friends
  FOR DELETE
  USING (auth.uid() = user_id);
