import React from 'react'
import { SERVICES } from '../data/mockData'

// Desktop-only site footer — hidden below the desktop breakpoint via CSS.
const SiteFooter = ({ navigate }) => {
  const serviceLinks = SERVICES.slice(0, 4)
  return (
    <footer className="site-footer">
      <div className="foot-grid">
        <div className="foot-brand">
          <div className="brand-mark"><img className="brand-logo" src="/logo.png" alt="Laundry Man" /></div>
          <div className="brand-name">Laundry Man</div>
          <div className="brand-sub">One Call, Clean it All</div>
          <p className="foot-blurb">
            Doorstep laundry pickup, premium wash &amp; fold, and crisp delivery back to you.
            One call, clean it all — every time.
          </p>
        </div>

        <div className="foot-col">
          <h4>Services</h4>
          {serviceLinks.map((s) => (
            <button key={s.id} onClick={() => navigate('service', { serviceId: s.id })}>{s.name}</button>
          ))}
        </div>

        <div className="foot-col">
          <h4>Quick links</h4>
          <button onClick={() => navigate('services')}>All services</button>
          <button onClick={() => navigate('orders')}>My orders</button>
          <button onClick={() => navigate('offers')}>Offers</button>
          <button onClick={() => navigate('profile')}>Profile</button>
        </div>

        <div className="foot-col">
          <h4>Support</h4>
          <button onClick={() => navigate('support')}>Help &amp; FAQ</button>
          <button onClick={() => navigate('support')}>Contact us</button>
          <button onClick={() => navigate('address')}>Delivery areas</button>
          <button onClick={() => navigate('payments')}>Payment methods</button>
        </div>
      </div>
      <div className="foot-bottom">
        © {new Date().getFullYear()} Laundry Man · One Call, Clean it All · All Rights Reserved
      </div>
    </footer>
  )
}

export default SiteFooter
