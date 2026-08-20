// Rider API — Supabase queries for the rider app.

import { supabase, isSupabaseConfigured } from './supabase'

const RIDERS = 'riders'
const ORDERS = 'orders'

const hint = (error) => (error && error.message) || 'Database error'

// --- Auth ---

export const currentUser = async () => {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return null
  return data.user
}

// --- Rider Profile ---

export const getRiderProfile = async () => {
  if (!isSupabaseConfigured) return null
  const user = await currentUser()
  if (!user) return null
  const { data, error } = await supabase
    .from(RIDERS)
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw new Error(hint(error))
  return data
}

export const upsertRiderProfile = async (patch) => {
  if (!isSupabaseConfigured) return null
  const user = await currentUser()
  if (!user) throw new Error('Not signed in')
  const { data, error } = await supabase
    .from(RIDERS)
    .upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' })
    .select()
    .maybeSingle()
  if (error) throw new Error(hint(error))
  return data
}

export const setRiderOnline = async (online) => {
  if (!isSupabaseConfigured) return null
  const user = await currentUser()
  if (!user) return null
  const { error } = await supabase
    .from(RIDERS)
    .update({ online })
    .eq('user_id', user.id)
  if (error) throw new Error(hint(error))
}

export const deleteRiderAccount = async () => {
  if (!isSupabaseConfigured) return null
  const user = await currentUser()
  if (!user) throw new Error('Not signed in')

  // Try RPC first
  try {
    const { data, error } = await supabase.rpc('delete_own_rider_account')
    if (!error && (data?.ok || data?.success)) {
      return data
    }
  } catch (err) {
    console.warn('delete_own_rider_account RPC failed, falling back to direct table delete', err)
  }

  // Direct table delete for rider row
  const { error } = await supabase.from(RIDERS).delete().eq('user_id', user.id)
  if (error) throw new Error(hint(error))
  return { ok: true }
}

// --- Orders ---

// Available orders: placed + no rider assigned
export const listAvailableOrders = async () => {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from(ORDERS)
    .select('*')
    .eq('status_key', 'placed')
    .is('rider_id', null)
    .order('placed_at', { ascending: false, nullsFirst: false })
  if (error) throw new Error(hint(error))
  return (data || []).map(r => r.data || r)
}

// Orders assigned to this rider (active + delivered)
export const listMyOrders = async () => {
  if (!isSupabaseConfigured) return []
  const user = await currentUser()
  if (!user) return []
  // Get rider id
  const { data: rider } = await supabase
    .from(RIDERS)
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!rider) return []
  const { data, error } = await supabase
    .from(ORDERS)
    .select('*')
    .eq('rider_id', rider.id)
    .order('placed_at', { ascending: false, nullsFirst: false })
  if (error) throw new Error(hint(error))
  return (data || []).map(r => r.data || r)
}

// Get a single order by id
export const getOrder = async (orderId) => {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase
    .from(ORDERS)
    .select('*')
    .eq('id', orderId)
    .maybeSingle()
  if (error) throw new Error(hint(error))
  return data?.data || data
}

// Accept an order: assign rider + update status
export const acceptOrder = async (orderId) => {
  if (!isSupabaseConfigured) throw new Error('Not configured')
  const user = await currentUser()
  if (!user) throw new Error('Not signed in')

  const { data: rider } = await supabase
    .from(RIDERS)
    .select('id, name, phone, phone_href, photo')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!rider) throw new Error('No rider profile found')

  const now = new Date().toISOString()
  const { error } = await supabase
    .from(ORDERS)
    .update({
      rider_id: rider.id,
      status_key: 'assigned',
      updated_at: now,
    })
    .eq('id', orderId)
    .is('rider_id', null)
  if (error) throw new Error(hint(error))

  // Also update the data jsonb inside the row
  const { data: row } = await supabase.from(ORDERS).select('data').eq('id', orderId).maybeSingle()
  if (row?.data) {
    const updatedData = {
      ...row.data,
      statusKey: 'assigned',
      statusLabel: statusLabel('assigned'),
      riderId: rider.id,
      assignedAt: now,
      rider: {
        id: rider.id,
        name: rider.name || 'Rider',
        phone: rider.phone || '',
        phoneHref: rider.phone_href || `tel:${rider.phone || ''}`,
        photo: rider.photo || '',
      },
      timeline: [
        ...(row.data.timeline || []),
        { step: 'assigned', time: 'Just now', note: statusNote('assigned') },
      ],
    }
    await supabase.from(ORDERS).update({ data: updatedData }).eq('id', orderId)
  }

  return true
}

