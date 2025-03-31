
-- For historical_events, we'll maintain the column name for backward compatibility
-- but update any UI references to "location" to instead display as "address"

-- Add comments to the columns to clarify their purpose
COMMENT ON COLUMN public.historical_events.location_name IS 'Address or location name for the historical event';
