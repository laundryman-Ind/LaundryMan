import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured, isBetaAuth } from '../services/supabase'
import { createBetaSession } from '../services/betaAuth'
import { currentUser, getRiderProfile, setRiderOnline, subscribeOrders, listMyOrders } from '../services/api'
import { formatPhone } from '../services/phone'

const RiderContext = createContext()
export const useRider = () => useContext(RiderContext)

export const RiderProvider = ({ children }) => {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem('rm_logged_in'))
  const [rider, setRider] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rm_rider')) || null } catch { return null }
  })
  const [online, setOnline] = useState(() => rider?.active || false)
  const [myOrders, setMyOrders] = useState([])
  const [activeOrder, setActiveOrder] = useState(null)

  // Ensure session
  const ensureSession = useCallback(async () => {
    if (!isSupabaseConfigured) return
    if (isBetaAuth) {
      const u = await currentUser().catch(() => null)
      if (!u) {
        const savedRider = JSON.parse(localStorage.getItem('rm_rider') || 'null')
        if (savedRider?.phone) {
          await createBetaSession(savedRider.phone)
        }
      }
    }
  }, [])

  // Load rider profile from DB
  const loadProfile = useCallback(async () => {
    try {
      await ensureSession()
      const profile = await getRiderProfile()
      if (profile) {
        setRider(profile)
        setOnline(profile.active || false)
        localStorage.setItem('rm_rider', JSON.stringify(profile))
      }
    } catch (e) {
      console.warn('loadProfile failed', e)
    }
  }, [ensureSession])

  // Refresh my orders
  const refreshOrders = useCallback(async () => {
    try {
      await ensureSession()
      const orders = await listMyOrders()
      setMyOrders(orders)
      const active = orders.find(o => o.statusKey !== 'delivered' && o.statusKey !== 'cancelled')
      setActiveOrder(active || null)
    } catch (e) {
      console.warn('refreshOrders failed', e)
    }
  }, [ensureSession])

  // On mount: restore session and load profile
  useEffect(() => {
    if (!authed) return
    let cancelled = false
    ;(async () => {
      try {
        if (isSupabaseConfigured && isBetaAuth) {
          const u = await currentUser()
          if (!u && rider?.phone) {
            await createBetaSession(rider.phone)
          }
        }
        if (!cancelled) await loadProfile()
        if (!cancelled) await refreshOrders()
      } catch (e) {
        console.warn('init failed', e)
      }
    })()
    return () => { cancelled = true }
  }, []) // eslint-disable-line

  // Realtime subscription for order changes
  useEffect(() => {
    if (!authed || !isSupabaseConfigured) return
    const unsub = subscribeOrders(() => {
      refreshOrders().catch(() => {})
    })
    return unsub
  }, [authed, refreshOrders])

  // Periodic refresh
  useEffect(() => {
    if (!authed) return
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshOrders().catch(() => {})
      }
    }, 15000)
    return () => clearInterval(timer)
  }, [authed, refreshOrders])

  const login = (profile) => {
    setRider(profile)
    setOnline(profile?.active || false)
    localStorage.setItem('rm_logged_in', '1')
    localStorage.setItem('rm_rider', JSON.stringify(profile))
    setAuthed(true)
  }

  const logout = async () => {
    if (supabase) {
      await setRiderOnline(false).catch(() => {})
      await supabase.auth.signOut().catch(() => {})
    }
    localStorage.removeItem('rm_logged_in')
    localStorage.removeItem('rm_rider')
    setAuthed(false)
    setRider(null)
    setOnline(false)
    setMyOrders([])
    setActiveOrder(null)
  }

  const toggleOnline = async () => {
    const next = !online
    try {
      await ensureSession()
      await setRiderOnline(next)
      setOnline(next)
      setRider(prev => prev ? { ...prev, active: next } : prev)
      localStorage.setItem('rm_rider', JSON.stringify({ ...rider, active: next }))
    } catch (e) {
      console.warn('toggleOnline failed', e)
    }
  }

  const value = {
    authed, rider, online,
    myOrders, activeOrder,
    login, logout, toggleOnline,
    loadProfile, refreshOrders,
    ensureSession,
  }

  return <RiderContext.Provider value={value}>{children}</RiderContext.Provider>
}
