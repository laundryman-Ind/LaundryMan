import React from 'react'
import Icon from './Icon'

// Desktop-only top navigation — brand left, centered links, icons + CTA right.
// Hidden entirely below the desktop breakpoint (CSS display:none by default).
const LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'services', label: 'Services' },
  { id: 'orders', label: 'Orders' },
  { id: 'offers', label: 'Offers' },
  { id: 'profile', label: 'Profile' },
  { id: 'support', label: 'Support' },
]

// Sub-screens highlight their parent tab so the nav always shows context.
const PARENT = {
  search: 'home',
  service: 'services',
  cart: 'services',
  tracking: 'orders',
  payments: 'profile',
}

const TopNav = ({ screen, navigate, notify }) => {
  const active = PARENT[screen] || screen
  return (
    <nav className="top-nav" aria-label="Main navigation">
      <button className="top-brand" onClick={() => navigate('home')} aria-label="Go to Home">
        <div className="brand-mark"><img className="brand-logo" src="/logo.png" alt="Laundry Man" /></div>
        <div>
          <div className="brand-name">Laundry Man</div>
          <div className="brand-sub">One Call, Clean it All</div>
        </div>
      </button>
      <div className="top-links">
        {LINKS.map((l) => (
          <button
            key={l.id}
            className={`top-link${active === l.id ? ' active' : ''}`}
            onClick={() => navigate(l.id)}
          >
            {l.label}
          </button>
        ))}
      </div>
      <div className="top-right">
        <button className="top-icon" aria-label="Search" onClick={() => navigate('search')}>
          <Icon name="search" />
        </button>
        <button className="top-icon" aria-label="Notifications" onClick={() => notify('No new notifications')}>
          <Icon name="bell" />
        </button>
        <button className="top-cta" onClick={() => navigate('services')}>
          Place an order
        </button>
      </div>
    </nav>
  )
}

export default TopNav
