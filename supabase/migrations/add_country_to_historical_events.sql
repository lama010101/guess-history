
-- Add country field to historical_events if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'historical_events' 
    AND column_name = 'country'
  ) THEN
    ALTER TABLE public.historical_events ADD COLUMN country TEXT;
  END IF;
END $$;

-- Create a function to ensure the country field is set based on location_name
CREATE OR REPLACE FUNCTION public.ensure_country_field()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.country IS NULL AND NEW.location_name IS NOT NULL THEN
    -- Try to extract country from location_name if it's in "City, Country" format
    IF position(',' IN NEW.location_name) > 0 THEN
      NEW.country := trim(split_part(NEW.location_name, ',', 2));
    ELSE
      -- Otherwise use the whole location name as country
      NEW.country := NEW.location_name;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically set country
DROP TRIGGER IF EXISTS set_country_on_insert_update ON public.historical_events;
CREATE TRIGGER set_country_on_insert_update
BEFORE INSERT OR UPDATE ON public.historical_events
FOR EACH ROW
EXECUTE FUNCTION public.ensure_country_field();
