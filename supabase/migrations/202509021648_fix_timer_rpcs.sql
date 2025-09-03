-- Fix timer table, policies, and RPCs to match client expectations
-- Created at 2025-09-02 16:48:00 +07:00

begin;

-- 1) Drop any existing start_timer/get_timer overloads to avoid ambiguity
DO $$
DECLARE r regprocedure;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN ('start_timer','get_timer')
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', r);
  END LOOP;
END $$;

-- 2) Ensure round_timers table exists with required columns
CREATE TABLE IF NOT EXISTS public.round_timers (
  user_id uuid NOT NULL,
  timer_id text NOT NULL,
  duration_sec integer NOT NULL CHECK (duration_sec > 0),
  started_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT round_timers_pkey PRIMARY KEY (user_id, timer_id),
  CONSTRAINT round_timers_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3) updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_round_timers_updated_at ON public.round_timers;
CREATE TRIGGER trg_round_timers_updated_at
BEFORE UPDATE ON public.round_timers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) RLS policies
ALTER TABLE public.round_timers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'round_timers' AND policyname = 'rt_select_own'
  ) THEN
    CREATE POLICY rt_select_own ON public.round_timers
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'round_timers' AND policyname = 'rt_insert_own'
  ) THEN
    CREATE POLICY rt_insert_own ON public.round_timers
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'round_timers' AND policyname = 'rt_update_own'
  ) THEN
    CREATE POLICY rt_update_own ON public.round_timers
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 5) Canonical RPCs
CREATE OR REPLACE FUNCTION public.start_timer(
  p_timer_id text,
  p_duration_sec integer
)
RETURNS TABLE (
  timer_id text,
  end_at timestamptz,
  server_now timestamptz,
  duration_sec integer,
  started_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
VOLATILE
AS $$
  WITH upsert AS (
    INSERT INTO public.round_timers AS rt (user_id, timer_id, duration_sec, started_at, end_at)
    VALUES (
      auth.uid(),
      p_timer_id,
      p_duration_sec,
      now(),
      now() + make_interval(secs => p_duration_sec::double precision)
    )
    ON CONFLICT (user_id, timer_id) DO UPDATE
      SET duration_sec = EXCLUDED.duration_sec,
          started_at   = now(),
          end_at       = now() + make_interval(secs => EXCLUDED.duration_sec::double precision),
          updated_at   = now()
    RETURNING rt.timer_id, rt.end_at, rt.duration_sec, rt.started_at
  )
  SELECT u.timer_id, u.end_at, now() AS server_now, u.duration_sec, u.started_at
  FROM upsert u
$$;

CREATE OR REPLACE FUNCTION public.get_timer(
  p_timer_id text
)
RETURNS TABLE (
  timer_id text,
  end_at timestamptz,
  server_now timestamptz,
  duration_sec integer,
  started_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    rt.timer_id,
    rt.end_at,
    now() AS server_now,
    rt.duration_sec,
    rt.started_at
  FROM public.round_timers rt
  WHERE rt.user_id = auth.uid()
    AND rt.timer_id = p_timer_id
$$;

-- 6) Grants
REVOKE ALL ON FUNCTION public.start_timer(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_timer(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_timer(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_timer(text) TO authenticated;

commit;
