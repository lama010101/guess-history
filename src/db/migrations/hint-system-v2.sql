-- Hint System V2 Migration Script
-- This script creates or updates the necessary tables, RLS policies, and seed functions
-- for the Guess-History Hint System V2
-- Based on PRD TASK-GH-HINTS-V2-003

-- ============================================================================
-- PART 1: TABLE DEFINITIONS
-- ============================================================================

-- Drop existing hint tables if they exist (to ensure clean migration)
DROP TABLE IF EXISTS public.round_hints CASCADE;
DROP TABLE IF EXISTS public.hints CASCADE;

-- Create the hints table with the structure required for V2
CREATE TABLE public.hints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
    type TEXT NOT NULL,
    prereq_key TEXT NULL, -- key of required hint (NULL if none)
    category TEXT NOT NULL, -- 'when' or 'where'
    value TEXT NOT NULL, -- hint answer
    cost_xp INTEGER NOT NULL, -- from § 2
    accuracy_penalty INTEGER NOT NULL, -- cost_xp / 10
    visible_in_game BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT unique_hint_type_per_image UNIQUE(image_id, type)
);

COMMENT ON TABLE public.hints IS 'Static catalog of all available hints for images';

-- Create round_hints table to track user hint purchases
CREATE TABLE public.round_hints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id UUID NOT NULL REFERENCES public.game_rounds(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    hint_id UUID NOT NULL REFERENCES public.hints(id) ON DELETE CASCADE,
    cost_xp INTEGER NOT NULL, -- snapshot
    accuracy_penalty INTEGER NOT NULL, -- snapshot
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT unique_hint_purchase UNIQUE(round_id, user_id, hint_id)
);

COMMENT ON TABLE public.round_hints IS 'Records of hint purchases by users for specific rounds';

-- Alter user_stats to add hint-related columns
DO $$
BEGIN
    -- Check if the user_stats table exists
    IF EXISTS (SELECT FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = 'user_stats') THEN
        -- Check if columns already exist and add them if not
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_attribute 
                      WHERE attrelid = 'public.user_stats'::regclass AND attname = 'hints_used_total') THEN
            ALTER TABLE public.user_stats ADD COLUMN hints_used_total INT DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_attribute 
                      WHERE attrelid = 'public.user_stats'::regclass AND attname = 'xp_spent_on_hints') THEN
            ALTER TABLE public.user_stats ADD COLUMN xp_spent_on_hints INT DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_attribute 
                      WHERE attrelid = 'public.user_stats'::regclass AND attname = 'accuracy_penalty_total') THEN
            ALTER TABLE public.user_stats ADD COLUMN accuracy_penalty_total INT DEFAULT 0;
        END IF;
    ELSE
        -- If user_stats doesn't exist, use user_metrics as fallback
        IF EXISTS (SELECT FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename = 'user_metrics') THEN
            -- Check if columns already exist and add them if not
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_attribute 
                          WHERE attrelid = 'public.user_metrics'::regclass AND attname = 'hints_used_total') THEN
                ALTER TABLE public.user_metrics ADD COLUMN hints_used_total INT DEFAULT 0;
            END IF;
            
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_attribute 
                          WHERE attrelid = 'public.user_metrics'::regclass AND attname = 'xp_spent_on_hints') THEN
                ALTER TABLE public.user_metrics ADD COLUMN xp_spent_on_hints INT DEFAULT 0;
            END IF;
            
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_attribute 
                          WHERE attrelid = 'public.user_metrics'::regclass AND attname = 'accuracy_penalty_total') THEN
                ALTER TABLE public.user_metrics ADD COLUMN accuracy_penalty_total INT DEFAULT 0;
            END IF;
        END IF;
    END IF;
END$$;

