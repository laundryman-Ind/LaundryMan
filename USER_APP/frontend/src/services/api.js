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
  if (!user) return null
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
  const { data, error } = await supabase
    .from(ADDRESSES)
    .select('data')
    .eq('user_id', id)
    .order('created_at', { ascending: true })
  if (error) throw new Error(hint(error))
  return (data || []).map((r) => r.data)
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
  const { data, error } = await supabase
    .from(ORDERS)
    .select('data')
    .eq('user_id', id)
    .order('placed_at', { ascending: false, nullsFirst: false })
  if (error) throw new Error(hint(error))
  return (data || []).map((r) => r.data)
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
// CATALOG — public services + coupons (no auth needed; RLS allows anon reads).
// ---------------------------------------------------------------------------

// Services with their priced items, in display order.
export const listServices = async () => {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase
    .from('services')
    .select('id, name, sub, icon, span, photo, tone, flat, price, sort, service_items(id, name, icon, price, unit, sort)')
    .eq('active', true)
    .order('sort')
  if (error) throw new Error(hint(error))
  return (data || []).map((r) => ({
    id: r.id,
    name: r.name,
    sub: r.sub,
    icon: r.icon,
    span: r.span,
    photo: r.photo,
    tone: r.tone,
    flat: r.flat,
    price: r.price,
    items: (r.service_items || [])
      .slice()
      .sort((a, b) => a.sort - b.sort)
      .map((it) => ({
        id: it.id,
        name: it.name,
        icon: it.icon,
        price: Number(it.price),
        unit: it.unit,
      })),
  }))
}
