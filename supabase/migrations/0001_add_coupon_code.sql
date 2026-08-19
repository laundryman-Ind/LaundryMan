-- Migration: ensure `coupon_code` exists on public.coupon_uses
-- Run these statements in Supabase SQL Editor (or via psql) to sync DB with schema.sql

-- 1) Inspect existing columns
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'coupon_uses'
ORDER BY ordinal_position;

-- 2) Add the missing column (safe if already present)
BEGIN;
ALTER TABLE public.coupon_uses
  ADD COLUMN IF NOT EXISTS coupon_code text NOT NULL DEFAULT '';

-- 3) Create index used by the app
CREATE INDEX IF NOT EXISTS coupon_uses_coupon_code_idx ON public.coupon_uses (coupon_code);
COMMIT;

-- 4) Optional: if you have a mapping from coupon_id -> coupons.code, populate coupon_code
-- NOTE: run only if coupon_id is set and coupons.id corresponds to coupon_uses.coupon_id
-- UPDATE public.coupon_uses cu
-- SET coupon_code = c.code
-- FROM public.coupons c
-- WHERE cu.coupon_code = '' AND cu.coupon_id IS NOT NULL AND c.id = cu.coupon_id;

-- 5) Verify
SELECT id, coupon_id, coupon_code, order_id, created_at FROM public.coupon_uses LIMIT 20;
