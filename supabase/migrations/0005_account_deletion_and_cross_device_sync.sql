-- =========================================================================
-- Migration 0005: Account Deletion & Cross-Device Sync
-- =========================================================================

-- 1) Allow authenticated users to delete their own profile row via RLS
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- 2) RPC function: delete_own_account — atomically wipes all user records
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
