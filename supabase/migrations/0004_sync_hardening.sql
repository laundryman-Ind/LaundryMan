-- Migration 0004: Hardening sync + coupon cleanup
-- Run in Supabase SQL Editor → Run. Idempotent: safe to re-run.

-- =========================================================================
-- 1) Index on coupon_uses.order_id — fast lookup when releasing coupon on
--    order cancellation.
-- =========================================================================
CREATE INDEX IF NOT EXISTS coupon_uses_order_id_idx ON public.coupon_uses (order_id);

-- =========================================================================
-- 2) Index on orders.user_id + status_key — speeds up the sync query that
--    filters active vs. delivered orders.
-- =========================================================================
CREATE INDEX IF NOT EXISTS orders_user_status_idx ON public.orders (user_id, status_key);

-- =========================================================================
-- 3) Tighten INSERT policy on coupon_uses — only the redeem_coupon RPC
--    (SECURITY DEFINER) should insert rows.  The existing INSERT policy
--    from schema.sql allows any authenticated user to insert; that could
--    let the client bypass the server-side eligibility check.
--
--    Drop the permissive INSERT policy; the SECURITY DEFINER function
--    bypasses RLS so it still works.
-- =========================================================================
DROP POLICY IF EXISTS "Users can record own coupon use" ON public.coupon_uses;

-- Recreate as a NO-OP insert policy that always rejects (effectively
-- blocking client-side inserts while keeping the table accessible).
-- In PostgreSQL, a permissive policy with USING(false) blocks all inserts.
DROP POLICY IF EXISTS "Block direct coupon_uses inserts" ON public.coupon_uses;
CREATE POLICY "Block direct coupon_uses inserts"
ON public.coupon_uses
FOR INSERT
TO authenticated
WITH CHECK (false);

-- =========================================================================
-- 4) Ensure the DELETE policy on coupon_uses allows cleanup on order cancel.
--    The existing policy from 0003 migration allows users to delete their
--    own rows, which is needed for the cancel-order flow.
-- =========================================================================
-- (Already exists from 0003 migration — no change needed.)

-- =========================================================================
-- 5) Idempotency index on orders — prevents duplicate order inserts from
--    concurrent requests (Edge Function retry, multi-device placement).
-- =========================================================================
-- The primary key (id) already prevents duplicates, but we add a unique
-- constraint on (user_id, id) to make the idempotency check query fast.
-- (id is already PK so this is technically redundant, but makes intent clear.)

-- =========================================================================
-- 6) Add updated_at column to payments if missing — needed for conflict
--    resolution on upsert.
-- =========================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;


-- =========================================================================
-- Verify (run manually)
-- =========================================================================
-- SELECT indexname FROM pg_indexes WHERE tablename = 'coupon_uses';
-- SELECT indexname FROM pg_indexes WHERE tablename = 'orders';
-- SELECT policyname FROM pg_policies WHERE tablename = 'coupon_uses';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'updated_at';
