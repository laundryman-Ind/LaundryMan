import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { ITEM_INDEX, USER, IMG, RIDERS, ACTIVE_STATUSES, STATUS_LABELS, STATUS_NOTES } from '../data/mockData'

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
    return full
  }

  const updateAddress = (id, patch) => {
    setAddresses((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }

  const removeAddress = (id) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id))
    setSelectedAddressId((prev) => (prev === id ? '' : prev))
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
    return order
  }

  // Wipe this account's order history only — everything else is kept.
  const clearOrders = () => setOrders([])

  const cancelOrder = (id) => {
    setOrders((prev) =>
      prev.map((o) =>
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
    )
  }

  const rateOrder = (id, rating, comment) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, review: { rating, comment } } : o)))
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
  }

  const signout = () => {
    localStorage.removeItem('lm2_logged_in')
    setAuthed(false)
    setCart({})
    setItemPhotos({})
    setPayMethod('cod')
  }

  const value = {
    user,
    updateUser,
    reloadFromStorage,
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
