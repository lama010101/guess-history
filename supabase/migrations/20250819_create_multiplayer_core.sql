-- Multiplayer core schema: session membership, progress, chat, collab hints, and stricter RLS
-- Date: 2025-08-19

BEGIN;

-- Ensure UUID generators are available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Reusable trigger to bump updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

--------------------------------------------------------------------
-- Table: session_players
--------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_players (
  room_id      TEXT    NOT NULL,
  user_id      UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT    NOT NULL,
  is_host      BOOLEAN NOT NULL DEFAULT FALSE,
  ready        BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inserted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT session_players_pkey PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS session_players_room_idx ON public.session_players (room_id);
CREATE INDEX IF NOT EXISTS session_players_room_host_idx ON public.session_players (room_id, is_host);
CREATE INDEX IF NOT EXISTS session_players_room_ready_idx ON public.session_players (room_id, ready);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_session_players_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_session_players_set_updated_at
    BEFORE UPDATE ON public.session_players
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.session_players ENABLE ROW LEVEL SECURITY;

-- Policies for session_players
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_players' AND policyname='sp_select_participants'
  ) THEN
    CREATE POLICY sp_select_participants ON public.session_players
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.session_players sp2
          WHERE sp2.room_id = session_players.room_id AND sp2.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_players' AND policyname='sp_insert_self'
  ) THEN
    CREATE POLICY sp_insert_self ON public.session_players
      FOR INSERT TO authenticated
      WITH CHECK ( user_id = auth.uid() );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_players' AND policyname='sp_update_self_or_host'
  ) THEN
    CREATE POLICY sp_update_self_or_host ON public.session_players
      FOR UPDATE TO authenticated
      USING (
        user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.session_players h
          WHERE h.room_id = session_players.room_id AND h.user_id = auth.uid() AND h.is_host = TRUE
        )
      )
      WITH CHECK (
        user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.session_players h
          WHERE h.room_id = session_players.room_id AND h.user_id = auth.uid() AND h.is_host = TRUE
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_players' AND policyname='sp_delete_self_or_host'
  ) THEN
    CREATE POLICY sp_delete_self_or_host ON public.session_players
      FOR DELETE TO authenticated
      USING (
        user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.session_players h
          WHERE h.room_id = session_players.room_id AND h.user_id = auth.uid() AND h.is_host = TRUE
        )
      );
  END IF;
END $$;

--------------------------------------------------------------------
-- Table: session_progress
--------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_progress (
  room_id          TEXT  NOT NULL,
  user_id          UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_route    TEXT,
  round_number     INTEGER NOT NULL DEFAULT 1,
  substep          TEXT,
  round_started_at TIMESTAMPTZ,
  duration_sec     INTEGER,
  timer_enabled    BOOLEAN,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT session_progress_pkey PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS session_progress_room_round_idx ON public.session_progress (room_id, round_number);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_session_progress_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_session_progress_set_updated_at
    BEFORE UPDATE ON public.session_progress
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.session_progress ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_progress' AND policyname='spr_select_participants'
  ) THEN
    CREATE POLICY spr_select_participants ON public.session_progress
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.session_players sp
          WHERE sp.room_id = session_progress.room_id AND sp.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_progress' AND policyname='spr_insert_self'
  ) THEN
    CREATE POLICY spr_insert_self ON public.session_progress
      FOR INSERT TO authenticated
      WITH CHECK ( user_id = auth.uid() );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_progress' AND policyname='spr_update_self'
  ) THEN
    CREATE POLICY spr_update_self ON public.session_progress
      FOR UPDATE TO authenticated
      USING ( user_id = auth.uid() )
      WITH CHECK ( user_id = auth.uid() );
  END IF;
END $$;

--------------------------------------------------------------------
-- Table: room_chat
--------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_chat (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    TEXT NOT NULL,
  user_id    UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS room_chat_room_created_idx ON public.room_chat (room_id, created_at DESC);

ALTER TABLE public.room_chat ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='room_chat' AND policyname='chat_select_participants'
  ) THEN
    CREATE POLICY chat_select_participants ON public.room_chat
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.session_players sp
          WHERE sp.room_id = room_chat.room_id AND sp.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='room_chat' AND policyname='chat_insert_self'
  ) THEN
    CREATE POLICY chat_insert_self ON public.room_chat
      FOR INSERT TO authenticated
      WITH CHECK (
        user_id = auth.uid() AND EXISTS (
          SELECT 1 FROM public.session_players sp
          WHERE sp.room_id = room_chat.room_id AND sp.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='room_chat' AND policyname='chat_delete_self'
  ) THEN
    CREATE POLICY chat_delete_self ON public.room_chat
      FOR DELETE TO authenticated
      USING ( user_id = auth.uid() );
  END IF;
END $$;

--------------------------------------------------------------------
-- Table: collab_hints
--------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collab_hints (
  room_id      TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  hint_key     TEXT NOT NULL,
  payload      JSONB NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT collab_hints_pkey PRIMARY KEY (room_id, round_number, hint_key)
);

CREATE INDEX IF NOT EXISTS collab_hints_room_round_idx ON public.collab_hints (room_id, round_number);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_collab_hints_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_collab_hints_set_updated_at
    BEFORE UPDATE ON public.collab_hints
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.collab_hints ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='collab_hints' AND policyname='hints_select_participants'
  ) THEN
    CREATE POLICY hints_select_participants ON public.collab_hints
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.session_players sp
          WHERE sp.room_id = collab_hints.room_id AND sp.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='collab_hints' AND policyname='hints_upsert_participants'
  ) THEN
    CREATE POLICY hints_upsert_participants ON public.collab_hints
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.session_players sp
          WHERE sp.room_id = collab_hints.room_id AND sp.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.session_players sp
          WHERE sp.room_id = collab_hints.room_id AND sp.user_id = auth.uid()
        )
      );
  END IF;
END $$;

--------------------------------------------------------------------
-- Tighten RLS on game_sessions to participants
--------------------------------------------------------------------
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Drop permissive policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='game_sessions' AND policyname='game_sessions_select_auth'
  ) THEN
    DROP POLICY game_sessions_select_auth ON public.game_sessions;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='game_sessions' AND policyname='game_sessions_insert_auth'
  ) THEN
    DROP POLICY game_sessions_insert_auth ON public.game_sessions;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='game_sessions' AND policyname='game_sessions_update_auth'
  ) THEN
    DROP POLICY game_sessions_update_auth ON public.game_sessions;
  END IF;

  -- Participant-only SELECT/UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='game_sessions' AND policyname='gs_select_participants'
  ) THEN
    CREATE POLICY gs_select_participants ON public.game_sessions
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.session_players sp
          WHERE sp.room_id = game_sessions.room_id AND sp.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='game_sessions' AND policyname='gs_update_participants'
  ) THEN
    CREATE POLICY gs_update_participants ON public.game_sessions
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.session_players sp
          WHERE sp.room_id = game_sessions.room_id AND sp.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.session_players sp
          WHERE sp.room_id = game_sessions.room_id AND sp.user_id = auth.uid()
        )
      );
  END IF;

  -- Allow session creation (caller should also insert session_players row)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='game_sessions' AND policyname='gs_insert_auth'
  ) THEN
    CREATE POLICY gs_insert_auth ON public.game_sessions
      FOR INSERT TO authenticated
      WITH CHECK (TRUE);
  END IF;
END $$;

COMMIT;
