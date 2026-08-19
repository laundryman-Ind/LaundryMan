// Laundry Man — data layer on top of Supabase.
//
// All profile operations are tied to the *authenticated* Supabase session:
// the row id is auth.uid(), so Row Level Security (select/insert/update on
// own row only) is respected. When Supabase isn't configured the calls
// resolve to null and the app keeps working purely from localStorage.
//
// The local React state (AppContext) stays the source of truth for the UI;
// these functions persist that state to the database.

import { supabase, isSupabaseConfigured } from './supabase'

const PROFILES = 'profiles'
const ADDRESSES = 'addresses'
const ORDERS = 'orders'
const REVIEWS = 'reviews'
const CARTS = 'carts'

export const isBackendReady = isSupabaseConfigured

// Resolve the authenticated user's id, or throw when there's no session.
const uid = async () => {
  const user = await currentUser()
  if (!user) throw new Error('Not signed in to Supabase')
  return user.id
}

// Surface the raw database error as-is — the schema is set up, so a failure
// here is a real problem worth showing verbatim rather than a setup hint.
const hint = (error) => (error && error.message) || 'Database error'

// The authenticated user (id, phone) from the active session, or null.
export const currentUser = async () => {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return null
  return data.user
}

// Create the profile row for the signed-in user, or update it if it exists.
// The row id is always auth.uid(); phone falls back to the session phone
// (the verified number) unless an override is passed.
export const upsertProfile = async ({ phone, name, photo = null }) => {
  if (!isSupabaseConfigured) return null
  const user = await currentUser()
  if (!user) throw new Error('Not signed in to Supabase')
  const { data, error } = await supabase
    .from(PROFILES)
    .upsert(
      {
        id: user.id,
        phone: phone || user.phone || '',
        name,
        photo,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
  if (error) throw new Error(hint(error))
  return data
}

export const getProfile = async () => {
  if (!isSupabaseConfigured) return null
  const user = await currentUser()
  if (!user) return null
  const { data, error } = await supabase
    .from(PROFILES)
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  if (error) throw new Error(hint(error))
  return data
}

// Permanently delete the signed-in user's Supabase account AND their profile
// row, via the delete-account Edge Function (supabase/functions/delete-account).
// The function runs server-side with the service-role key — never in the app —
// verifies the caller's JWT, deletes the profile row, then the auth user.
// supabase-js attaches the user's access token to the request automatically.
export const deleteAccount = async () => {
  if (!isSupabaseConfigured) return null
  const user = await currentUser()
  if (!user) throw new Error('Not signed in to Supabase')
  const { data, error } = await supabase.functions.invoke('delete-account')
  if (error) {
    const body = error.context || {}
    throw new Error(body.error || error.message || 'Account deletion failed')
  }
  return data
}

export const updateProfile = async (patch) => {
  if (!isSupabaseConfigured) return null
  const user = await currentUser()
  if (!user) throw new Error('Not signed in to Supabase')
  const { data, error } = await supabase
    .from(PROFILES)
    .update(patch)
    .eq('id', user.id)
    .select()
    .maybeSingle()
  if (error) throw new Error(hint(error))
  return data
}

// ---------------------------------------------------------------------------
// ADDRESSES — full app object in `data`, keyed by user_id = auth.uid().
// ---------------------------------------------------------------------------

export const listAddresses = async () => {
  if (!isSupabaseConfigured) return []
  const id = await uid()
  // Try selecting the 'data' jsonb column first; fall back to '*' if it doesn't exist.
  let res = await supabase
    .from(ADDRESSES)
    .select('data')
    .eq('user_id', id)
    .order('created_at', { ascending: true })
  if (res.error) {
    res = await supabase
      .from(ADDRESSES)
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: true })
  }
  if (res.error) throw new Error(hint(res.error))
  return (res.data || []).map((r) => r.data || r)
}

export const upsertAddress = async (addr) => {
  if (!isSupabaseConfigured) return null
  const id = await uid()
  const { error } = await supabase.from(ADDRESSES).upsert(
    {
      id: addr.id,
      user_id: id,
      label: addr.label || '',
      line: addr.line || '',
      data: addr,
    },
    { onConflict: 'id' }
  )
  if (error) throw new Error(hint(error))
  return addr
}

export const removeAddress = async (addrId) => {
  if (!isSupabaseConfigured) return null
  const id = await uid()
  const { error } = await supabase
    .from(ADDRESSES)
    .delete()
    .eq('id', addrId)
    .eq('user_id', id)
  if (error) throw new Error(hint(error))
  return true
}

// ---------------------------------------------------------------------------
// ORDERS — full app order object in `data`, keyed by user_id = auth.uid().
// ---------------------------------------------------------------------------

