import React, { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

const TABS = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'orders', label: 'Orders', icon: 'orders' },
  { id: 'offers', label: 'Offers', icon: 'offers' },
  { id: 'profile', label: 'Profile', icon: 'profile' },
]

// Only these adjacent pairs glide — every other switch jumps instantly.
const PAIRS = [
  ['home', 'orders'],
  ['offers', 'profile'],
]

const samePair = (a, b) => PAIRS.some(([x, y]) => (a === x && b === y) || (a === y && b === x))

const BottomNav = ({ screen, navigate }) => {
  const navRef = useRef(null)
  const pillRef = useRef(null)
  const itemRefs = useRef({})
  const prevTab = useRef(null)
  const [pill, setPill] = useState(null)

  // Measure the active tab; only animate when moving within an allowed pair.
  const measure = () => {
    const active = TABS.find((t) => t.id === screen)
    const el = active ? itemRefs.current[active.id] : null
    if (el) {
      const from = prevTab.current
      setPill({
        left: el.offsetLeft,
        top: el.offsetTop,
        width: el.offsetWidth,
        height: el.offsetHeight,
        anim: !!from && samePair(from, screen),
      })
    } else {
      setPill(null)
    }
    prevTab.current = screen
  }

  useEffect(measure, [screen])

  // After a jump (anim:false), commit the position without the transition,
  // then re-enable transitions so the next paired switch can glide again.
  useEffect(() => {
    if (!pill || pill.anim) return
    if (pillRef.current) void pillRef.current.offsetWidth // force reflow
    setPill((p) => (p && !p.anim ? { ...p, anim: true } : p))
  }, [pill])

  // Keep the pill glued to the active tab on resize.
  useEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen])

  const isActive = (id) => screen === id

  return (
    <nav className="bottom-nav" ref={navRef}>
      {pill && (
        <div
          ref={pillRef}
          className={`nav-pill${pill.anim ? '' : ' no-anim'}`}
          style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height }}
        />
      )}
      {TABS.map((t, i) => (
        <React.Fragment key={t.id}>
          <button
            ref={(el) => { itemRefs.current[t.id] = el }}
            className={`nav-item ${isActive(t.id) ? 'active' : ''}`}
            onClick={() => navigate(t.id)}
          >
            <Icon name={t.icon} />{t.label}
          </button>
          {i === 1 && (
            <button
              className={`nav-add${screen === 'services' ? ' active' : ''}`}
              aria-label="New order"
              onClick={() => navigate('services')}
            >
              <Icon name="services" />
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

export default BottomNav
