import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { SERVICES as MOCK_SERVICES, SERVICE_ITEMS as MOCK_SERVICE_ITEMS, ITEM_INDEX, USER, IMG, RIDERS, ACTIVE_STATUSES, STATUS_LABELS, STATUS_NOTES } from '../data/mockData'
import { supabase, isSupabaseConfigured, isBetaAuth } from '../services/supabase'
import { createBetaSession, setBetaProfileName } from '../services/betaAuth'
import {
  currentUser,
  listAddresses,
  upsertAddress,
  removeAddress as removeAddressApi,
  listOrders,
  upsertOrder,
  deleteAllOrders,
  listServices,
} from '../services/api'

const AppContext = createContext()

export const useApp = () => useContext(AppContext)

const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
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
  const [user, setUser] = useState(() => load('lm2_user', USER))

  // Cart: { itemId: qty }
  const [cart, setCart] = useState(() => load('lm2_cart', {}))

  // Item photos: { itemId: dataUrl } — user proof attached while building an order
  const [itemPhotos, setItemPhotos] = useState(() => load('lm2_item_photos', {}))

  // Addresses — user-added only, no seeds
  const [addresses, setAddresses] = useState(() => {
    localStorage.removeItem('lm2_addresses') // drop legacy seeded addresses
    return load('lm2_addresses_v2', [])
  })
  const [selectedAddressId, setSelectedAddressId] = useState(() => {
    localStorage.removeItem('lm2_addr_id') // drop legacy selection
    return load('lm2_addr_id_v2', '')
  })

  // Payment — saved instruments (UPI / debit / credit) + selected id ('cod' = cash)
  const [payMethods, setPayMethods] = useState(() => {
    localStorage.removeItem('lm2_pay') // legacy static selection
    return load('lm2_pay_methods', [])
  })
  const [payMethod, setPayMethod] = useState(() => load('lm2_pay_v2', 'cod'))

  // Orders start empty — the user must place an order first.
  const [orders, setOrders] = useState(() => {
    localStorage.removeItem('lm2_orders') // drop legacy seeded history
    localStorage.removeItem('lm2_orders_v2')
    return load('lm2_orders_v3', [])
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

  // When a Supabase session becomes active, load the user's addresses and
  // orders from the database. If the DB has data it wins (source of truth);
  // if the DB is empty but this device has local data, migrate it up once.
  // In beta mode, the session is created via anonymous sign-in (betaAuth.js).
  useEffect(() => {
    if (!authed || !isSupabaseConfigured) return
    let cancelled = false
    ;(async () => {
      try {
        // In beta mode, ensure we have a real Supabase session first.
        // createBetaSession is idempotent — safe to call on every sync.
        if (isBetaAuth) {
          const u = await currentUser()
          if (!u) {
            const phone = user?.phone || ''
            if (phone) await createBetaSession(phone)
          }
        }
        const u = await currentUser()
        if (!u || cancelled) return
        const [dbAddrs, dbOrders] = await Promise.all([listAddresses(), listOrders()])
        if (cancelled) return

        const localAddrs = load('lm2_addresses_v2', [])
        if (dbAddrs.length > 0) {
          setAddresses(dbAddrs)
        } else if (localAddrs.length > 0) {
          await Promise.all(localAddrs.map((a) => upsertAddress(a).catch(() => {})))
          setAddresses(localAddrs)
        }

        const localOrders = load('lm2_orders_v3', [])
        if (dbOrders.length > 0) {
          setOrders(dbOrders)
        } else if (localOrders.length > 0) {
          await Promise.all(localOrders.map((o) => upsertOrder(o).catch(() => {})))
          setOrders(localOrders)
        }
      } catch (e) {
        console.warn('DB sync failed', e)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed])

  useEffect(() => save('lm2_user', user), [user])
  useEffect(() => save('lm2_cart', cart), [cart])
  useEffect(() => save('lm2_item_photos', itemPhotos), [itemPhotos])
  useEffect(() => save('lm2_addresses_v2', addresses), [addresses])
  useEffect(() => save('lm2_addr_id_v2', selectedAddressId), [selectedAddressId])
  useEffect(() => save('lm2_pay_methods', payMethods), [payMethods])
  useEffect(() => save('lm2_pay_v2', payMethod), [payMethod])
  useEffect(() => save('lm2_orders_v3', orders), [orders])

  // Derived cart data
  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const item = ITEM_INDEX.find((i) => i.id === id)
          return item ? { ...item, qty } : null
        })
        .filter(Boolean),
    [cart]
  )

  const cartTotal = useMemo(
    () => cartLines.reduce((sum, l) => sum + l.price * l.qty, 0),
    [cartLines]
  )

  const cartCount = useMemo(() => cartLines.reduce((sum, l) => sum + l.qty, 0), [cartLines])

  const activeOrder = orders.find((o) => o.statusKey !== 'delivered' && o.statusKey !== 'cancelled') || null
  const historyOrders = orders.filter((o) => o.statusKey === 'delivered')

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

  const addAddress = (addr) => {
    const full = { id: 'a' + Date.now().toString(36), ...addr }
    setAddresses((prev) => [...prev, full])
    setSelectedAddressId(full.id)
    upsertAddress(full).catch((e) => console.warn('address save failed', e))
    return full
  }

  const updateAddress = (id, patch) => {
    const next = addresses.map((a) => (a.id === id ? { ...a, ...patch } : a))
    setAddresses(next)
    const updated = next.find((a) => a.id === id)
    if (updated) upsertAddress(updated).catch((e) => console.warn('address save failed', e))
  }

  const removeAddress = (id) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id))
    setSelectedAddressId((prev) => (prev === id ? '' : prev))
    removeAddressApi(id).catch((e) => console.warn('address delete failed', e))
  }

  const placeOrder = ({ items, total, address, payment }) => {
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
      total,
      address,
      payment,
      rider: RIDERS[Math.floor(Math.random() * RIDERS.length)],
      createdAt: 'Just now',
      placedAt: Date.now(),
      review: null,
      timeline: [{ step: 'placed', time: 'Just now', note: 'Order confirmed' }],
    }
    setOrders((prev) => [order, ...prev])
    clearCart()
    setItemPhotos({})
    upsertOrder(order).catch((e) => console.warn('order save failed', e))
    return order
  }

  // Wipe this account's order history only — everything else is kept.
  const clearOrders = () => {
    setOrders([])
    deleteAllOrders().catch((e) => console.warn('orders clear failed', e))
  }

  const cancelOrder = (id) => {
    const next = orders.map((o) =>
      o.id === id
        ? {
            ...o,
            statusKey: 'cancelled',
            statusLabel: 'Cancelled',
            eta: '—',
            timeline: [...(o.timeline || []), { step: 'cancelled', time: 'Just now', note: 'Order cancelled' }],
          }
        : o
    )
    setOrders(next)
    const changed = next.find((o) => o.id === id)
    if (changed) upsertOrder(changed).catch((e) => console.warn('order save failed', e))
  }

  const rateOrder = (id, rating, comment) => {
    const next = orders.map((o) => (o.id === id ? { ...o, review: { rating, comment } } : o))
    setOrders(next)
    const changed = next.find((o) => o.id === id)
    if (changed) upsertOrder(changed).catch((e) => console.warn('order save failed', e))
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

  const addPayMethod = (m) => {
    const full = { id: 'pm' + Date.now().toString(36), ...m }
    setPayMethods((prev) => [...prev, full])
    setPayMethod(full.id)
    return full
  }

  const removePayMethod = (id) => {
    setPayMethods((prev) => prev.filter((p) => p.id !== id))
    setPayMethod((prev) => (prev === id ? 'cod' : prev))
  }

  // Resolved view of the selected payment method (falls back to cash on delivery)
  const selectedPay = useMemo(() => {
    if (payMethod === 'cod') return { id: 'cod', type: 'cod', label: 'Cash on delivery', icon: 'cash' }
    return payMethods.find((p) => p.id === payMethod) || null
  }, [payMethod, payMethods])

  const updateUser = (patch) => setUser((prev) => ({ ...prev, ...patch }))

  // Re-read every persisted slice from localStorage back into React state. Used
  // by pull-to-refresh so a section re-syncs its data without a full page reload.
  const reloadFromStorage = useCallback(() => {
    setUser(load('lm2_user', USER))
    setCart(load('lm2_cart', {}))
    setItemPhotos(load('lm2_item_photos', {}))
    setAddresses(load('lm2_addresses_v2', []))
    setSelectedAddressId(load('lm2_addr_id_v2', ''))
    setPayMethods(load('lm2_pay_methods', []))
    setPayMethod(load('lm2_pay_v2', 'cod'))
    setOrders(load('lm2_orders_v3', []))
  }, [])

  const login = () => {
    localStorage.setItem('lm2_logged_in', '1')
    setAuthed(true)
    // In beta mode, create a real Supabase session so DB operations work.
    if (isBetaAuth && isSupabaseConfigured) {
      const phone = user?.phone || ''
      if (phone) createBetaSession(phone).catch(() => {})
    }
  }

  const signout = () => {
    localStorage.removeItem('lm2_logged_in')
    setAuthed(false)
    setCart({})
    setItemPhotos({})
    setPayMethod('cod')
    // End the real Supabase session too (no-op when unconfigured)
    if (supabase) supabase.auth.signOut()
  }

  const value = {
    user,
    updateUser,
    reloadFromStorage,
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
