-- Rider GPS tracking for real-time location sharing
-- Stores the last known location of each rider, updated in real-time

CREATE TABLE IF NOT EXISTS rider_locations (
  rider_id UUID PRIMARY KEY REFERENCES riders(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Realtime for this table so the user app can subscribe to location changes
ALTER PUBLICATION supabase_realtime ADD TABLE rider_locations;

-- RLS: riders can update their own location, anyone can read (for tracking)
ALTER TABLE rider_locations ENABLE ROW LEVEL SECURITY;

-- Riders can update their own location
CREATE POLICY "Riders can update own location"
  ON rider_locations
  FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM riders WHERE id = rider_id));

-- Riders can insert their own location
CREATE POLICY "Riders can insert own location"
  ON rider_locations
  FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM riders WHERE id = rider_id));

-- Anyone authenticated can read rider locations (for order tracking)
CREATE POLICY "Authenticated users can read rider locations"
  ON rider_locations
  FOR SELECT
  TO authenticated
  USING (true);

-- Index for fast lookups by rider_id
CREATE INDEX IF NOT EXISTS idx_rider_locations_rider_id ON rider_locations(rider_id);