export const listOrders = async () => {
  if (!isSupabaseConfigured) return []
  const id = await uid()
  // Try 'data' column first; fall back to '*' if column doesn't exist.
  let res = await supabase
    .from(ORDERS)
    .select('data')
    .eq('user_id', id)
    .order('placed_at', { ascending: false, nullsFirst: false })
  if (res.error) {
    res = await supabase
      .from(ORDERS)
      .select('*')
      .eq('user_id', id)
      .order('placed_at', { ascending: false, nullsFirst: false })
  }
  if (res.error) throw new Error(hint(res.error))
  return (res.data || []).map((r) => r.data || r).filter((o) => !o?.hiddenAt)
}

export const upsertOrder = async (order) => {
  if (!isSupabaseConfigured) return null
  const id = await uid()
  const { error } = await supabase.from(ORDERS).upsert(
    {
      id: order.id,
      user_id: id,
      status_key: order.statusKey || '',
      total: order.total || 0,
      placed_at: order.placedAt || null,
      data: order,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )
  if (error) throw new Error(hint(error))
  return order
}

export const deleteAllOrders = async () => {
  if (!isSupabaseConfigured) return null
  const id = await uid()
  const { error } = await supabase.from(ORDERS).delete().eq('user_id', id)
  if (error) throw new Error(hint(error))
  return true
}

// ---------------------------------------------------------------------------
// ORDER HISTORY — soft-delete / archive / history-hidden
//
// "Clear order history" does NOT permanently delete rows from the orders
// table.  Instead it sets a `hiddenAt` timestamp inside each row's `data`
// jsonb column.  This preserves payment / accounting records while hiding
// the orders from the user's view across every device.
// ---------------------------------------------------------------------------

/**
 * Soft-delete every order for the current user by writing a `hiddenAt`
 * timestamp into each row's `data` jsonb.  The rows stay in the database
 * for accounting; they are simply excluded from normal fetches.
 */
export const hideAllOrders = async () => {
  if (!isSupabaseConfigured) return null
  const id = await uid()

  // Fetch every order row (id + data) for this user.
  const { data: rows, error: fetchErr } = await supabase
    .from(ORDERS)
    .select('id, data')
    .eq('user_id', id)

  if (fetchErr) throw new Error(hint(fetchErr))
  if (!rows || rows.length === 0) return true

  const now = new Date().toISOString()

  // Update each row individually so we don't hit Supabase's body-size limit
  // on a single PATCH, and each update is atomic.
  const results = await Promise.all(
    rows.map((row) => {
      const data = row.data || {}
      return supabase
        .from(ORDERS)
        .update({ data: { ...data, hiddenAt: now }, updated_at: now })
        .eq('id', row.id)
        .eq('user_id', id)
    })
  )

  const failures = results.filter((r) => r.error)
  if (failures.length) {
    console.warn(`${failures.length}/${rows.length} orders failed to hide`, failures[0].error)
    throw new Error('Failed to hide some orders')
  }
  return true
}

/**
 * Return ALL orders for the current user — including hidden ones.
 * Used by the sync logic to decide whether the database is the source of
 * truth (even if every visible order has been hidden by another device).
 */
export const listAllOrders = async () => {
  if (!isSupabaseConfigured) return []
  const id = await uid()
  let res = await supabase
    .from(ORDERS)
    .select('data')
    .eq('user_id', id)
    .order('placed_at', { ascending: false, nullsFirst: false })
  if (res.error) {
    res = await supabase
      .from(ORDERS)
      .select('*')
      .eq('user_id', id)
      .order('placed_at', { ascending: false, nullsFirst: false })
  }
  if (res.error) throw new Error(hint(res.error))
  return (res.data || []).map((r) => r.data || r)
}

// ---------------------------------------------------------------------------
// REVIEWS — one per order, keyed by user_id = auth.uid().
// ---------------------------------------------------------------------------

export const listReviews = async () => {
  if (!isSupabaseConfigured) return []
  const id = await uid()
  const { data, error } = await supabase
    .from(REVIEWS)
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
  if (error) throw new Error(hint(error))
  return data || []
}

export const upsertReview = async (review) => {
  if (!isSupabaseConfigured) return null
  const id = await uid()
  // Use onConflict: 'id' (primary key) rather than 'order_id,user_id'
  // because the id column always conflicts first for the same order,
  // and PostgreSQL only checks the specified constraint for ON CONFLICT.
  const reviewId = review.id || `r_${review.orderId}_${id}`
  const { error } = await supabase.from(REVIEWS).upsert(
    {
      id: reviewId,
      order_id: review.orderId,
      user_id: id,
      rating: review.rating,
      comment: review.comment || '',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )
  if (error) throw new Error(hint(error))
  return review
}

// ---------------------------------------------------------------------------
// CART — a single per-user cart stored in `data` jsonb, keyed by user_id = auth.uid().
// ---------------------------------------------------------------------------

export const getCart = async () => {
  if (!isSupabaseConfigured) return {}
  const id = await uid()
  let res = await supabase
    .from(CARTS)
    .select('data')
    .eq('user_id', id)
    .maybeSingle()
  if (res.error) {
    res = await supabase
      .from(CARTS)
      .select('*')
      .eq('user_id', id)
      .maybeSingle()
  }
  if (res.error) throw new Error(hint(res.error))
  return (res.data && res.data.data) ? res.data.data : {}
}

export const upsertCart = async (cart) => {
  if (!isSupabaseConfigured) return null
  const id = await uid()
  const { error } = await supabase.from(CARTS).upsert(
    {
      id: id,
      user_id: id,
      data: cart,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )
  if (error) throw new Error(hint(error))
  return cart
}

export const deleteReview = async (reviewId) => {
  if (!isSupabaseConfigured) return null
  const id = await uid()
  const { error } = await supabase
    .from(REVIEWS)
    .delete()
    .eq('id', reviewId)
    .eq('user_id', id)
  if (error) throw new Error(hint(error))
  return true
}

// ---------------------------------------------------------------------------
// CATALOG — public services + coupons (no auth needed; RLS allows anon reads).
// ---------------------------------------------------------------------------

// Services with their priced items, in display order.
// Tries a nested join first (service_items FK); falls back to a flat
// two-query approach if the FK or nested resource is unavailable.
export const listServices = async () => {
  if (!isSupabaseConfigured) return null
  // Attempt 1: nested join (requires FK from service_items → services)
  try {
    const { data, error } = await supabase
      .from('services')
      .select('id, name, sub, icon, span, photo, tone, flat, price, sort, service_items(id, name, icon, price, unit, sort)')
      .eq('active', true)
      .order('sort')
    if (!error && data) {
      return data.map((r) => ({
        id: r.id, name: r.name, sub: r.sub, icon: r.icon, span: r.span,
        photo: r.photo, tone: r.tone, flat: r.flat, price: r.price,
        items: (r.service_items || []).slice().sort((a, b) => a.sort - b.sort)
          .map((it) => ({ id: it.id, name: it.name, icon: it.icon, price: Number(it.price), unit: it.unit })),
      }))
    }
  } catch { /* FK or join unavailable — fall through */ }
  // Attempt 2: flat query — fetch services and items separately
  try {
    const [svcRes, itemRes] = await Promise.all([
      supabase.from('services').select('*').eq('active', true).order('sort'),
      supabase.from('service_items').select('*').order('sort'),
    ])
    if (svcRes.error) throw svcRes.error
    const svcData = svcRes.data || []
    const itemData = (!itemRes.error && itemRes.data) ? itemRes.data : []
    // Group items by service_id
    const itemsByService = new Map()
    for (const it of itemData) {
      const key = it.service_id || it.serviceId || ''
      if (!itemsByService.has(key)) itemsByService.set(key, [])
      itemsByService.get(key).push(it)
    }
    return svcData.map((r) => ({
      id: r.id, name: r.name, sub: r.sub, icon: r.icon, span: r.span,
      photo: r.photo, tone: r.tone, flat: r.flat, price: r.price,
      items: (itemsByService.get(r.id) || []).map((it) => ({
        id: it.id, name: it.name, icon: it.icon, price: Number(it.price), unit: it.unit,
      })),
    }))
  } catch {
    return null // both approaches failed — caller falls back to mock
  }
}

// ---------------------------------------------------------------------------
// COUPONS — public catalog of available coupons.
// The actual Supabase table is `coupons`. We also check `offers` and
// `promo_codes` as fallback names for portability.
// ---------------------------------------------------------------------------

// Canonicalize a coupon type string to 'percent' or 'flat'.
const normalizeCouponType = (raw) => {
  const t = String(raw || '').toLowerCase().trim()
  if (['flat', 'fixed', 'amount', 'inr', 'rupee', 'rupees'].includes(t)) return 'flat'
  return 'percent'
}

// Map a raw DB row into the normalized coupon shape the frontend expects.
const mapCouponRow = (row, table) => ({
  id: row.id || row.code || row.coupon_code || row.promo_code || `${table}-${Math.random()}`,
  code: String(row.code || row.coupon_code || row.promo_code || row.id || '').toUpperCase(),
  title: row.title || row.name || row.label || 'Offer',
  tag: row.tag || row.subtitle || 'Limited-time offer',
  desc: row.desc || row.description || row.details || 'Use this offer on checkout.',
  type: normalizeCouponType(row.type || row.discount_type),
  value: Number(row.value ?? row.discount_value ?? row.amount ?? row.discount ?? row.percentage ?? row.percent ?? 0),
  min_total: Number(row.min_total ?? row.min_order ?? row.minimum_total ?? row.minimum_order ?? row.min_amount ?? 0),
  service_id: row.service_id || row.serviceId || row.applies_to || row.category || null,
  service_type: row.service_type || row.serviceType || row.scope || null,
  one_time: row.one_time ?? row.oneTime ?? row.single_use ?? false,
  max_value: Number(row.max_value ?? row.max_amount ?? row.cap ?? row.max_discount ?? 0),
  active: row.active !== false && row.enabled !== false,
  tone: row.tone || '#16279E',
  sort: Number(row.sort ?? 0),
})

export const listCoupons = async () => {
  if (!isSupabaseConfigured) return []
  // Priority order: 'coupons' is the actual table in this project.
  const tables = ['coupons', 'offers', 'promo_codes']
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('active', true)
        .order('sort', { ascending: true, nullsFirst: true })
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((row) => mapCouponRow(row, table))
      }
    } catch {
      // Table doesn't exist — try the next one.
    }
  }
  return []
}