-- ============================================================================
-- PART 2: INDEXES
-- ============================================================================

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS hints_image_id_idx ON public.hints(image_id);
CREATE INDEX IF NOT EXISTS hints_type_idx ON public.hints(type);
CREATE INDEX IF NOT EXISTS hints_level_idx ON public.hints(level);
CREATE INDEX IF NOT EXISTS hints_category_idx ON public.hints(category);
CREATE INDEX IF NOT EXISTS hints_prereq_key_idx ON public.hints(prereq_key);
CREATE INDEX IF NOT EXISTS round_hints_round_id_idx ON public.round_hints(round_id);
CREATE INDEX IF NOT EXISTS round_hints_user_id_idx ON public.round_hints(user_id);
CREATE INDEX IF NOT EXISTS round_hints_hint_id_idx ON public.round_hints(hint_id);

-- ============================================================================
-- PART 3: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.hints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_hints ENABLE ROW LEVEL SECURITY;

-- Hints table policies
-- Authenticated users can read hints (per PRD)
CREATE POLICY "Hints are readable by authenticated users" ON public.hints
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only authenticated users with admin role can modify hints
CREATE POLICY "Only admins can insert hints" ON public.hints
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id AND raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Only admins can update hints" ON public.hints
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id AND raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Only admins can delete hints" ON public.hints
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Round hints policies
-- Users can read their own hint purchases only (per PRD)
CREATE POLICY "Users can read their own round hints" ON public.round_hints
    FOR SELECT USING (auth.uid() = user_id);

-- Authenticated users can insert their own hint purchases only
CREATE POLICY "Users can insert their own round hints" ON public.round_hints
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own hint purchases only
CREATE POLICY "Users can update their own round hints" ON public.round_hints
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own hint purchases only
CREATE POLICY "Users can delete their own round hints" ON public.round_hints
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- PART 4: POSTGRESQL FUNCTIONS
-- ============================================================================

-- Function to check if a hint can be purchased (dependency validation)
CREATE OR REPLACE FUNCTION public.can_purchase_hint(p_user_id UUID, p_hint_id UUID, p_round_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
DECLARE
    v_prereq_key TEXT;
    v_hint_type TEXT;
    v_has_required BOOLEAN;
BEGIN
    -- Check if this hint has a prerequisite
    SELECT prereq_key, type INTO v_prereq_key, v_hint_type
    FROM public.hints
    WHERE id = p_hint_id;
    
    -- If no prerequisite, can purchase
    IF v_prereq_key IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user has purchased the required hint by prereq_key
    SELECT EXISTS (
        SELECT 1 
        FROM public.round_hints rh
        JOIN public.hints h ON rh.hint_id = h.id
        WHERE rh.user_id = p_user_id 
        AND rh.round_id = p_round_id 
        AND h.type = v_prereq_key
    ) INTO v_has_required;
    
    RETURN v_has_required;
END;
$$ LANGUAGE plpgsql;

-- Function to get hint debt (XP cost and accuracy penalty)
CREATE OR REPLACE FUNCTION public.get_hint_debt(p_user_id UUID, p_round_id UUID)
RETURNS TABLE (xp_debt INTEGER, accuracy_debt INTEGER, when_xp INTEGER, where_xp INTEGER, when_acc INTEGER, where_acc INTEGER)
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(rh.cost_xp)::INTEGER, 0) AS xp_debt,
        COALESCE(SUM(rh.accuracy_penalty)::INTEGER, 0) AS accuracy_debt,
        COALESCE(SUM(CASE WHEN h.category = 'when' THEN rh.cost_xp ELSE 0 END)::INTEGER, 0) AS when_xp,
        COALESCE(SUM(CASE WHEN h.category = 'where' THEN rh.cost_xp ELSE 0 END)::INTEGER, 0) AS where_xp,
        COALESCE(SUM(CASE WHEN h.category = 'when' THEN rh.accuracy_penalty ELSE 0 END)::INTEGER, 0) AS when_acc,
        COALESCE(SUM(CASE WHEN h.category = 'where' THEN rh.accuracy_penalty ELSE 0 END)::INTEGER, 0) AS where_acc
    FROM 
        public.round_hints rh
        JOIN public.hints h ON rh.hint_id = h.id
    WHERE 
        rh.user_id = p_user_id AND
        rh.round_id = p_round_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 5: TRIGGERS
-- ============================================================================