// Update order status
export const updateOrderStatus = async (orderId, newStatus) => {
  if (!isSupabaseConfigured) throw new Error('Not configured')
  const now = new Date().toISOString()

  const { error } = await supabase
    .from(ORDERS)
    .update({
      status_key: newStatus,
      updated_at: now,
    })
    .eq('id', orderId)
  if (error) throw new Error(hint(error))

  // Also update the data jsonb
  const { data: row } = await supabase.from(ORDERS).select('data').eq('id', orderId).maybeSingle()
  if (row?.data) {
    const updatedData = {
      ...row.data,
      statusKey: newStatus,
      statusLabel: statusLabel(newStatus),
      timeline: [
        ...(row.data.timeline || []),
        { step: newStatus, time: 'Just now', note: statusNote(newStatus) },
      ],
    }
    if (newStatus === 'delivered') updatedData.deliveredAt = Date.now()
    await supabase.from(ORDERS).update({ data: updatedData }).eq('id', orderId)
  }

  return true
}

// Subscribe to order changes (realtime)
export const subscribeOrders = (callback) => {
  if (!isSupabaseConfigured || !supabase) return () => {}
  const channel = supabase
    .channel('rider-orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: ORDERS }, (payload) => {
      callback(payload)
    })
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}

// --- GPS Tracking ---

// Update rider's current location in the database
export const updateRiderLocation = async (lat, lng) => {
  if (!isSupabaseConfigured) return null
  const user = await currentUser()
  if (!user) return null
  
  // Get rider id
  const { data: rider } = await supabase
    .from(RIDERS)
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!rider) return null
  
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('rider_locations')
    .upsert({
      rider_id: rider.id,
      lat,
      lng,
      updated_at: now,
    }, { onConflict: 'rider_id' })
  if (error) throw new Error(hint(error))
  return true
}

// Get a rider's current location by rider_id
export const getRiderLocation = async (riderId) => {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase
    .from('rider_locations')
    .select('*')
    .eq('rider_id', riderId)
    .maybeSingle()
  if (error) return null
  return data
}

// Subscribe to a specific rider's location changes (realtime)
export const subscribeRiderLocation = (riderId, callback) => {
  if (!isSupabaseConfigured || !supabase || !riderId) return () => {}
  const channel = supabase
    .channel(`rider-location-${riderId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rider_locations', filter: `rider_id=eq.${riderId}` },
      (payload) => {
        callback(payload)
      }
    )
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}

// --- Helpers ---

const statusLabel = (status) => {
  const labels = {
    assigned: 'Assigned',
    pickup_started: 'Pickup started',
    picked_up: 'Picked up',
    washing: 'Washing',
    processing: 'Processing',
    ready_for_delivery: 'Ready for delivery',
    out_for_delivery: 'Out for delivery',
    delivered: 'Delivered',
  }
  return labels[status] || status
}

const statusNote = (status) => {
  const notes = {
    assigned: 'Order assigned to rider',
    pickup_started: 'Rider is on the way to pick up',
    picked_up: 'Items picked up from customer',
    washing: 'Washing in progress',
    processing: 'Quality check & packing',
    ready_for_delivery: 'Items ready for delivery',
    out_for_delivery: 'Rider is on the way to deliver',
    delivered: 'Order delivered successfully',
  }
  return notes[status] || status
}
