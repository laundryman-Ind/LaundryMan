import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { SERVICES as MOCK_SERVICES, SERVICE_ITEMS as MOCK_SERVICE_ITEMS, ITEM_INDEX, USER, IMG, RIDERS, ACTIVE_STATUSES, STATUS_LABELS, STATUS_NOTES } from '../data/mockData'
import { supabase, isSupabaseConfigured, isBetaAuth } from '../services/supabase'
import { createBetaSession, setBetaProfileName } from '../services/betaAuth'
import { formatPhone } from '../services/phone'
import {
  currentUser,
  getProfile,
  listAddresses,
  upsertAddress,
  removeAddress as removeAddressApi,
  listOrders,
  listAllOrders,
  upsertOrder,
  deleteAllOrders,
  hideAllOrders,
  listServices,
  listReviews,
  upsertReview,
  getCart,
  upsertCart,
  placeOrderServer,
  deleteCouponUse,
  listPaymentMethods,
  upsertPaymentMethod,
  removePaymentMethod as removePaymentMethodApi,
} from '../services/api'

const AppContext = createContext()

export const useApp = () => useContext(AppContext)

const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed !== null && parsed !== undefined ? parsed : fallback
  } catch {
    return fallback
  }
}

const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable — static preview still works */
  }
}