-- Note: We don't need an updated_at trigger since we removed the updated_at column
-- But let's create a trigger to update user_stats on hint purchase

CREATE OR REPLACE FUNCTION update_user_stats_on_hint_purchase()
RETURNS TRIGGER AS $$
BEGIN
    -- Try to update user_stats first
    BEGIN
        UPDATE public.user_stats
        SET 
            hints_used_total = hints_used_total + 1,
            xp_spent_on_hints = xp_spent_on_hints + NEW.cost_xp,
            accuracy_penalty_total = accuracy_penalty_total + NEW.accuracy_penalty
        WHERE user_id = NEW.user_id;
    EXCEPTION WHEN undefined_table THEN
        -- If user_stats doesn't exist, fall back to user_metrics
        UPDATE public.user_metrics
        SET 
            hints_used_total = hints_used_total + 1,
            xp_spent_on_hints = xp_spent_on_hints + NEW.cost_xp,
            accuracy_penalty_total = accuracy_penalty_total + NEW.accuracy_penalty
        WHERE user_id = NEW.user_id;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_stats_after_hint_purchase
AFTER INSERT ON public.round_hints
FOR EACH ROW
EXECUTE FUNCTION update_user_stats_on_hint_purchase();

-- ============================================================================
-- PART 6: SEED FUNCTION
-- ============================================================================

-- Function to seed hint data for a specific image using the prompts columns
CREATE OR REPLACE FUNCTION public.seed_hints_from_prompts()
RETURNS VOID AS $$
DECLARE
    img RECORD;
    continents TEXT;
    century TEXT;
    distant_landmark TEXT;
    distant_distance TEXT;
    distant_event TEXT;
    distant_time_diff TEXT;
    region TEXT;
    narrow_decade TEXT;
    nearby_landmark TEXT;
    nearby_distance TEXT;
    contemporary_event TEXT;
    close_time_diff TEXT;
    hint_id UUID;
