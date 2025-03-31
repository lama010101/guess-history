
-- Create function to get notifications with sender details
CREATE OR REPLACE FUNCTION public.get_notifications_with_sender(user_id UUID)
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    json_build_object(
      'id', n.id,
      'sender_id', n.sender_id,
      'receiver_id', n.receiver_id,
      'type', n.type,
      'message', n.message,
      'created_at', n.created_at,
      'read', n.read,
      'game_id', n.game_id,
      'sender', json_build_object(
        'username', p.username,
        'avatar_url', p.avatar_url
      )
    )
  FROM 
    public.notifications n
    LEFT JOIN public.profiles p ON n.sender_id = p.id
  WHERE 
    n.receiver_id = user_id
  ORDER BY 
    n.created_at DESC;
END;
$$;

-- Create function to mark a notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_as_read(notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notifications
  SET read = true
  WHERE id = notification_id
  AND receiver_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Create function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notifications
  SET read = true
  WHERE receiver_id = user_id
  AND receiver_id = auth.uid()
  AND read = false;
  
  RETURN FOUND;
END;
$$;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
