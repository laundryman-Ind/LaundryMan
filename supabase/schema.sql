-- ===========================================================================
-- Laundry Man — Master Database Schema (Fresh Clean Install)
-- ===========================================================================
-- Run this script ONCE in Supabase SQL Editor on a fresh/empty database.
-- It creates all required tables, constraints, indexes, RLS policies,
-- RPC functions, realtime publications, storage buckets, and seed data.
--
-- Identity Isolation:
-- User App and Rider App identities are completely isolated.
-- Users are keyed by auth.uid() -> profiles.id
-- Riders are keyed by auth.uid() -> riders.user_id
-- ===========================================================================

-- Enable pgcrypto for UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. USER PROFILES — One row per authenticated customer, keyed by auth.users.id
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  photo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
CREATE POLICY "Users can create own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);


-- ---------------------------------------------------------------------------
-- 2. RIDER PROFILES — Delivery partners, keyed by auth.users.id
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.riders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  phone_href text DEFAULT '',
  photo text DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  online boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS riders_user_id_idx ON public.riders (user_id);

ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Riders can view own profile" ON public.riders;
CREATE POLICY "Riders can view own profile"
  ON public.riders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Riders can create own profile" ON public.riders;
CREATE POLICY "Riders can create own profile"
  ON public.riders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Riders can update own profile" ON public.riders;
CREATE POLICY "Riders can update own profile"
  ON public.riders FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Riders can delete own profile" ON public.riders;
CREATE POLICY "Riders can delete own profile"
  ON public.riders FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Public read for active riders (for live customer tracking UI)
DROP POLICY IF EXISTS "Anyone can view active riders" ON public.riders;
CREATE POLICY "Anyone can view active riders"
  ON public.riders FOR SELECT
  TO anon, authenticated
  USING (active = true);


