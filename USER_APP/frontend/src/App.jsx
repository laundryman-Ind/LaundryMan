import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import BottomNav from './components/BottomNav'
import TopNav from './components/TopNav'
import SiteFooter from './components/SiteFooter'
import Toast from './components/Toast'
import Login from './pages/Login'
import Otp from './pages/Otp'
import Name from './pages/Name'
import { formatPhone } from './services/phone'
import Home from './pages/Home'
import Search from './pages/Search'
import Services from './pages/Services'
import ServiceDetail from './pages/ServiceDetail'
import Cart from './pages/Cart'
import Address from './pages/Address'
import Checkout from './pages/Checkout'
import Tracking from './pages/Tracking'
import Orders from './pages/Orders'
import Offers from './pages/Offers'
import Profile from './pages/Profile'
import Support from './pages/Support'
import PaymentMethods from './pages/PaymentMethods'

const SCREEN_LABELS = {
  home: 'Home', search: 'Search', services: 'Services', service: 'Service',
  cart: 'Bag', address: 'Address', checkout: 'Checkout', tracking: 'Tracking',
  orders: 'Orders', offers: 'Offers', profile: 'Profile', support: 'Support',
  payments: 'Payments',
}

const AppContent = () => {
  const { authed, login, updateUser, reloadFromStorage } = useApp()
  const [screen, setScreen] = useState('home')
  const [params, setParams] = useState({})
  const [toast, setToast] = useState('')
  const [authStep, setAuthStep] = useState('login') // 'login' | 'otp' | 'name'
  const [authNum, setAuthNum] = useState('')
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const pageRefreshRef = useRef(null)

  // Kept as plumbing: pages may register a section-specific refresh handler
  // here. The pull-to-refresh gesture itself was removed (it made the screen
  // stretch while dragging), so nothing triggers this today.
  const registerRefresh = useCallback((fn) => {
    pageRefreshRef.current = fn
  }, [])

  // Hide the fixed bottom nav while the on-screen keyboard is up — otherwise the
  // Android WebView (adjustResize) lifts it above the keyboard where it floats
  // over content. Two signals, because they differ per environment:
  //  • browser: the keyboard overlays → visualViewport shrinks → height diff
  //  • Capacitor WebView: the layout resizes → both heights shrink together,
  //    so fall back to “an input is focused” (which is what opens the keyboard).
  useEffect(() => {
    const vv = window.visualViewport
    const check = () => {
      let kb = false
      if (vv && window.innerHeight - vv.height > 150) kb = true
      const el = document.activeElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) kb = true
      setKeyboardOpen(kb)
    }
    if (vv) vv.addEventListener('resize', check)
    window.addEventListener('focusin', check)
    window.addEventListener('focusout', check)
    check()
    return () => {
      if (vv) vv.removeEventListener('resize', check)
      window.removeEventListener('focusin', check)
      window.removeEventListener('focusout', check)
    }
  }, [])

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
    if (['service', 'cart', 'address'].includes(screen)) navigate('services')
    else if (screen === 'checkout') navigate('address', { from: 'checkout' })
    else if (screen === 'tracking') navigate('orders')
    else if (screen === 'support') navigate('profile')
    else if (screen === 'payments') navigate('profile')
    else navigate('home')
  }

  const go = { navigate, notify, back, registerRefresh }

  const showLogin = !authed

  // Android hardware back button hook (native MainActivity calls this and reads
  // the returned string):
  //   'KB'   → keyboard was open; closed it, do nothing else
  //   'BACK' → app-level back navigation happened
  //   'ROOT' → nothing to go back to; the native side should exit the app
  // Completely inert in a browser — window.__lmBack is just a function.
  window.__lmBack = () => {
    const el = document.activeElement
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      el.blur()
      return 'KB'
    }
    if (showLogin) {
      if (authStep === 'otp' || authStep === 'name') {
        setAuthStep('login')
        return 'BACK'
      }
      return 'ROOT'
    }
    if (screen === 'home') return 'ROOT'
    back()
    return 'BACK'
  }

  const handleLogin = () => {
    login()
    setAuthStep('login')
    navigate('home')
  }

  const handleNameDone = (name) => {
    updateUser({ name, phone: formatPhone(authNum) })
    handleLogin()
  }

  const render = () => {
    switch (screen) {
      case 'home': return <Home {...go} />
      case 'search': return <Search {...go} />
      case 'services': return <Services {...go} />
      case 'service': return <ServiceDetail {...go} params={params} />
      case 'cart': return <Cart {...go} params={params} />
      case 'address': return <Address {...go} params={params} />
      case 'checkout': return <Checkout {...go} />
      case 'tracking': return <Tracking {...go} params={params} />
      case 'orders': return <Orders {...go} />
      case 'offers': return <Offers {...go} />
      case 'profile': return <Profile {...go} />
      case 'support': return <Support {...go} />
      case 'payments': return <PaymentMethods {...go} params={params} />
      default: return <Home {...go} />
    }
  }

  return (
    <div
      className={`${showLogin ? 'app app-login' : 'app'}${keyboardOpen ? ' keyboard-open' : ''}`}
    >
      {showLogin && (
        authStep === 'otp' ? (
          <Otp
            num={authNum}
            notify={notify}
            onVerify={() => setAuthStep('name')}
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
      {authed && <TopNav screen={screen} navigate={navigate} notify={notify} />}
      {!showLogin && render()}
      {authed && <BottomNav screen={screen} navigate={navigate} />}
      {authed && <SiteFooter navigate={navigate} />}
      <Toast message={toast} />
    </div>
  )
}

const App = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
)

export default App
