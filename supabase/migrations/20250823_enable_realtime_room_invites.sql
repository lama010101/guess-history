-- Enable Realtime for room_invites and ensure delete payloads via REPLICA IDENTITY FULL
-- Date: 2025-08-23

BEGIN;

-- Verify table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='room_invites'
  ) THEN
    RAISE EXCEPTION 'Table public.room_invites does not exist';
  END IF;
END $$;

-- Ensure DELETE events include row contents
ALTER TABLE public.room_invites REPLICA IDENTITY FULL;

-- Add table to supabase_realtime publication if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'room_invites'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.room_invites';
  END IF;
END $$;

COMMIT;
