
-- Create function to get user profile
CREATE OR REPLACE FUNCTION public.get_user_profile(profile_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT 
      json_build_object(
        'username', username,
        'avatar_url', avatar_url,
        'onesignal_player_id', onesignal_player_id
      )
    FROM 
      public.profiles
    WHERE 
      id = profile_id
    LIMIT 1
  );
END;
$$;

-- Create function to update username
CREATE OR REPLACE FUNCTION public.update_username(profile_id UUID, new_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET username = new_username
  WHERE id = profile_id
  AND id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Create function to update OneSignal player ID
CREATE OR REPLACE FUNCTION public.update_onesignal_id(profile_id UUID, player_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET onesignal_player_id = player_id
  WHERE id = profile_id
  AND id = auth.uid();
  
  RETURN FOUND;
END;
$$;