// ---------------------------------------------------------------------------
// COUPON USES — tracks which coupons a user has redeemed (one-time coupons).
// Uses the `coupon_uses` table instead of localStorage so the data syncs
// across devices.
// ---------------------------------------------------------------------------

export const listCouponUses = async () => {
  if (!isSupabaseConfigured) return []
  const id = await uid().catch(() => null)
  if (!id) return []
  // Select all columns — the table schema varies; handle missing columns gracefully.
  const { data, error } = await supabase
    .from('coupon_uses')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
  if (error) return []
  return data || []
}

export const recordCouponUse = async ({ couponCode, couponId, orderId }) => {
  if (!isSupabaseConfigured) return null
  const id = await uid().catch(() => null)
  if (!id) return null
  const row = { user_id: id }
  if (couponId) row.coupon_id = couponId
  if (couponCode) row.coupon_code = couponCode
  if (orderId) row.order_id = orderId
  const { error } = await supabase.from('coupon_uses').insert(row)
  if (error) console.warn('coupon_use save failed', error)
  return null
}

// ---------------------------------------------------------------------------
// PLACE ORDER WITH COUPON — server-side atomic order + coupon redemption.
// Uses the `place-order` Edge Function which validates the coupon, inserts
// the order row, and records coupon usage in a single transaction.
// ---------------------------------------------------------------------------

