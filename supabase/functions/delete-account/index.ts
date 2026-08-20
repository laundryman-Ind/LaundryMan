// Supabase Edge Function: permanently delete the authenticated user's account.
//
// Why an Edge Function? The browser can never delete an auth user directly —
// that needs the service-role key, which must never ship to the client. This
// function holds the key server-side, verifies the caller's JWT, then deletes
// the profile row and the auth account.
//
// Deploy (from the repo root, with the Supabase CLI linked to the project):
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role key>
//   supabase functions deploy delete-account
//
// The function is invoked as: POST /functions/v1/delete-account
// with `Authorization: Bearer <user access token>` (supabase-js adds this
// automatically). Gateway verifies the JWT signature; the function further
// verifies it belongs to a real authenticated user before deleting anything.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Restrict to the app's own origins when in production; '*' is fine for the
// current local/dev setup.
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
    // 1) Verify the caller — the user's access token must resolve to a real
    //    authenticated user. This is the ONLY identity we act on.
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      return json({ error: 'Not authenticated' }, 401)
    }

    const { data: { user }, error: verifyErr } = await supabase.auth.getUser(token)
    if (verifyErr || !user) {
      return json({ error: 'Invalid or expired session' }, 401)
    }

    // 2) Remove every user-owned record in the app tables before deleting the
    //    auth account. Order matters: delete children first, then parents.
    //    The service-role key bypasses RLS server-side.
    const userTables = [
      'reviews',        // references orders (order_id)
      'coupon_uses',    // references coupons (coupon_id)
      'push_tokens',    // device tokens for notifications
      'notifications',  // in-app notification inbox
      'orders',         // contains the full order object in data
      'payments',       // saved payment instruments
      'addresses',      // saved delivery addresses
      'carts',          // per-user shopping cart
    ]

    for (const table of userTables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', user.id)
      if (error) {
        // Log but don't block deletion for non-critical tables
        console.warn(`Failed to delete ${table} for user ${user.id}:`, error.message)
      }
    }

    // 3) Delete the user's profile row. Service role legitimately bypasses
    //    RLS server-side; the client RLS policies are untouched.
    const { error: profileErr } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id)
    if (profileErr) {
      return json({ error: `Could not delete profile: ${profileErr.message}` }, 500)
    }

    // 4) Delete the auth account. The profile row is also cascaded by the FK
    //    (ON DELETE CASCADE) when that constraint exists.
    const { error: delErr } = await supabase.auth.admin.deleteUser(user.id)
    if (delErr) {
      return json({ error: `Could not delete account: ${delErr.message}` }, 500)
    }

    return json({ ok: true })
  } catch (err) {
    return json({
      error: err instanceof Error ? err.message : 'Unexpected error during deletion',
    }, 500)
  }
})
