
-- Create function to get real users
CREATE OR REPLACE FUNCTION public.get_real_users()
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    json_build_object(
      'id', p.id,
      'username', p.username,
      'email', a.email,
      'avatar_url', p.avatar_url,
      'role', p.role,
      'created_at', p.created_at
    )
  FROM 
    public.profiles p
    JOIN auth.users a ON p.id = a.id
  ORDER BY 
    p.created_at DESC;
END;
$$;

-- Create function to sync user to database
CREATE OR REPLACE FUNCTION public.sync_user_to_database(
  user_id UUID,
  user_username TEXT,
  user_email TEXT,
  user_avatar_url TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    avatar_url,
    role
  )
  VALUES (
    user_id,
    user_username,
    user_avatar_url,
    'admin'
  )
  ON CONFLICT (id)
  DO UPDATE SET
    username = user_username,
    avatar_url = user_avatar_url
  WHERE profiles.id = user_id;
  
  RETURN TRUE;
END;
$$;

-- Create function to add sample user
CREATE OR REPLACE FUNCTION public.add_sample_user(
  sample_id TEXT,
  sample_username TEXT,
  sample_email TEXT,
  sample_avatar_url TEXT,
  sample_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow admins to add sample users for security
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'admin' THEN
    RETURN FALSE;
  END IF;
  
  -- Add sample user only if it doesn't exist yet
  INSERT INTO public.profiles (
    id,
    username,
    avatar_url,
    role
  )
  VALUES (
    sample_id::UUID,
    sample_username,
    sample_avatar_url,
    sample_role
  )
  ON CONFLICT (id)
  DO NOTHING;
  
  RETURN TRUE;
EXCEPTION
  WHEN others THEN
    -- Ignore errors (like invalid UUIDs) and just return false
    RETURN FALSE;
END;
$$;