-- ---------------------------------------------------------------------------
-- 3. SERVICES — Public laundry service catalog (Wash & Fold, Dry Clean, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
  id text PRIMARY KEY,
  name text NOT NULL,
  sub text DEFAULT '',
  icon text DEFAULT '',
  span text DEFAULT 'span-2',
  photo text DEFAULT '',
  tone text DEFAULT '',
  flat text DEFAULT '',
  price text DEFAULT '',
  sort integer DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
CREATE POLICY "Anyone can view active services"
  ON public.services FOR SELECT
  TO anon, authenticated
  USING (active = true);


-- ---------------------------------------------------------------------------
-- 4. SERVICE ITEMS — Priced items within each service category
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_items (
  id text PRIMARY KEY,
  service_id text NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'pc',
  sort integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_items_service_id_idx ON public.service_items (service_id);

ALTER TABLE public.service_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view service items" ON public.service_items;
CREATE POLICY "Anyone can view service items"
  ON public.service_items FOR SELECT
  TO anon, authenticated
  USING (true);


-- ---------------------------------------------------------------------------
-- 5. COUPONS — Promo codes and discount rules
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
  id text PRIMARY KEY,
  code text UNIQUE NOT NULL,
  title text NOT NULL DEFAULT 'Offer',
  name text DEFAULT '',
  tag text DEFAULT 'Limited-time offer',
  description text DEFAULT '',
  type text NOT NULL DEFAULT 'percent',
  discount_type text DEFAULT '',
  value numeric NOT NULL DEFAULT 0,
  discount_value numeric DEFAULT 0,
  min_total numeric DEFAULT 0,
  min_order numeric DEFAULT 0,
  max_value numeric DEFAULT 0,
  max_discount numeric DEFAULT 0,
  service_id text DEFAULT null,
  service_type text DEFAULT null,
  category text DEFAULT null,
  one_time boolean DEFAULT false,
  single_use boolean DEFAULT false,
  usage_limit integer DEFAULT null,
  active boolean NOT NULL DEFAULT true,
  sort integer DEFAULT 0,
  tone text DEFAULT '#16279E',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coupons_code_idx ON public.coupons (code);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;
CREATE POLICY "Anyone can view active coupons"
  ON public.coupons FOR SELECT
  TO anon, authenticated
  USING (active = true);


-- ---------------------------------------------------------------------------
-- 6. COUPON USES — Tracks redemptions per user (prevents double use)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupon_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coupon_id text DEFAULT null,
  coupon_code text NOT NULL DEFAULT '',
  order_id text DEFAULT null,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupon_uses_user_coupon_unique UNIQUE (user_id, coupon_code)
);

CREATE INDEX IF NOT EXISTS coupon_uses_user_id_idx ON public.coupon_uses (user_id);
CREATE INDEX IF NOT EXISTS coupon_uses_coupon_code_idx ON public.coupon_uses (coupon_code);
CREATE INDEX IF NOT EXISTS coupon_uses_order_id_idx ON public.coupon_uses (order_id);

ALTER TABLE public.coupon_uses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own coupon uses" ON public.coupon_uses;
CREATE POLICY "Users can view own coupon uses"
  ON public.coupon_uses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Block direct coupon_uses inserts" ON public.coupon_uses;
CREATE POLICY "Block direct coupon_uses inserts"
  ON public.coupon_uses FOR INSERT
  TO authenticated
  WITH CHECK (false); -- Insert is restricted to SECURITY DEFINER redeem_coupon RPC

DROP POLICY IF EXISTS "Users can delete own coupon use" ON public.coupon_uses;
CREATE POLICY "Users can delete own coupon use"
  ON public.coupon_uses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 7. ADDRESSES — Saved delivery addresses per customer
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.addresses (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  line text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS addresses_user_id_idx ON public.addresses (user_id);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own addresses" ON public.addresses;
CREATE POLICY "Users can view own addresses"
  ON public.addresses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own addresses" ON public.addresses;
CREATE POLICY "Users can create own addresses"
  ON public.addresses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own addresses" ON public.addresses;
CREATE POLICY "Users can update own addresses"
  ON public.addresses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own addresses" ON public.addresses;
CREATE POLICY "Users can delete own addresses"
  ON public.addresses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 8. CARTS — Per-user shopping cart
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.carts (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS carts_user_id_idx ON public.carts (user_id);

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own carts" ON public.carts;
CREATE POLICY "Users can view own carts"
  ON public.carts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own carts" ON public.carts;
CREATE POLICY "Users can create own carts"
  ON public.carts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own carts" ON public.carts;
CREATE POLICY "Users can update own carts"
  ON public.carts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own carts" ON public.carts;
CREATE POLICY "Users can delete own carts"
  ON public.carts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 9. ORDERS — Customer orders and rider assignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rider_id uuid REFERENCES public.riders(id) ON DELETE SET NULL,
  status_key text NOT NULL DEFAULT 'placed',
  total numeric NOT NULL DEFAULT 0,
  placed_at bigint,
  assigned_at timestamptz,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_rider_id_idx ON public.orders (rider_id);
CREATE INDEX IF NOT EXISTS orders_status_key_idx ON public.orders (status_key);
CREATE INDEX IF NOT EXISTS orders_user_status_idx ON public.orders (user_id, status_key);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Customers can view their own orders
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Riders can view placed available orders or their assigned orders
DROP POLICY IF EXISTS "Riders can view available and own orders" ON public.orders;
CREATE POLICY "Riders can view available and own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    (rider_id IS NULL AND status_key = 'placed')
    OR rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
  );

-- Customers can create their own orders
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
CREATE POLICY "Users can create own orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Customers can update their own orders
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Riders can accept and update their assigned orders
DROP POLICY IF EXISTS "Riders can update own assigned orders" ON public.orders;
CREATE POLICY "Riders can update own assigned orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    (rider_id IS NULL AND status_key = 'placed')
    OR rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
  )
  WITH CHECK (
    rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
  );

-- Customers can delete their own orders
DROP POLICY IF EXISTS "Users can delete own orders" ON public.orders;
CREATE POLICY "Users can delete own orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 10. REVIEWS — Order ratings and customer reviews
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id text PRIMARY KEY,
  order_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, user_id)
);