export const placeOrderServer = async ({ order, couponCode, cartTotal, serviceIds }) => {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase.functions.invoke('place-order', {
    body: {
      order,
      coupon_code: couponCode || null,
      cart_total: cartTotal || 0,
      service_ids: serviceIds || [],
    },
  })
  if (error) {
    // Edge Function errors come back as { error: '...' } in the body
    const body = typeof error === 'object' && error.context ? error.context : error
    const msg = body?.error || error?.message || 'Order placement failed'
    throw new Error(msg)
  }
  if (data && !data.ok && data.error) {
    throw new Error(data.error)
  }
  return data
}

export const deleteCouponUse = async ({ couponCode, orderId }) => {
  if (!isSupabaseConfigured) return null
  const id = await uid().catch(() => null)
  if (!id) return null
  let query = supabase
    .from('coupon_uses')
    .delete()
    .eq('user_id', id)
  if (orderId) {
    query = query.eq('order_id', orderId)
  } else if (couponCode) {
    query = query.eq('coupon_code', String(couponCode || '').toUpperCase().trim())
  }
  const { error } = await query
  if (error) console.warn('coupon_use delete failed', error)
  return null
}

// ---------------------------------------------------------------------------
// PAYMENTS — saved payment instruments, synced across devices.
// The full app object lives in `data` jsonb, keyed by user_id = auth.uid().
// ---------------------------------------------------------------------------

export const listPaymentMethods = async () => {
  if (!isSupabaseConfigured) return []
  const id = await uid()
  let res = await supabase
    .from('payments')
    .select('data')
    .eq('user_id', id)
    .order('created_at', { ascending: true })
  if (res.error) {
    res = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: true })
  }
  if (res.error) throw new Error(hint(res.error))
  return (res.data || []).map((r) => r.data || r)
}

export const upsertPaymentMethod = async (pm) => {
  if (!isSupabaseConfigured) return null
  const id = await uid()
  const { error } = await supabase.from('payments').upsert(
    {
      id: pm.id,
      user_id: id,
      type: pm.type || 'upi',
      label: pm.label || '',
      detail: pm.detail || '',
      icon: pm.icon || '',
      data: pm,
    },
    { onConflict: 'id' }
  )
  if (error) throw new Error(hint(error))
  return pm
}

export const removePaymentMethod = async (pmId) => {
  if (!isSupabaseConfigured) return null
  const id = await uid()
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', pmId)
    .eq('user_id', id)
  if (error) throw new Error(hint(error))
  return true
}