BEGIN
    -- Process each image in the prompts table
    FOR img IN 
        SELECT 
            p.id,
            p."1_where_continent" AS continent,
            p."1_when_century" AS century,
            p."2_where_landmark" AS distant_landmark,
            p."2_where_landmark_km" AS distant_distance,
            p."2_when_event" AS distant_event,
            p."2_when_event_years" AS distant_time_diff,
            p."3_where_region" AS region,
            p."3_when_decade" AS narrow_decade,
            p."4_where_landmark" AS nearby_landmark,
            p."4_where_landmark_km" AS nearby_distance,
            p."4_when_event" AS contemporary_event,
            p."4_when_event_years" AS close_time_diff
        FROM 
            public.prompts p
    LOOP
        -- Skip images that already have hints
        IF EXISTS (SELECT 1 FROM public.hints WHERE image_id = img.id) THEN
            CONTINUE;
        END IF;

        -- Level 1: Global - Where
        INSERT INTO public.hints (
            image_id, level, type, prereq_key, category, value, cost_xp, accuracy_penalty, visible_in_game
        ) VALUES (
            img.id, 1, 'continent', NULL, 'where', img.continent, 30, 3, TRUE
        );

        -- Level 1: Global - When
        INSERT INTO public.hints (
            image_id, level, type, prereq_key, category, value, cost_xp, accuracy_penalty, visible_in_game
        ) VALUES (
            img.id, 1, 'century', NULL, 'when', img.century, 30, 3, TRUE
        );

        -- Level 2: Distant - Where
        INSERT INTO public.hints (
            image_id, level, type, prereq_key, category, value, cost_xp, accuracy_penalty, visible_in_game
        ) VALUES (
            img.id, 2, 'distantLandmark', NULL, 'where', img.distant_landmark, 60, 6, TRUE
        );

        -- Level 2: Distant - Where (Distance)
        INSERT INTO public.hints (
            image_id, level, type, prereq_key, category, value, cost_xp, accuracy_penalty, visible_in_game
        ) VALUES (
            img.id, 2, 'distantDistance', 'distantLandmark', 'where', img.distant_distance, 60, 6, TRUE
        );

        -- Level 2: Distant - When
        INSERT INTO public.hints (
            image_id, level, type, prereq_key, category, value, cost_xp, accuracy_penalty, visible_in_game
        ) VALUES (
            img.id, 2, 'distantEvent', NULL, 'when', img.distant_event, 60, 6, TRUE
        );

        -- Level 2: Distant - When (Time Diff)
        INSERT INTO public.hints (
            image_id, level, type, prereq_key, category, value, cost_xp, accuracy_penalty, visible_in_game
        ) VALUES (
            img.id, 2, 'distantTimeDiff', 'distantEvent', 'when', img.distant_time_diff, 60, 6, TRUE
        );

        -- Level 3: Regional - Where
        INSERT INTO public.hints (
            image_id, level, type, prereq_key, category, value, cost_xp, accuracy_penalty, visible_in_game
        ) VALUES (
            img.id, 3, 'region', NULL, 'where', img.region, 90, 9, TRUE
        );

        -- Level 3: Regional - When
        INSERT INTO public.hints (
            image_id, level, type, prereq_key, category, value, cost_xp, accuracy_penalty, visible_in_game
        ) VALUES (
            img.id, 3, 'narrowDecade', NULL, 'when', img.narrow_decade, 90, 9, TRUE
        );

        -- Level 4: Nearby - Where
        INSERT INTO public.hints (
            image_id, level, type, prereq_key, category, value, cost_xp, accuracy_penalty, visible_in_game
        ) VALUES (
            img.id, 4, 'nearbyLandmark', NULL, 'where', img.nearby_landmark, 160, 16, TRUE
        );

        -- Level 4: Nearby - Where (Distance)
        INSERT INTO public.hints (
            image_id, level, type, prereq_key, category, value, cost_xp, accuracy_penalty, visible_in_game
        ) VALUES (
            img.id, 4, 'nearbyDistance', 'nearbyLandmark', 'where', img.nearby_distance, 160, 16, TRUE
        );

        -- Level 4: Nearby - When
        INSERT INTO public.hints (
            image_id, level, type, prereq_key, category, value, cost_xp, accuracy_penalty, visible_in_game
        ) VALUES (
            img.id, 4, 'contemporaryEvent', NULL, 'when', img.contemporary_event, 160, 16, TRUE
        );

        -- Level 4: Nearby - When (Time Diff)
        INSERT INTO public.hints (
            image_id, level, type, prereq_key, category, value, cost_xp, accuracy_penalty, visible_in_game
        ) VALUES (
            img.id, 4, 'closeTimeDiff', 'contemporaryEvent', 'when', img.close_time_diff, 160, 16, TRUE
        );

    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create an API trigger to auto-seed hints from prompts on new image insert
CREATE OR REPLACE FUNCTION trigger_seed_hints_on_image_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip if there are no prompts for this image
    IF NOT EXISTS (SELECT 1 FROM public.prompts WHERE id = NEW.id) THEN
        RETURN NEW;
    END IF;

    -- Seed hints for this specific image
    PERFORM seed_hints_from_prompts();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to the images table
DROP TRIGGER IF EXISTS seed_hints_after_image_insert ON public.images;
CREATE TRIGGER seed_hints_after_image_insert
AFTER INSERT ON public.images
FOR EACH ROW
EXECUTE FUNCTION trigger_seed_hints_on_image_insert();
-- ============================================================================
-- PART 7: FINAL SETUP
-- ============================================================================

-- Run seed function to populate hints for all existing images
SELECT seed_hints_from_prompts();

-- Output confirmation
DO $$
BEGIN
    RAISE NOTICE 'Hint System V2 migration complete!'; 
    RAISE NOTICE 'Created tables: hints, round_hints';
    RAISE NOTICE 'Added columns to user_stats/metrics: hints_used_total, xp_spent_on_hints, accuracy_penalty_total';
    RAISE NOTICE 'Created functions: can_purchase_hint, get_hint_debt, seed_hints_from_prompts';
    RAISE NOTICE 'Created triggers: update_user_stats_after_hint_purchase, seed_hints_after_image_insert';
END $$;
