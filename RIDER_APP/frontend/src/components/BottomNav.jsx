import React from 'react'
import Icon from './Icon'

const tabs = [
  { key: 'dashboard', label: 'Home', icon: 'home' },
  { key: 'available', label: 'Orders', icon: 'bag' },
  { key: 'trips', label: 'Trips', icon: 'truck' },
  { key: 'earnings', label: 'Earnings', icon: 'star' },
  { key: 'profile', label: 'Profile', icon: 'user' },
]

const BottomNav = ({ screen, navigate }) => {
  return (
    <nav className="bottom-nav">
      {tabs.map(t => (
        <button
          key={t.key}
          className={`nav-item ${screen === t.key ? 'active' : ''}`}
          onClick={() => navigate(t.key)}
        >
          <Icon name={t.icon} style={{ width: '20px', height: '20px', marginBottom: '2px' }} />
          {t.label}
        </button>
      ))}
    </nav>
  )
}

export default BottomNav
