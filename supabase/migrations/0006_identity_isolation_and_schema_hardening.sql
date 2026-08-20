-- =========================================================================
-- Migration 0006: User/Rider Identity Isolation & Schema Hardening
-- =========================================================================
-- Ensures complete identity and data separation between User and Rider apps:
-- 1. Profiles table is exclusively for User App users (keyed by auth.users.id).
-- 2. Riders table is exclusively for Rider App delivery partners.
-- 3. RLS policies guarantee no cross-app data leaks.
-- 4. User account deletion strictly wipes user tables without affecting rider data.
-- 5. Rider account deletion RPC for dedicated rider cleanup.
-- =========================================================================

-- 1) USER PROFILES: Ensure RLS is strictly scoped to auth.uid()
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


-- 2) RIDER PROFILES: Ensure RLS is strictly scoped to auth.uid()
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

-- Public read for active riders (used in customer live order tracking UI)
DROP POLICY IF EXISTS "Anyone can view active riders" ON public.riders;
CREATE POLICY "Anyone can view active riders"
ON public.riders FOR SELECT
TO anon, authenticated
USING (active = true);


-- 3) ORDERS: Strict isolation for User & Rider
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders"
ON public.orders FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Riders can view available and own orders" ON public.orders;
CREATE POLICY "Riders can view available and own orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  (rider_id IS NULL AND status_key = 'placed')
  OR rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
CREATE POLICY "Users can create own orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
CREATE POLICY "Users can update own orders"
ON public.orders FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Riders can update own assigned orders" ON public.orders;
CREATE POLICY "Riders can update own assigned orders"
ON public.orders FOR UPDATE
TO authenticated
USING (rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()))
WITH CHECK (rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own orders" ON public.orders;
CREATE POLICY "Users can delete own orders"
ON public.orders FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- 4) USER-SPECIFIC TABLES: Ensure RLS strictly checks auth.uid() = user_id
-- Addresses
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own addresses" ON public.addresses;
CREATE POLICY "Users can view own addresses" ON public.addresses FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own addresses" ON public.addresses;
CREATE POLICY "Users can create own addresses" ON public.addresses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own addresses" ON public.addresses;
CREATE POLICY "Users can update own addresses" ON public.addresses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own addresses" ON public.addresses;
CREATE POLICY "Users can delete own addresses" ON public.addresses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Carts
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own carts" ON public.carts;
CREATE POLICY "Users can view own carts" ON public.carts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own carts" ON public.carts;
CREATE POLICY "Users can create own carts" ON public.carts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own carts" ON public.carts;
CREATE POLICY "Users can update own carts" ON public.carts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own carts" ON public.carts;
CREATE POLICY "Users can delete own carts" ON public.carts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own reviews" ON public.reviews;
CREATE POLICY "Users can view own reviews" ON public.reviews FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own reviews" ON public.reviews;
CREATE POLICY "Users can create own reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;
CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own payments" ON public.payments;
CREATE POLICY "Users can manage own payments" ON public.payments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Push Tokens
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own push tokens" ON public.push_tokens;
CREATE POLICY "Users can manage own push tokens" ON public.push_tokens FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 5) RPC: delete_own_account — User App account deletion
-- Atomically deletes all user-owned rows and the profile row.
-- Does NOT touch riders table or rider data.
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


-- 6) RPC: delete_own_rider_account — Rider App account deletion
-- Atomically deletes rider profile for the authenticated rider.
-- Does NOT touch user tables or user profile.
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

  -- Unassign from pending orders so orders remain intact
  UPDATE public.orders SET rider_id = NULL WHERE rider_id IN (
    SELECT id FROM public.riders WHERE user_id = v_user_id
  );

  DELETE FROM public.riders WHERE user_id = v_user_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;
