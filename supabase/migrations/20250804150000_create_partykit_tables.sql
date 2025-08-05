-- Migration: Create PartyKit persistence and log tables for multiplayer layer
-- Date: 2025-08-04 15:00:00
-- This migration adds `room_state` and `partykit_logs` as described in the
-- Guess-History Multiplayer Phase 1 PRD. It also sets up RLS policies to
-- restrict access to the Supabase `service_role` key. Update or extend these
-- policies as the access model evolves.

BEGIN;

-- Ensure pgcrypto extension for uuid generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

--------------------------------------------------------------------
--  Table: room_state
--------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_state (
    room_id    TEXT PRIMARY KEY,
    data       JSONB NOT NULL,
    revision   INTEGER NOT NULL DEFAULT 0, -- optimistic-locking counter
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------------------------
--  Table: partykit_logs
--------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partykit_logs (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id    TEXT NOT NULL,
    player_id  UUID NULL,
    event_type TEXT NOT NULL,
    payload    JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful indexes for log querying
CREATE INDEX IF NOT EXISTS partykit_logs_room_id_idx   ON public.partykit_logs (room_id);
CREATE INDEX IF NOT EXISTS partykit_logs_event_type_idx ON public.partykit_logs (event_type);

--------------------------------------------------------------------
--  Retention policy (informational)
--------------------------------------------------------------------
--  To keep storage usage under control, logs older than 30 days should be
--  purged via a Supabase scheduled task or cron job:
--  DELETE FROM public.partykit_logs WHERE created_at < NOW() - INTERVAL '30 days';
--------------------------------------------------------------------

--------------------------------------------------------------------
--  Row-Level Security Policies
--------------------------------------------------------------------
--  By default, deny all access then explicitly allow the `service_role`.
--------------------------------------------------------------------

ALTER TABLE public.room_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partykit_logs ENABLE ROW LEVEL SECURITY;

-- Full access for service_role (backend / edge functions)
CREATE POLICY "service_role_full_access" ON public.room_state
  FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_full_access" ON public.partykit_logs
  FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);

COMMIT;
