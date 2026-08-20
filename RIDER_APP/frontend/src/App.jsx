import React, { useState, useEffect } from 'react'
import { RiderProvider, useRider } from './context/RiderContext'
import BottomNav from './components/BottomNav'
import Toast from './components/Toast'
import Login from './pages/Login'
import Otp from './pages/Otp'
import Name from './pages/Name'
import Dashboard from './pages/Dashboard'
import Available from './pages/Available'
import OrderDetail from './pages/OrderDetail'
import Pickup from './pages/Pickup'
import Delivery from './pages/Delivery'
import Trips from './pages/Trips'
import Earnings from './pages/Earnings'
import Profile from './pages/Profile'
import { currentUser, getRiderProfile, upsertRiderProfile } from './services/api'
import { isSupabaseConfigured, isBetaAuth } from './services/supabase'
import { createBetaSession } from './services/betaAuth'

const AppContent = () => {
  const { authed, login, rider, refreshOrders } = useRider()
  const [screen, setScreen] = useState('dashboard')
  const [params, setParams] = useState({})
  const [toast, setToast] = useState('')
  const [authStep, setAuthStep] = useState('login')
  const [authNum, setAuthNum] = useState('')
  const [authChecked, setAuthChecked] = useState(false)

  const notify = (msg) => {
    setToast(msg)
    clearTimeout(window.__t)
    window.__t = setTimeout(() => setToast(''), 1700)
  }

  const navigate = (s, p = {}) => {
    setParams(p)
    setScreen(s)
    window.scrollTo({ top: 0 })
  }

  const back = () => {
    if (['orderDetail', 'pickup', 'delivery'].includes(screen)) {
      setScreen('dashboard')
    } else if (screen === 'available') {
      setScreen('dashboard')
    } else {
      setScreen('dashboard')
    }
    setParams({})
  }

  const go = { navigate, notify, back }

  // Check session on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (isSupabaseConfigured) {
          if (isBetaAuth) {
            const u = await currentUser()
            if (!u) {
              // Try to restore session
              const savedRider = JSON.parse(localStorage.getItem('rm_rider') || 'null')
              if (savedRider?.phone) {
                await createBetaSession(savedRider.phone)
              }
            }
          }
          const u = await currentUser()
          if (u && !cancelled) {
            const profile = await getRiderProfile().catch(() => null)
            if (profile) {
              login(profile)
              setScreen('dashboard')
            } else if (rider?.name) {
              // Have a saved profile in localStorage — use it
              login(rider)
              setScreen('dashboard')
            } else {
              setAuthStep('name')
            }
          } else if (!cancelled) {
            // No Supabase session but might have localStorage rider
            if (rider?.name) {
              login(rider)
              setScreen('dashboard')
            }
          }
        }
      } catch (e) {
        console.warn('session check failed', e)
      } finally {
        if (!cancelled) setAuthChecked(true)
      }
    })()
    return () => { cancelled = true }
  }, []) // eslint-disable-line

  const handleLogin = () => {
    setScreen('dashboard')
    setAuthStep('login')
  }

  const handleOtpVerified = async () => {
    if (isBetaAuth && isSupabaseConfigured) {
      await createBetaSession(authNum)
    }
    const profile = await getRiderProfile().catch(() => null)
    if (profile) {
      login(profile)
      handleLogin()
    } else {
      // No DB profile yet — go to name step (new rider)
      setAuthStep('name')
    }
  }

  const handleNameDone = async (name) => {
    // Save to DB
    await upsertRiderProfile({ name, phone: authNum }).catch(() => {})
    // Try to load from DB
    const profile = await getRiderProfile().catch(() => null)
    // Always login — use DB profile if available, otherwise build one from local state
    const riderProfile = profile || { name, phone: authNum, active: false }
    login(riderProfile)
    handleLogin()
  }

  // Android back button
  window.__lmBack = () => {
    const el = document.activeElement
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      el.blur()
      return 'KB'
    }
    if (!authed) return 'ROOT'
    if (screen === 'dashboard') return 'ROOT'
    back()
    return 'BACK'
  }

  if (!authChecked) return <div className="app" />

  const showLogin = !authed

  const render = () => {
    switch (screen) {
      case 'dashboard': return <Dashboard {...go} />
      case 'available': return <Available {...go} />
      case 'orderDetail': return <OrderDetail {...go} params={params} />
      case 'pickup': return <Pickup {...go} params={params} />
      case 'delivery': return <Delivery {...go} params={params} />
      case 'trips': return <Trips {...go} />
      case 'earnings': return <Earnings {...go} />
      case 'profile': return <Profile {...go} />
      default: return <Dashboard {...go} />
    }
  }

  return (
    <div className={showLogin ? 'app app-login' : 'app'}>
      {showLogin && (
        authStep === 'otp' ? (
          <Otp
            num={authNum}
            notify={notify}
            onVerify={handleOtpVerified}
            onBack={() => setAuthStep('login')}
          />
        ) : authStep === 'name' ? (
          <Name
            notify={notify}
            onDone={handleNameDone}
            onBack={() => setAuthStep('login')}
          />
        ) : (
          <Login
            notify={notify}
            onSuccess={(num) => { setAuthNum(num); setAuthStep('otp') }}
          />
        )
      )}
      {authed && render()}
      {authed && <BottomNav screen={screen} navigate={navigate} />}
      <Toast message={toast} />
    </div>
  )
}

const App = () => (
  <RiderProvider>
    <AppContent />
  </RiderProvider>
)

export default App