CREATE INDEX IF NOT EXISTS reviews_order_id_idx ON public.reviews (order_id);
CREATE INDEX IF NOT EXISTS reviews_user_id_idx ON public.reviews (user_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reviews" ON public.reviews;
CREATE POLICY "Users can view own reviews"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own reviews" ON public.reviews;
CREATE POLICY "Users can create own reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;
CREATE POLICY "Users can delete own reviews"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 11. PAYMENTS — Saved payment instruments (UPI, cards) per user
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'upi',
  label text NOT NULL DEFAULT '',
  detail text DEFAULT '',
  icon text DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments (user_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own payments" ON public.payments;
CREATE POLICY "Users can manage own payments"
  ON public.payments FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 12. NOTIFICATIONS — In-app notifications per user
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  body text DEFAULT '',
  type text DEFAULT 'info',
  read boolean DEFAULT false,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications (user_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 13. PUSH_TOKENS — Push notification device tokens
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text DEFAULT 'android',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON public.push_tokens (user_id);
CREATE INDEX IF NOT EXISTS push_tokens_token_idx ON public.push_tokens (token);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own push tokens" ON public.push_tokens;
CREATE POLICY "Users can manage own push tokens"
  ON public.push_tokens FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ===========================================================================
-- 14. FUNCTIONS & RPCs
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- REDEEM_COUPON — Atomic coupon validation & redemption
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_coupon(
  p_user_id uuid,
  p_coupon_code text,
  p_order_id text,
  p_cart_total numeric,
  p_service_ids text[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_coupon record;
  v_use_count integer;
  v_discount numeric := 0;
  v_max_uses integer;
BEGIN
  -- 1) Look up the coupon with row lock
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE UPPER(TRIM(code)) = UPPER(TRIM(p_coupon_code))
    AND active = true
  FOR UPDATE;

  IF v_coupon IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Coupon not found or inactive');
  END IF;

  -- 2) Check minimum order total
  IF COALESCE(v_coupon.min_total, v_coupon.min_order, 0) > 0
     AND p_cart_total < COALESCE(v_coupon.min_total, v_coupon.min_order, 0) THEN
    RETURN jsonb_build_object('ok', false, 'error',
      format('Minimum order of ₹%s required', COALESCE(v_coupon.min_total, v_coupon.min_order, 0)));
  END IF;

  -- 3) Check service restriction
  IF v_coupon.service_id IS NOT NULL AND v_coupon.service_id <> '' THEN
    IF NOT (LOWER(v_coupon.service_id) = ANY(
      SELECT LOWER(unnest) FROM unnest(p_service_ids)
    )) THEN
      RETURN jsonb_build_object('ok', false, 'error',
        format('Valid only for %s orders', REPLACE(v_coupon.service_id, '-', ' ')));
    END IF;
  END IF;

  -- 4) Check usage limit
  v_max_uses := COALESCE(v_coupon.usage_limit, CASE WHEN v_coupon.one_time OR v_coupon.single_use THEN 1 ELSE NULL END);

  IF v_max_uses IS NOT NULL THEN
    SELECT COUNT(*) INTO v_use_count
    FROM public.coupon_uses
    WHERE user_id = p_user_id
      AND coupon_code = UPPER(TRIM(p_coupon_code));

    IF v_use_count >= v_max_uses THEN
      RETURN jsonb_build_object('ok', false, 'error', 'This coupon has already been used');
    END IF;
  END IF;

  -- 5) Calculate discount
  IF LOWER(COALESCE(v_coupon.type, v_coupon.discount_type, 'percent')) IN ('flat', 'fixed', 'amount', 'inr') THEN
    v_discount := LEAST(COALESCE(v_coupon.value, v_coupon.discount_value, 0), p_cart_total);
  ELSE
    v_discount := p_cart_total * (COALESCE(v_coupon.value, v_coupon.discount_value, 0) / 100.0);
    IF COALESCE(v_coupon.max_value, v_coupon.max_discount, 0) > 0 THEN
      v_discount := LEAST(v_discount, COALESCE(v_coupon.max_value, v_coupon.max_discount, 0));
    END IF;
  END IF;

  v_discount := GREATEST(v_discount, 0);

  -- 6) Record usage
  IF v_max_uses IS NOT NULL THEN
    INSERT INTO public.coupon_uses (user_id, coupon_id, coupon_code, order_id)
    VALUES (p_user_id, v_coupon.id, UPPER(TRIM(p_coupon_code)), p_order_id);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'discount_amount', v_discount,
    'coupon_id', v_coupon.id,
    'coupon_code', v_coupon.code
  );
END;
$$;


-- ---------------------------------------------------------------------------
-- DELETE_OWN_ACCOUNT — User App account deletion
-- Atomically deletes all user-owned rows across user tables and profiles.
-- Leaves riders table and rider data completely untouched.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  DELETE FROM public.reviews WHERE user_id = v_user_id;
  DELETE FROM public.coupon_uses WHERE user_id = v_user_id;
  DELETE FROM public.push_tokens WHERE user_id = v_user_id;
  DELETE FROM public.notifications WHERE user_id = v_user_id;
  DELETE FROM public.orders WHERE user_id = v_user_id;
  DELETE FROM public.payments WHERE user_id = v_user_id;
  DELETE FROM public.addresses WHERE user_id = v_user_id;
  DELETE FROM public.carts WHERE user_id = v_user_id;
  DELETE FROM public.profiles WHERE id = v_user_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;


