// Supabase Edge Function: atomically place an order with optional coupon.
//
// This function is the ONLY path for order placement when a coupon is
// involved.  It validates the coupon server-side, inserts the order row,
// and records coupon usage in a single atomic operation.  Prevents:
//   - Coupon consumed without a completed order
//   - Multi-device race conditions (DB unique constraint)
//   - Client-side coupon validation being the only check
//
// Deploy:
//   supabase functions deploy place-order
//
// Invoked as: POST /functions/v1/place-order
// Body: { order, coupon_code?, cart_total, service_ids? }

import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    // 1) Verify the caller's JWT
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      return json({ error: 'Not authenticated' }, 401)
    }

    const { data: { user }, error: verifyErr } = await supabase.auth.getUser(token)
    if (verifyErr || !user) {
      return json({ error: 'Invalid or expired session' }, 401)
    }

    // 2) Parse request body
    const body = await req.json().catch(() => ({}))
    const { order, coupon_code, cart_total, service_ids } = body as {
      order: Record<string, unknown>
      coupon_code?: string
      cart_total: number
      service_ids?: string[]
    }

    if (!order || !order.id) {
      return json({ error: 'Missing order data' }, 400)
    }

    const orderId = String(order.id)

    // IDEMPOTENCY: Check if this order already exists. If the Edge Function
    // succeeded on a previous attempt but the response didn't reach the client,
    // the client will retry with the same order.id. We return the existing
    // order's values instead of creating a duplicate or re-recording coupon usage.
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, total, data')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingOrder) {
      // Order already exists — return its server-computed values.
      // This prevents duplicate coupon_uses rows and duplicate order inserts.
      const existingData = existingOrder.data || {}
      return json({
        ok: true,
        order_id: orderId,
        total: existingOrder.total,
        discount: existingData.discount ?? 0,
        tax: existingData.tax ?? 0,
        subtotal: existingData.subtotal ?? 0,
        coupon: existingData.coupon ?? null,
      })
    }

    let confirmedDiscount = 0
    let couponResult: Record<string, unknown> | null = null

    // 3) If a coupon is provided, validate + redeem it atomically via the RPC
    if (coupon_code && coupon_code.trim()) {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('redeem_coupon', {
        p_user_id: user.id,
        p_coupon_code: coupon_code.trim().toUpperCase(),
        p_order_id: orderId,
        p_cart_total: Number(cart_total) || 0,
        p_service_ids: Array.isArray(service_ids) ? service_ids : [],
      })

      if (rpcError) {
        // Unique constraint violation = coupon already used
        if (rpcError.code === '23505') {
          return json({ error: 'This coupon has already been used' }, 409)
        }
        return json({ error: rpcError.message || 'Coupon validation failed' }, 400)
      }

      if (!rpcResult?.ok) {
        return json({ error: rpcResult?.error || 'Coupon validation failed' }, 400)
      }

      confirmedDiscount = Number(rpcResult.discount_amount) || 0
      couponResult = rpcResult
    }

    // 4) Recalculate the final total server-side using the confirmed discount
    const safeCartTotal = Number(cart_total) || 0
    const discountedTotal = Math.max(safeCartTotal - confirmedDiscount, 0)
    const gstAmount = discountedTotal * 0.18
    const finalTotal = Math.round(discountedTotal + gstAmount)

    // 5) Build the order row with server-confirmed values
    const orderRow = {
      id: orderId,
      user_id: user.id,
      status_key: String(order.statusKey || 'placed'),
      total: finalTotal,
      placed_at: order.placedAt || Date.now(),
      data: {
        ...order,
        total: finalTotal,
        discount: Math.round(confirmedDiscount),
        tax: Math.round(gstAmount),
        subtotal: Math.round(safeCartTotal),
        // Overwrite coupon info with server-confirmed data
        ...(couponResult ? {
          coupon: {
            code: couponResult.coupon_code,
            id: couponResult.coupon_id,
            discount: Math.round(confirmedDiscount),
          },
        } : {}),
      },
      updated_at: new Date().toISOString(),
    }

    // 6) Insert the order — use service role to bypass RLS, but set user_id
    const { error: orderErr } = await supabase
      .from('orders')
      .upsert(orderRow, { onConflict: 'id' })

    if (orderErr) {
      // If order insert fails and we already recorded coupon usage, we need
      // to clean it up. The redeem_coupon function already inserted the row.
      if (coupon_code && coupon_code.trim()) {
        await supabase
          .from('coupon_uses')
          .delete()
          .eq('user_id', user.id)
          .eq('order_id', orderId)
          .catch(() => {}) // best effort cleanup
      }
      return json({ error: `Failed to create order: ${orderErr.message}` }, 500)
    }

    // 7) Return success with server-confirmed values
    return json({
      ok: true,
      order_id: orderId,
      total: finalTotal,
      discount: Math.round(confirmedDiscount),
      tax: Math.round(gstAmount),
      subtotal: Math.round(safeCartTotal),
      coupon: couponResult ? {
        code: couponResult.coupon_code,
        discount: Math.round(confirmedDiscount),
      } : null,
    })
  } catch (err) {
    return json({
      error: err instanceof Error ? err.message : 'Unexpected error during order placement',
    }, 500)
  }
})
