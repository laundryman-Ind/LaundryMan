import React from 'react'
import Icon from './Icon'

const Header = ({ onNotify, onSearch }) => (
  <header className="header">
    <div className="brand">
      <div className="brand-mark"><img className="brand-logo" src="/logo.png" alt="Laundry Man" /></div>
      <div>
        <div className="brand-name">Laundry Man</div>
        <div className="brand-sub">One Call, Clean it All</div>
      </div>
    </div>
    <div className="header-actions">
      <button className="icon-btn" aria-label="Search" onClick={onSearch}><Icon name="search" /></button>
      <button className="icon-btn" aria-label="Notifications" onClick={() => onNotify('No new notifications')}><Icon name="bell" /></button>
    </div>
  </header>
)

export default Header