-- ---------------------------------------------------------------------------
-- DELETE_OWN_RIDER_ACCOUNT — Rider App account deletion
-- Atomically unassigns pending orders and deletes rider profile.
-- Leaves customer user tables and profiles completely untouched.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_own_rider_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  UPDATE public.orders SET rider_id = NULL WHERE rider_id IN (
    SELECT id FROM public.riders WHERE user_id = v_user_id
  );

  DELETE FROM public.riders WHERE user_id = v_user_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;


-- ===========================================================================
-- 15. REALTIME PUBLICATIONS
-- ===========================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'riders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.riders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- In environments without the publication pre-created, log and continue
    RAISE NOTICE 'Realtime publication setup skipped or handled by Supabase default: %', SQLERRM;
END $$;


-- ===========================================================================
-- 16. STORAGE BUCKETS & POLICIES (Avatars & Item Photos)
-- ===========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('avatars', 'avatars', true),
           ('item-photos', 'item-photos', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Storage buckets setup skipped: %', SQLERRM;
END $$;


-- ===========================================================================
-- 17. SEED DATA (Services, Service Items, Coupons)
-- ===========================================================================

-- Services
INSERT INTO public.services (id, name, sub, icon, span, photo, tone, flat, price, sort, active)
VALUES
  ('wash-fold',  'Wash & Fold',  'By the kilo', 'shirt',     'span-2', 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=700&q=75', '#16279E', '',     '₹79/kg', 1,  true),
  ('wash-iron',  'Wash & Iron',  'Pressed & ready', 'droplet', 'span-2', 'https://images.unsplash.com/photo-1604335398980-ededcadcc37d?auto=format&fit=crop&w=700&q=75', '#0E1116', '',     '',       2,  true),
  ('iron-only',  'Iron Only',    'Crisp finish', 'iron',      'span-1', 'https://images.unsplash.com/photo-1604335398980-ededcadcc37d?auto=format&fit=crop&w=420&q=75', '#2540FF', '',     '₹15',    3,  true),
  ('dry-clean',  'Dry Clean',    'Delicate care', 'hanger',   'span-1', 'https://images.unsplash.com/photo-1567113463300-102a7eb3cb26?auto=format&fit=crop&w=420&q=75', '#0E1116', '',     '',       4,  true),
  ('premium',    'Premium',      'White-glove',   'star',     'span-1', '',     '',         'flat-ink', '',       5,  true),
  ('shoes',      'Shoes',        'Deep clean',    'shoe',     'span-1', 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=420&q=75', '#16279E', '',     '',       6,  true),
  ('bags',       'Bags',         'Leather-safe',  'bag',      'span-2', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=700&q=75', '#0E1116', '',     '',       7,  true),
  ('blankets',   'Blankets',     'Bulky items',   'calendar', 'span-2', 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=700&q=75', '#1F7A50', '',     '₹249',   8,  true),
  ('curtains',   'Curtains',     'Fresh & crisp', 'iron',     'span-2', 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=700&q=75', '#2540FF', '',     '₹199',   9,  true),
  ('carpets',    'Carpets',      'Deep clean',    'star',     'span-2', 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=700&q=75', '#1F7A50', '',     '₹299',   10, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  sub = EXCLUDED.sub,
  icon = EXCLUDED.icon,
  span = EXCLUDED.span,
  photo = EXCLUDED.photo,
  tone = EXCLUDED.tone,
  flat = EXCLUDED.flat,
  price = EXCLUDED.price,
  sort = EXCLUDED.sort,
  active = EXCLUDED.active;

-- Service Items
INSERT INTO public.service_items (id, service_id, name, icon, price, unit, sort)
VALUES
  -- Wash & Fold
  ('wf-kg',       'wash-fold',  'Mixed laundry',              'material-symbols:laundry-outline', 79,  'kg', 1),

  -- Wash & Iron
  ('wi-shirt',    'wash-iron',  'Shirt',                      'tabler:shirt',        30,  'pc', 1),
  ('wi-tshirt',   'wash-iron',  'T-Shirt',                    'boxicons:t-shirt',    25,  'pc', 2),
  ('wi-jeans',    'wash-iron',  'Jeans',                      'dinkie-icons:jeans',  45,  'pc', 3),
  ('wi-kurta',    'wash-iron',  'Kurta',                      'hugeicons:kurta',     40,  'pc', 4),
  ('wi-saree',    'wash-iron',  'Saree',                      'ph:dress',            70,  'pc', 5),

  -- Iron Only
  ('io-shirt',    'iron-only',  'Shirt',                      'tabler:shirt',        15,  'pc', 1),
  ('io-tshirt',   'iron-only',  'T-Shirt',                    'boxicons:t-shirt',    12,  'pc', 2),
  ('io-trouser',  'iron-only',  'Trouser',                    'mingcute:trouser-line', 20, 'pc', 3),
  ('io-kurta',    'iron-only',  'Kurta',                      'hugeicons:kurta',     18,  'pc', 4),

  -- Dry Clean
  ('dc-suit',     'dry-clean',  'Suit',                       'hugeicons:suit-02',   180, 'pc', 1),
  ('dc-saree',    'dry-clean',  'Saree',                      'ph:dress',            140, 'pc', 2),
  ('dc-dress',    'dry-clean',  'Dress',                      'ph:dress',            120, 'pc', 3),
  ('dc-coat',     'dry-clean',  'Coat / Jacket',              'mingcute:coat-line',  160, 'pc', 4),

  -- Premium
  ('pm-suit',     'premium',    'Premium Suit',               'fluent:premium-20-filled', 320, 'pc', 1),
  ('pm-saree',    'premium',    'Premium Saree',              'fluent:premium-20-filled', 260, 'pc', 2),
  ('pm-dress',    'premium',    'Premium Dress',              'fluent:premium-20-filled', 220, 'pc', 3),

  -- Shoes
  ('sh-sneakers', 'shoes',      'Sneakers',                   'boxicons:sneaker',    150, 'pc', 1),
  ('sh-formal',   'shoes',      'Formal shoes',               'maki:shoe',           180, 'pc', 2),
  ('sh-sandals',  'shoes',      'Sandals',                    'hugeicons:sandals',   120, 'pc', 3),

  -- Bags
  ('bg-handbag',  'bags',       'Handbag',                    'lucide:handbag',      220, 'pc', 1),
  ('bg-backpack', 'bags',       'Backpack',                   'material-symbols:backpack-outline-rounded', 180, 'pc', 2),
  ('bg-laptop',   'bags',       'Laptop bag',                 'fluent:backpack-add-28-regular', 200, 'pc', 3),

  -- Blankets
  ('bl-single',   'blankets',   'Blanket (single)',           'griddy-icons:blanket', 149, 'pc', 1),
  ('bl-double',   'blankets',   'Blanket (double)',           'griddy-icons:blanket', 249, 'pc', 2),
  ('bl-king',     'blankets',   'Blanket (king)',             'griddy-icons:blanket', 299, 'pc', 3),

  -- Curtains
  ('ct-pair',     'curtains',   'Curtains (pair)',            'mingcute:curtain-line', 199, 'pc', 1),
  ('ct-3panel',   'curtains',   'Curtains (3 panels)',        'mingcute:curtain-line', 249, 'pc', 2),

  -- Carpets
  ('cp-small',    'carpets',    'Carpet (small)',             'mdi:carpet',          299, 'pc', 1),
  ('cp-medium',   'carpets',    'Carpet (medium)',            'mdi:carpet',          449, 'pc', 2),
  ('cp-large',    'carpets',    'Carpet (large)',             'mdi:carpet',          599, 'pc', 3)
ON CONFLICT (id) DO UPDATE SET
  service_id = EXCLUDED.service_id,
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  price = EXCLUDED.price,
  unit = EXCLUDED.unit,
  sort = EXCLUDED.sort;

-- Coupons
INSERT INTO public.coupons (id, code, title, name, tag, description, type, value, min_total, max_value, service_id, service_type, one_time, active, sort, tone)
VALUES
  ('FRESH20', 'FRESH20', 'Weekend special', 'Weekend special', '20% off', 'On your next dry cleaning order.', 'percent', 20, 0, 0, 'dry-clean', 'dry-clean', false, true, 1, '#C9821A'),
  ('NEW50',   'NEW50',   'Welcome offer',   'Welcome offer',   '50% off', 'On your very first order. Up to ₹150.', 'percent', 50, 0, 150, null, null, true, true, 2, '#16279E'),
  ('FREEPICK','FREEPICK','Free pickup',     'Free pickup',     'Free delivery', 'On all orders above ₹499.', 'flat', 0, 499, 0, null, null, false, true, 3, '#1F7A50')
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  title = EXCLUDED.title,
  name = EXCLUDED.name,
  tag = EXCLUDED.tag,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  value = EXCLUDED.value,
  min_total = EXCLUDED.min_total,
  max_value = EXCLUDED.max_value,
  service_id = EXCLUDED.service_id,
  service_type = EXCLUDED.service_type,
  one_time = EXCLUDED.one_time,
  active = EXCLUDED.active,
  sort = EXCLUDED.sort,
  tone = EXCLUDED.tone;
