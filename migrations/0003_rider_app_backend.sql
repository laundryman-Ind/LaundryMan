-- ---------------------------------------------------------------------------
-- RIDER APP BACKEND — Database migration
-- Run in Supabase dashboard → SQL Editor → Run.
-- Idempotent: safe to re-run (IF NOT EXISTS + drop-policy guards).
-- ---------------------------------------------------------------------------

-- 1. Add columns to riders table
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS photo text DEFAULT '';

-- Unique index: one auth user maps to one rider row
CREATE UNIQUE INDEX IF NOT EXISTS riders_user_id_idx ON public.riders (user_id);

-- 2. Add rider_id column to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS rider_id uuid REFERENCES public.riders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

CREATE INDEX IF NOT EXISTS orders_rider_id_idx ON public.orders (rider_id);
CREATE INDEX IF NOT EXISTS orders_status_key_idx ON public.orders (status_key);

-- 3. Drop old rider policies and create new ones
DROP POLICY IF EXISTS "Anyone can view active riders" ON public.riders;

-- Riders can view their own row
CREATE POLICY "Riders can view own profile"
ON public.riders FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Riders can update their own row (name, photo, online status)
CREATE POLICY "Riders can update own profile"
ON public.riders FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Riders can insert their own row (first login)
CREATE POLICY "Riders can create own profile"
ON public.riders FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Anyone can view active riders (for tracking UI)
CREATE POLICY "Anyone can view active riders"
ON public.riders FOR SELECT
TO anon, authenticated
USING (active = true);

-- 4. Drop old order policies and create new ones
-- Users can still view their own orders
-- Riders can view: (a) placed unassigned orders, (b) their own assigned orders
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;

CREATE POLICY "Users can view own orders"
ON public.orders FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Riders can view available and own orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  (rider_id IS NULL AND status_key = 'placed')
  OR rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
);

-- Users can update their own orders
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;

CREATE POLICY "Users can update own orders"
ON public.orders FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Riders can update their own assigned orders
CREATE POLICY "Riders can update own assigned orders"
ON public.orders FOR UPDATE
TO authenticated
USING (rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()))
WITH CHECK (rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));

-- 5. Enable Realtime on orders table (for live sync between user and rider apps)
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- 6. Also enable Realtime on riders table (for online/offline status)
ALTER PUBLICATION supabase_realtime ADD TABLE public.riders;
