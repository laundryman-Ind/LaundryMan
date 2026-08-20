-- Migration 0003: Fix sync + coupon integrity
-- Run in Supabase SQL Editor → Run. Idempotent: safe to re-run.

-- =========================================================================
-- 1) UNIQUE constraint on coupon_uses — prevents the same user from
--    redeeming the same coupon code twice, even from concurrent requests.
-- =========================================================================

-- Drop if exists so re-run is safe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coupon_uses_user_coupon_unique'
  ) THEN
    ALTER TABLE public.coupon_uses DROP CONSTRAINT coupon_uses_user_coupon_unique;
  END IF;
END $$;

-- Before adding the constraint, clean up any existing duplicates (keep earliest)
DELETE FROM public.coupon_uses a
USING public.coupon_uses b
WHERE a.user_id = b.user_id
  AND a.coupon_code = b.coupon_code
  AND a.coupon_code <> ''
  AND a.created_at > b.created_at;

ALTER TABLE public.coupon_uses
  ADD CONSTRAINT coupon_uses_user_coupon_unique UNIQUE (user_id, coupon_code);


-- =========================================================================
-- 2) Add usage_limit column to coupons — NULL means unlimited uses.
--    one_time=true maps to usage_limit=1 at the app level.
-- =========================================================================

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS usage_limit integer DEFAULT NULL;

-- Backfill: set usage_limit=1 for existing one_time coupons
UPDATE public.coupons SET usage_limit = 1 WHERE one_time = true AND usage_limit IS NULL;


-- =========================================================================
-- 3) RPC function: redeem_coupon — atomically validates eligibility and
--    inserts a coupon_uses row in a single transaction. Returns a JSON
--    object with { ok, error, discount_amount }.
--
--    Called from the place-order Edge Function. Cannot be bypassed from
--    the client because coupon_uses INSERT policy is restricted below.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.redeem_coupon(
  p_user_id uuid,
  p_coupon_code text,
  p_order_id text,
  p_cart_total numeric,
  p_service_ids text[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER  -- runs with table owner privileges, bypasses RLS
AS $$
DECLARE
  v_coupon record;
  v_use_count integer;
  v_discount numeric := 0;
  v_max_uses integer;
BEGIN
  -- 1) Look up the coupon
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE UPPER(TRIM(code)) = UPPER(TRIM(p_coupon_code))
    AND active = true
  FOR UPDATE;  -- lock the row to prevent concurrent reads

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
    -- percent
    v_discount := p_cart_total * (COALESCE(v_coupon.value, v_coupon.discount_value, 0) / 100.0);
    IF COALESCE(v_coupon.max_value, v_coupon.max_discount, 0) > 0 THEN
      v_discount := LEAST(v_discount, COALESCE(v_coupon.max_value, v_coupon.max_discount, 0));
    END IF;
  END IF;

  v_discount := GREATEST(v_discount, 0);

  -- 6) Record usage (only if there's a usage limit — unlimited coupons don't need tracking)
  IF v_max_uses IS NOT NULL THEN
    INSERT INTO public.coupon_uses (user_id, coupon_id, coupon_code, order_id)
    VALUES (p_user_id, v_coupon.id, UPPER(TRIM(p_coupon_code)), p_order_id);
    -- The UNIQUE constraint will cause this to fail if a concurrent request
    -- already inserted a row, which is exactly the behavior we want.
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'discount_amount', v_discount,
    'coupon_id', v_coupon.id,
    'coupon_code', v_coupon.code
  );
END;
$$;


-- =========================================================================
-- 4) Tighten RLS on coupon_uses: users can SELECT their own rows, but
--    INSERT is restricted to the redeem_coupon function (SECURITY DEFINER).
--    This prevents client-side code from directly inserting coupon_uses.
-- =========================================================================

-- Keep the existing SELECT policy (users can view own)
-- Drop the INSERT policy so only the RPC function can insert
DROP POLICY IF EXISTS "Users can record own coupon use" ON public.coupon_uses;

-- Add a DELETE policy so the place-order function can clean up on failure
-- (uses SECURITY DEFINER, so this policy is for completeness)
DROP POLICY IF EXISTS "Users can delete own coupon use" ON public.coupon_uses;
CREATE POLICY "Users can delete own coupon use"
ON public.coupon_uses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- =========================================================================
-- Test queries (run manually to verify)
-- =========================================================================
-- SELECT conname FROM pg_constraint WHERE conrelid = 'public.coupon_uses'::regclass;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'usage_limit';
-- SELECT proname FROM pg_proc WHERE proname = 'redeem_coupon';
