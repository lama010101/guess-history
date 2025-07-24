-- Migration: Create Hint System V2 schema
-- Timestamp: 2025-07-23 16:59 (+07:00)

-- 1. Ensure the `images` table has all 14 hint columns and supporting flags
ALTER TABLE public.images
  ADD COLUMN IF NOT EXISTS "1_where_continent"      TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "1_when_century"         TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "2_where_landmark"       TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "2_where_landmark_km"    NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "2_when_event"           TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "2_when_event_years"     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "3_where_region"         TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "3_when_decade"          TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "4_where_landmark"       TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "4_where_landmark_km"    NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "4_when_event"           TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "4_when_event_years"     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "5_where_clues"          TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "5_when_clues"           TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ready                     BOOLEAN NOT NULL DEFAULT FALSE;

-- Computed column indicating whether an image has the full set of hints populated.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'images'
      AND column_name  = 'has_full_hints'
  ) THEN
    ALTER TABLE public.images
      ADD COLUMN has_full_hints BOOLEAN GENERATED ALWAYS AS (
        "1_where_continent"     <> '' AND
        "1_when_century"        <> '' AND
        "2_where_landmark"      <> '' AND
        "2_where_landmark_km"   <> 0  AND
        "2_when_event"          <> '' AND
        "2_when_event_years"    <> 0  AND
        "3_where_region"        <> '' AND
        "3_when_decade"         <> '' AND
        "4_where_landmark"      <> '' AND
        "4_where_landmark_km"   <> 0  AND
        "4_when_event"          <> '' AND
        "4_when_event_years"    <> 0  AND
        "5_where_clues"         <> '' AND
        "5_when_clues"          <> ''
      ) STORED;
  END IF;
END $$;

-- 2. Create `hints` table (catalog of all hints)
CREATE TABLE IF NOT EXISTS public.hints (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_id         UUID REFERENCES public.images(id) ON DELETE CASCADE,
  level            INTEGER     NOT NULL CHECK (level BETWEEN 1 AND 5),
  type             TEXT        NOT NULL, -- e.g. continent, century, distantLandmark
  text             TEXT,
  distance_km      NUMERIC,
  time_diff_years  INTEGER,
  cost_xp          INTEGER     NOT NULL,
  cost_accuracy    INTEGER     NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (image_id, level, type)
);

-- RLS policies for `hints`
ALTER TABLE public.hints ENABLE ROW LEVEL SECURITY;

-- Anyone (even anon) can read hints (SELECT-only)
CREATE POLICY "Anyone can read hints" ON public.hints FOR SELECT USING (true);

-- Only admins can modify hints
CREATE POLICY "Only admins can insert hints"  ON public.hints FOR INSERT TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Only admins can update hints"  ON public.hints FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Only admins can delete hints"  ON public.hints FOR DELETE TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

-- 3. Create `round_hints` table (purchases per round)
CREATE TABLE IF NOT EXISTS public.round_hints (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id       TEXT      NOT NULL,
  user_id        UUID      NOT NULL,
  hint_id        UUID      NOT NULL REFERENCES public.hints(id) ON DELETE CASCADE,
  purchased_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cost_xp        INTEGER   NOT NULL,
  cost_accuracy  INTEGER   NOT NULL,
  UNIQUE (round_id, user_id, hint_id)
);

-- RLS policies for `round_hints`
ALTER TABLE public.round_hints ENABLE ROW LEVEL SECURITY;

-- Insert/select/update only allowed for the owning user
CREATE POLICY "Users can manage their round_hints" ON public.round_hints
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Extend `user_metrics` with hint-related aggregates
ALTER TABLE public.user_metrics
  ADD COLUMN IF NOT EXISTS hints_used_total        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_spent_on_hints       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accuracy_spent_on_hints INTEGER NOT NULL DEFAULT 0;