export const AppProvider = ({ children }) => {
  // Auth session — gates the whole app behind the login screen
  const [authed, setAuthed] = useState(() => !!localStorage.getItem('lm2_logged_in'))

  // Signed-in user — editable and persisted
  const [user, setUser] = useState(() => load('lm2_user', { name: '', phone: '', photo: null }) || { name: '', phone: '', photo: null })

  // Cart: { itemId: qty }
  const [cart, setCart] = useState(() => load('lm2_cart', {}) || {})

  // Item photos: { itemId: dataUrl } — user proof attached while building an order
  const [itemPhotos, setItemPhotos] = useState(() => load('lm2_item_photos', {}) || {})

  // Addresses — user-added only, no seeds
  const [addresses, setAddresses] = useState(() => {
    localStorage.removeItem('lm2_addresses') // drop legacy seeded addresses
    const loaded = load('lm2_addresses_v2', [])
    return Array.isArray(loaded) ? loaded : []
  })
  const [selectedAddressId, setSelectedAddressId] = useState(() => {
    localStorage.removeItem('lm2_addr_id') // drop legacy selection
    return load('lm2_addr_id_v2', '') || ''
  })

  // Payment — saved instruments (UPI / debit / credit) + selected id ('cod' = cash)
  const [payMethods, setPayMethods] = useState(() => {
    localStorage.removeItem('lm2_pay') // legacy static selection
    const loaded = load('lm2_pay_methods', [])
    return Array.isArray(loaded) ? loaded : []
  })
  const [payMethod, setPayMethod] = useState(() => load('lm2_pay_v2', 'cod') || 'cod')

  // Orders start empty — the user must place an order first.
  const [orders, setOrders] = useState(() => {
    localStorage.removeItem('lm2_orders') // drop legacy seeded history
    localStorage.removeItem('lm2_orders_v2')
    const loaded = load('lm2_orders_v3', [])
    return Array.isArray(loaded) ? loaded : []
  })

  // Catalog — services (with their priced items). Seeded from the bundled
  // mock so the app works offline; the database version replaces it when
  // Supabase is set up (see the catalog effect below).
  const [services, setServices] = useState(() =>
    MOCK_SERVICES.map((s) => ({ ...s, items: MOCK_SERVICE_ITEMS[s.id] || [] }))
  )

  // Load the catalog from the database when Supabase is set up (public reads,
  // no login needed). Falls back to the bundled mock catalog when the DB
  // fetch fails or returns empty.
  useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false
    ;(async () => {
      const dbServices = await listServices().catch(() => null)
      if (cancelled) return
      if (dbServices && dbServices.length) setServices(dbServices)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signout = useCallback(() => {
    // Clear ALL app data from localStorage to prevent stale data
    // from being re-uploaded when a different user logs in, or when
    // the same user logs back in on a different device.
    const keysToRemove = [
      'lm2_logged_in', 'lm2_user', 'lm2_cart', 'lm2_item_photos',
      'lm2_addresses_v2', 'lm2_addr_id_v2', 'lm2_pay_methods',
      'lm2_pay_v2', 'lm2_orders_v3', 'lm2_used_coupons', 'lm2_migrated',
    ]
    keysToRemove.forEach((k) => {
      try { localStorage.removeItem(k) } catch {}
    })
    try { localStorage.clear() } catch {}
    setAuthed(false)
    setUser({ name: '', phone: '', photo: null })
    setAddresses([])
    setSelectedAddressId('')
    setOrders([])
    setCart({})
    setItemPhotos({})
    setPayMethods([])
    setPayMethod('cod')
    // End the real Supabase session too (no-op when unconfigured)
    if (supabase) {
      supabase.auth.signOut().catch(() => {})
    }
  }, [])

  // Ensure a valid Supabase session exists (creates one in beta mode if needed).
  // Called before every DB operation so stale/expired tokens don't silently fail.
  const ensureSession = useCallback(async () => {
    if (!isSupabaseConfigured) return
    if (isBetaAuth) {
      const u = await currentUser().catch(() => null)
      if (!u && user?.phone) {
        await createBetaSession(user.phone)
      }
    }
  }, [user?.phone])

  // Core refresh logic — fetches every data slice from Supabase and
  // replaces local state. The DATABASE is always the source of truth.
  //
  // One-time migration: if the DB is genuinely empty (fetch succeeded AND
  // returned zero rows), upload local data once. If the DB is unreachable,
  // we skip migration entirely to avoid uploading stale localStorage data.
  const _fetchAndMerge = useCallback(async () => {
    await ensureSession()
    const u = await currentUser().catch(() => null)
    if (!u) {
      return
    }

    // Check if the user's profile exists in DB
    let dbProfile = null
    try {
      dbProfile = await getProfile()
    } catch {
      dbProfile = null
    }

    if (dbProfile) {
      // Sync user state with database profile (name, phone, photo)
      setUser({
        name: dbProfile.name || '',
        phone: dbProfile.phone ? formatPhone(dbProfile.phone) : (u.phone ? formatPhone(u.phone) : ''),
        photo: dbProfile.photo || null,
      })
    }

    let addrsOk = false
    let ordersOk = false
    let cartOk = false

    const [dbAddrs, dbAllOrders, dbReviews, dbServices, dbCart] = await Promise.all([
      listAddresses().then((r) => { addrsOk = true; return r }).catch(() => []),
      listAllOrders().then((r) => { ordersOk = true; return r }).catch(() => []),
      listReviews().catch(() => []),
      listServices().catch(() => null),
      getCart().then((r) => { cartOk = true; return r }).catch(() => ({})),
    ])

    // Services: always prefer DB when available
    if (dbServices && dbServices.length) setServices(dbServices)

    // --- ADDRESSES: DB is authoritative ---
    if (addrsOk) {
      setAddresses(dbAddrs)
    }

    // --- ORDERS: DB is authoritative ---
    const dbOrders = dbAllOrders.filter((o) => !o?.hiddenAt)
    const reviewMap = new Map()
    for (const r of dbReviews) {
      reviewMap.set(r.order_id, { rating: r.rating, comment: r.comment })
    }
    const dbOrdersWithReviews = dbOrders.map((o) => {
      const review = reviewMap.get(o.id) || null
      return { ...o, review }
    })

    if (ordersOk) {
      setOrders(dbOrdersWithReviews)
    }

    // --- CART: DB is authoritative ---
    if (cartOk) {
      setCart(dbCart && Object.keys(dbCart).length > 0 ? dbCart : {})
    }

    // --- PAYMENT METHODS: DB is authoritative ---
    try {
      const dbPayMethods = await listPaymentMethods().catch(() => null)
      if (dbPayMethods !== null) {
        setPayMethods(Array.isArray(dbPayMethods) ? dbPayMethods : [])
      }
    } catch (e) {
      console.warn('payment methods sync failed', e)
    }
  }, [ensureSession, authed, signout])

  // When a Supabase session becomes active, load the user's data from the database.
  useEffect(() => {
    if (!authed || !isSupabaseConfigured) return
    let cancelled = false
    ;(async () => {
      try {
        if (!cancelled) await _fetchAndMerge()
      } catch (e) {
        console.warn('DB sync failed', e)
      }
    })()
    return () => { cancelled = true }
  }, [authed, _fetchAndMerge])

  // Realtime cross-device sync: listen for profile deletion or updates across devices
  useEffect(() => {
    if (!authed || !isSupabaseConfigured) return
    let channel = null
    ;(async () => {
      const u = await currentUser().catch(() => null)
      if (!u?.id) return

      channel = supabase
        .channel(`user-sync-${u.id}`)
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'profiles', filter: `id=eq.${u.id}` },
          () => {
            console.warn('Profile delete event received — signing out')
            signout()
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${u.id}` },
          (payload) => {
            const newRow = payload?.new
            if (newRow) {
              setUser({
                name: newRow.name || '',
                phone: newRow.phone ? formatPhone(newRow.phone) : '',
                photo: newRow.photo || null,
              })
            }
          }
        )
        .on(
          'broadcast',
          { event: 'account_deleted' },
          () => {
            console.warn('Account deleted broadcast received — signing out')
            signout()
          }
        )
        .subscribe()
    })()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [authed, signout])

  // Multi-tab storage sync: when signed out on one tab, sign out on all tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'lm2_logged_in' && !e.newValue) {
        signout()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [signout])

  // Cross-device sync: refresh data whenever the app returns to the foreground,
  // PLUS a periodic 30-second poll while the app is visible.
  useEffect(() => {
    if (!authed || !isSupabaseConfigured) return
    let timer = null
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        _fetchAndMerge().catch((e) => console.warn('visibility refresh failed', e))
        clearInterval(timer)
        timer = setInterval(() => {
          if (document.visibilityState === 'visible') {
            _fetchAndMerge().catch((e) => console.warn('periodic refresh failed', e))
          }
        }, 30000)
      } else {
        clearInterval(timer)
        timer = null
      }
    }
    if (document.visibilityState === 'visible') {
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') {
          _fetchAndMerge().catch((e) => console.warn('periodic refresh failed', e))
        }
      }, 30000)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      clearInterval(timer)
    }
  }, [authed, _fetchAndMerge])

  useEffect(() => {
    if (authed && user && (user.name || user.phone || user.photo)) {
      save('lm2_user', user)
    }
  }, [user, authed])
  useEffect(() => { if (authed) save('lm2_cart', cart) }, [cart, authed])
  useEffect(() => { if (authed) save('lm2_item_photos', itemPhotos) }, [itemPhotos, authed])
  useEffect(() => { if (authed) save('lm2_addresses_v2', addresses) }, [addresses, authed])
  useEffect(() => { if (authed) save('lm2_addr_id_v2', selectedAddressId) }, [selectedAddressId, authed])
  useEffect(() => { if (authed) save('lm2_pay_methods', payMethods) }, [payMethods, authed])
  useEffect(() => { if (authed) save('lm2_pay_v2', payMethod) }, [payMethod, authed])
  useEffect(() => { if (authed) save('lm2_orders_v3', orders) }, [orders, authed])

  // Persist cart to the database when authenticated and Supabase is configured.
  useEffect(() => {
    if (!authed || !isSupabaseConfigured) return
    let cancelled = false
    ;(async () => {
      try {
        await ensureSession()
        if (cancelled) return
        await upsertCart(cart).catch((e) => console.warn('cart save failed', e))
      } catch (e) {
        console.warn('cart save failed', e)
      }
    })()
    return () => { cancelled = true }
  }, [cart, authed, ensureSession])

  // Flatten items from all known services (dynamic DB services + fallback mock items)
  const allItems = useMemo(() => {
    const fromServices = (services || []).flatMap((s) =>
      (s.items || []).map((it) => ({ ...it, serviceId: s.id }))
    )
    const map = new Map()
    ITEM_INDEX.forEach((it) => map.set(it.id, it))
    fromServices.forEach((it) => map.set(it.id, it))
    return Array.from(map.values())
  }, [services])

  // Derived cart data
  const cartLines = useMemo(
    () =>
      Object.entries(cart || {})
        .map(([id, qty]) => {
          const item = allItems.find((i) => i.id === id) || ITEM_INDEX.find((i) => i.id === id)
          const numQty = Number(qty) || 0
          return item ? { ...item, qty: numQty, price: Number(item.price) || 0 } : null
        })
        .filter((l) => l && l.qty > 0),
    [cart, allItems]
  )

  const cartTotal = useMemo(
    () => cartLines.reduce((sum, l) => sum + (Number(l.price) || 0) * (Number(l.qty) || 0), 0),
    [cartLines]
  )

  const cartCount = useMemo(() => cartLines.reduce((sum, l) => sum + (Number(l.qty) || 0), 0), [cartLines])

  const activeOrder = (orders || []).find((o) => o && o.statusKey !== 'delivered' && o.statusKey !== 'cancelled') || null
  const historyOrders = (orders || []).filter((o) => o && o.statusKey === 'delivered')

  // Actions
  const setQty = (itemId, qty) => {
    setCart((prev) => {
      const next = { ...prev }
      if (qty <= 0) delete next[itemId]
      else next[itemId] = qty
      return next
    })
  }

  const removeItem = (itemId) => {
    setCart((prev) => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
  }

  const clearCart = () => setCart({})

  // Attach / remove a photo for a cart item (data URL, downscaled)
  const setItemPhoto = (itemId, dataUrl) => {
    setItemPhotos((prev) => {
      const next = { ...prev }
      if (dataUrl) next[itemId] = dataUrl
      else delete next[itemId]
      return next
    })
  }

  // API-first mutations: the database write MUST succeed before local
  // state is updated. This prevents stale local data from being persisted
  // back to localStorage and re-uploaded on the next sync.

  const addAddress = async (addr) => {
    const full = { id: 'a' + Date.now().toString(36), ...addr }
    try {
      await ensureSession()
      await upsertAddress(full)
    } catch (e) {
      console.warn('address save failed', e)
      throw e  // let the caller handle the error
    }
    setAddresses((prev) => [...prev, full])
    setSelectedAddressId(full.id)
    return full
  }

  const updateAddress = async (id, patch) => {
    const updated = { ...addresses.find((a) => a.id === id), ...patch }
    if (!updated) return
    try {
      await ensureSession()
      await upsertAddress(updated)
    } catch (e) {
      console.warn('address save failed', e)
      throw e
    }
    setAddresses((prev) => prev.map((a) => (a.id === id ? updated : a)))
  }

  const removeAddress = async (id) => {
    try {
      await ensureSession()
      await removeAddressApi(id)
    } catch (e) {
      console.warn('address delete failed', e)
      throw e  // caller shows error, address stays in UI
    }
    // Only update local state after the server confirms deletion
    setAddresses((prev) => prev.filter((a) => a.id !== id))
    setSelectedAddressId((prev) => (prev === id ? '' : prev))
  }

  const placeOrder = async ({ items, total, subtotal, discount, coupon, tax, address, customerPhone, payment, serviceIds }) => {
    const order = {
      id: 'LA' + Math.floor(1000 + Math.random() * 9000),
      title: items.length > 1 ? `${items.length} items` : `${items[0]?.name || 'Order'}`,
      statusKey: 'placed',
      statusLabel: 'Placed',
      thumb: IMG('1545173168-9f1947eebb7f', 200),
      eta: 'Tomorrow · 6:00 PM',
      pickup: 'Today · 4:00 PM – 6:00 PM',
      items: items.map((it) => ({
        itemId: it.id || it.itemId || '',
        name: it.name,
        qty: it.qty,
        unit: it.unit,
        amount: Number.isFinite(it.amount) ? it.amount : it.price * it.qty,
        photo: it.id ? itemPhotos[it.id] || null : null,
      })),
      subtotal: subtotal ?? total,
      discount: discount ?? 0,
      coupon: coupon || null,
      tax: tax ?? 0,
      total,
      address,
      customerPhone: customerPhone || '',
      payment,
      rider: null,
      createdAt: 'Just now',
      placedAt: Date.now(),
      review: null,
      timeline: [{ step: 'placed', time: 'Just now', note: 'Order confirmed' }],
    }

    // Server-side placement: if a coupon is attached, handles atomic validation +
    // order creation. Otherwise, direct upsert.
    // CRITICAL: only add to local state AFTER the DB write succeeds.
    let dbConfirmed = false
    await ensureSession()
    const couponCode = coupon?.code || null
    try {
      const serverResult = await placeOrderServer({
        order,
        couponCode,
        cartTotal: subtotal ?? total,
        serviceIds: serviceIds || [],
      })
      // Update order with server-confirmed values
      if (serverResult) {
        order.total = serverResult.total ?? order.total
        order.discount = serverResult.discount ?? order.discount
        order.tax = serverResult.tax ?? order.tax
        if (serverResult.coupon) {
          order.coupon = serverResult.coupon
        }
      }
      dbConfirmed = true
    } catch (e) {
      console.warn('Order placement failed on server:', e)
      throw e
    }

    // Only add to local state and clear cart after DB confirms success.
    // This prevents phantom orders that exist locally but not in the DB,
    // which would confuse other devices on sync.
    if (dbConfirmed) {
      setOrders((prev) => [order, ...prev])
      clearCart()
      setItemPhotos({})
    }
    return order
  }

  // Wipe this account's order history only — everything else is kept.
  // Uses soft-delete: marks every order row as hidden instead of deleting
  // it, so payment/accounting records are preserved and other devices see
  // the same cleared state on their next sync.
  const clearOrders = async () => {
    // DB-first: persist the soft-delete to the database, then update local
    // state. This ensures other devices see the same cleared state.
    try {
      await ensureSession()
      await hideAllOrders()
    } catch (e) {
      console.warn('orders soft-delete failed', e)
      throw e // let the caller show an error
    }
    // Only clear local state after the server confirms
    setOrders([])
  }

  // Cancel an order — DB-first: persist the cancellation to the database
  // BEFORE updating local state, so other devices see the same state.
  // If the order used a coupon, release the coupon_uses row so the coupon
  // becomes available again.
  const cancelOrder = async (id) => {
    const original = orders.find((o) => o.id === id)
    if (!original) return
    const cancelled = {
      ...original,
      statusKey: 'cancelled',
      statusLabel: 'Cancelled',
      eta: '—',
      timeline: [...(original.timeline || []), { step: 'cancelled', time: 'Just now', note: 'Order cancelled' }],
    }
    try {
      await ensureSession()
      await upsertOrder(cancelled)
    } catch (e) {
      console.warn('order cancel failed on server', e)
      throw e // let the caller show an error
    }
    // Only update local state after the server confirms
    setOrders((prev) => prev.map((o) => (o.id === id ? cancelled : o)))
    // Release the coupon usage so the coupon becomes available again
    const couponCode = original.coupon?.code
    if (couponCode) {
      deleteCouponUse({ orderId: id }).catch((e) =>
        console.warn('coupon use release failed', e)
      )
    }
  }

  const rateOrder = async (id, rating, comment) => {
    const next = orders.map((o) => (o.id === id ? { ...o, review: { rating, comment } } : o))
    setOrders(next)
    // Ensure the Supabase session is valid before any DB write — prevents
    // silent failures when the JWT has expired.
    await ensureSession().catch(() => {})
    // Save review to the dedicated reviews table — surface errors so the
    // calling screen can notify the user if the DB write fails.
    const errors = []
    await upsertReview({ orderId: id, rating, comment }).catch((e) => {
      console.warn('review save failed', e)
      errors.push(e)
    })
    // Also persist the review inside the order data for offline round-trip
    const changed = next.find((o) => o.id === id)
    if (changed) {
      await upsertOrder(changed).catch((e) => {
        console.warn('order save failed', e)
        errors.push(e)
      })
    }
    if (errors.length > 0) throw errors[0]
  }

  // Re-add an order's items to the bag. Returns number of items added (0 = nothing matched).
  const reorder = (order) => {
    const entries = (order.items || [])
      .map((it) => {
        const hit =
          ITEM_INDEX.find((x) => x.id === it.itemId) ||
          ITEM_INDEX.find((x) => x.name === it.name && x.price * it.qty === it.amount)
        return hit ? [hit.id, it.qty] : null
      })
      .filter(Boolean)
    if (!entries.length) return 0
    setCart((prev) => {
      const next = { ...prev }
      entries.forEach(([id, qty]) => {
        next[id] = (next[id] || 0) + qty
      })
      return next
    })
    return entries.length
  }

  // Move the active order one step forward (Placed → … → Delivered).
  // Returns the new status label, or null when nothing is active.
  const advanceActiveOrder = useCallback(() => {
    const idx = orders.findIndex((o) => ACTIVE_STATUSES.includes(o.statusKey))
    if (idx === -1) return null
    const o = orders[idx]
    const stepIdx = ACTIVE_STATUSES.indexOf(o.statusKey)
    const nextKey = stepIdx + 1 < ACTIVE_STATUSES.length ? ACTIVE_STATUSES[stepIdx + 1] : 'delivered'
    const nextLabel = STATUS_LABELS[nextKey]
    const next = {
      ...o,
      statusKey: nextKey,
      statusLabel: nextLabel,
      eta: nextKey === 'delivered' ? '—' : o.eta,
      ...(nextKey === 'delivered' ? { deliveredAt: Date.now() } : {}),
      timeline: [...(o.timeline || []), { step: nextKey, time: 'Just now', note: STATUS_NOTES[nextKey] }],
    }
    setOrders((prev) => prev.map((x) => (x.id === o.id ? next : x)))
    upsertOrder(next).catch((e) => console.warn('order save failed', e))
    return nextLabel
  }, [orders])

  const addPayMethod = async (m) => {
    const full = { id: 'pm' + Date.now().toString(36), ...m }
    try {
      await ensureSession()
      await upsertPaymentMethod(full)
    } catch (e) {
      console.warn('payment method save failed', e)
      throw e
    }
    setPayMethods((prev) => [...prev, full])
    setPayMethod(full.id)
    return full
  }

  const removePayMethod = async (id) => {
    try {
      await ensureSession()
      await removePaymentMethodApi(id)
    } catch (e) {
      console.warn('payment method delete failed', e)
      throw e
    }
    setPayMethods((prev) => prev.filter((p) => p.id !== id))
    setPayMethod((prev) => (prev === id ? 'cod' : prev))
  }

  // Resolved view of the selected payment method (falls back to cash on delivery)
  const selectedPay = useMemo(() => {
    if (payMethod === 'cod') return { id: 'cod', type: 'cod', label: 'Cash on delivery', icon: 'cash' }
    const list = Array.isArray(payMethods) ? payMethods : []
    return list.find((p) => p && p.id === payMethod) || null
  }, [payMethod, payMethods])

  const updateUser = (patch) => setUser((prev) => ({ ...prev, ...patch }))

  // Re-read every persisted slice from localStorage back into React state.
  // NOTE: This should only be used for non-authed (offline) mode. When the
  // database is available, DB is always the source of truth.
  const reloadFromStorage = useCallback(() => {
    setUser(load('lm2_user', { name: '', phone: '', photo: null }) || { name: '', phone: '', photo: null })
    setCart(load('lm2_cart', {}) || {})
    setItemPhotos(load('lm2_item_photos', {}) || {})
    const addrs = load('lm2_addresses_v2', [])
    setAddresses(Array.isArray(addrs) ? addrs : [])
    setSelectedAddressId(load('lm2_addr_id_v2', '') || '')
    const pms = load('lm2_pay_methods', [])
    setPayMethods(Array.isArray(pms) ? pms : [])
    setPayMethod(load('lm2_pay_v2', 'cod') || 'cod')
    const ords = load('lm2_orders_v3', [])
    setOrders(Array.isArray(ords) ? ords : [])
  }, [])

  // Refresh all data from the database. On failure, do NOT fall back to
  // localStorage — that would restore stale/deleted data. Instead, keep
  // the current state and let the user retry or wait for the next sync.
  const refreshFromDatabase = useCallback(async () => {
    if (!authed) {
      reloadFromStorage()
      return
    }

    try {
      await _fetchAndMerge()
      // Also refresh the service catalog (public, no auth needed)
      const serviceResult = await listServices().catch(() => null)
      if (serviceResult && serviceResult.length) setServices(serviceResult)
    } catch (e) {
      console.warn('database refresh failed — keeping current state', e)
      // Do NOT call reloadFromStorage() here — it would reintroduce
      // stale localStorage data (e.g. deleted addresses, old orders)
      // back into React state, which could then be synced back to the DB.
    }
  }, [authed, reloadFromStorage, _fetchAndMerge])

  const login = () => {
    localStorage.setItem('lm2_logged_in', '1')
    setAuthed(true)
    // In beta mode, create a real Supabase session so DB operations work.
    if (isBetaAuth && isSupabaseConfigured) {
      const phone = user?.phone || ''
      if (phone) createBetaSession(phone).catch(() => {})
    }
  }

  const value = {
    user,
    updateUser,
    reloadFromStorage,
    refreshFromDatabase,
    services,
    cart,
    cartLines,
    cartTotal,
    cartCount,
    itemPhotos,
    setItemPhoto,
    setQty,
    removeItem,
    clearCart,
    addresses,
    addAddress,
    updateAddress,
    removeAddress,
    selectedAddressId,
    setSelectedAddressId,
    payMethod,
    setPayMethod,
    payMethods,
    addPayMethod,
    removePayMethod,
    selectedPay,
    orders,
    clearOrders,
    activeOrder,
    historyOrders,
    placeOrder,
    cancelOrder,
    rateOrder,
    reorder,
    advanceActiveOrder,
    authed,
    login,
    signout,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
