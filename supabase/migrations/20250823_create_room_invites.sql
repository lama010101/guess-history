-- Create room_invites table for lobby friend invites
-- Date: 2025-08-23

BEGIN;

-- Ensure uuid generator is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.room_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  inviter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Uniqueness and helpful indexes
CREATE UNIQUE INDEX IF NOT EXISTS room_invites_unique ON public.room_invites (room_id, inviter_user_id, friend_id);
CREATE INDEX IF NOT EXISTS room_invites_room_idx ON public.room_invites (room_id);
CREATE INDEX IF NOT EXISTS room_invites_inviter_idx ON public.room_invites (inviter_user_id);
CREATE INDEX IF NOT EXISTS room_invites_friend_idx ON public.room_invites (friend_id);

-- RLS: inviter can manage their own invites
ALTER TABLE public.room_invites ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='room_invites' AND policyname='ri_select_inviter'
  ) THEN
    CREATE POLICY ri_select_inviter ON public.room_invites
      FOR SELECT TO authenticated
      USING ( inviter_user_id = auth.uid() );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='room_invites' AND policyname='ri_select_invited'
  ) THEN
    CREATE POLICY ri_select_invited ON public.room_invites
      FOR SELECT TO authenticated
      USING ( friend_id = auth.uid() );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='room_invites' AND policyname='ri_insert_inviter'
  ) THEN
    CREATE POLICY ri_insert_inviter ON public.room_invites
      FOR INSERT TO authenticated
      WITH CHECK ( inviter_user_id = auth.uid() );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='room_invites' AND policyname='ri_delete_inviter'
  ) THEN
    CREATE POLICY ri_delete_inviter ON public.room_invites
      FOR DELETE TO authenticated
      USING ( inviter_user_id = auth.uid() );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='room_invites' AND policyname='ri_delete_invited'
  ) THEN
    CREATE POLICY ri_delete_invited ON public.room_invites
      FOR DELETE TO authenticated
      USING ( friend_id = auth.uid() );
  END IF;
END $$;

COMMIT;
