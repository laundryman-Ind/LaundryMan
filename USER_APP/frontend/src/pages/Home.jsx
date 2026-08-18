import React from 'react'
import { useApp } from '../context/AppContext'
import { OFFERS, IMG } from '../data/mockData'
import Icon from '../components/Icon'
import Photo from '../components/Photo'
import Header from '../components/Header'
import { useActivityStats } from '../hooks/useActivityStats'
import { copyCode } from '../utils/clipboard'
import SectionLabel from '../components/SectionLabel'
import ServiceCard from '../components/ServiceCard'
import ActiveOrderCard from '../components/ActiveOrderCard'

// 3-column showcase: original order preserved; Bags is inserted right after
// Wash & Fold (rendered narrow) so it fills the empty top-right slot only.
const HOME_SERVICES = ['wash-fold', 'bags', 'wash-iron', 'iron-only', 'dry-clean', 'premium', 'shoes']

const Home = ({ navigate, notify }) => {
  const { services } = useApp()
  const { activeOrder, addresses, selectedAddressId, user } = useApp()
  const stats = useActivityStats()

  const savedLocation = addresses.find((a) => a.id === selectedAddressId) || addresses[0] || null
  const deliveryLocation =
    (savedLocation ? `${savedLocation.label} · ${savedLocation.line}` : '') ||
    (activeOrder?.address || '').replace(/^[^-]+—\s*/, '') ||
    'Set delivery location'

  const goServices = () => navigate('services')
  const goOrder = (id) => navigate('tracking', { orderId: id })

  // Before the rider has picked the bag up, they're coming TO the door — so the
  // headline says “Pick up in 5 mins” instead of “Delivery in 5 mins”.
  const riderLine = activeOrder && activeOrder.statusKey === 'placed' ? 'Pick up in 5 mins' : 'Delivery in 5 mins'

  return (
    <div className="container">
      {/* HEADER */}
      <Header onNotify={notify} onSearch={() => navigate('search')} />

      {/* BENTO GRID */}
      <div className="bento">
        <div
          className={`cell span-4 greet-cell${activeOrder ? ' is-clickable' : ''}`}
          onClick={activeOrder ? () => goOrder(activeOrder.id) : undefined}
        >
          <div>
            <small>{activeOrder ? 'Rider on the way' : 'No active order'}</small>
            <h1 className="delivery-title">{activeOrder ? riderLine : 'Order your first wash'}</h1>
            <button
              className="greet-loc"
              onClick={(e) => {
                // Location chip handles its own tap — don't also open the order.
                e.stopPropagation()
                navigate(activeOrder ? 'address' : 'services', activeOrder ? { from: 'home' } : undefined)
              }}
            >
              <Icon name="location" style={{ width: 13, height: 13 }} />
              <span>{deliveryLocation}</span>
            </button>
          </div>
          <div className="greet-avatar">
            {user.photo ? <img src={user.photo} alt={user.name} /> : user.name.charAt(0)}
          </div>
        </div>

        <div className="cell has-photo span-4 hero-cell">
          <Photo src={IMG('1517677208171-0bc6725a3e60', 1400)} alt="Laundry drum spinning" tone="var(--cobalt)" />
          <div className="hero-tag"><Icon name="star" style={{ width: 14, height: 14 }} /> Laundry service</div>
          <h2>Fresh clothes,<br /><em>zero stress.</em></h2>
          <button className="hero-btn" onClick={goServices}>
            Place an order <Icon name="arrow" />
          </button>
        </div>

        <button className="cell has-photo span-2 action-cell is-locked" onClick={() => notify('Schedule a pickup — coming soon')}>
          <Photo src={IMG('1489274495757-95c7c837b101', 800)} alt="Delivery van at the curb" tone="#0E1116" />
          <div className="lock-badge" aria-hidden="true"><Icon name="lock" /></div>
          <div className="action-icon"><Icon name="calendar" /></div>
          <div>
            <strong>Schedule a pickup</strong>
            <span>We'll collect it from your door</span>
          </div>
        </button>

        <button className="cell flat-sun span-2 action-cell" onClick={() => navigate('orders')}>
          <div className="action-icon"><Icon name="bag" /></div>
          <div>
            <strong>Orders</strong>
            <span>Track</span>
          </div>
        </button>
      </div>

      {/* SERVICES — 7 cards so the narrow card fills the top-right slot beside Wash & Fold */}
      <SectionLabel title="Services" actionLabel="View all" onAction={() => { notify('All services'); goServices() }} />
      <div className="bento bento-3">
        {HOME_SERVICES.map((id) => {
          const s = services.find((x) => x.id === id)
          if (!s) return null
          // Bags is span-2 in the catalog — render it narrow (span-1) so it fits the corner slot.
          const service = id === 'bags' ? { ...s, span: 'span-1' } : s
          return <ServiceCard key={s.id} service={service} onSelect={() => navigate('service', { serviceId: s.id })} />
        })}
      </div>

      {/* ACTIVE ORDER */}
      {activeOrder && (
        <>
          <SectionLabel
            title="Active order"
            actionLabel="Details"
            onAction={() => goOrder(activeOrder.id)}
          />
          <div className="bento">
            <ActiveOrderCard order={activeOrder} onTrack={() => goOrder(activeOrder.id)} />
          </div>
        </>
      )}

      {/* OFFERS + STATS */}
      <SectionLabel title="Offers &amp; activity" />
      <div className="bento">
        {OFFERS.slice(0, 1).map((o) => (
          <div key={o.code} className="cell has-photo span-2 offer-cell">
            <Photo src={o.photo} alt="Fresh folded towels" tone={o.tone} />
            <small>{o.tag}</small>
            <h2>{o.title}</h2>
            <p>{o.desc}</p>
            <button className="offer-code" onClick={() => copyCode(o.code, notify)}>
              <span className="mono">{o.code}</span>
            </button>
          </div>
        ))}

        {stats.map((st) => (
          <div key={st.label} className={`cell ${st.flat ? 'flat-ink' : 'has-photo'} ${st.span || 'span-2'} stat-cell`}>
            {st.photo && <Photo src={st.photo} alt={st.label} tone={st.tone} />}
            <div className="stat-label">{st.label}</div>
            <div className="stat-number">{st.value}</div>
            <div className="stat-delta">{st.delta}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="bento">
        <div className="cell has-photo span-4 cta-cell">
          <Photo src={IMG('1517677208171-0bc6725a3e60', 1200)} alt="Laundry drum" tone="var(--cobalt)" />
          <div>
            <strong>Ready to wash?</strong>
            <small>Schedule your next pickup in under a minute.</small>
          </div>
          <button className="cta-btn" onClick={() => { notify('New order started'); goServices() }}>
            Start <Icon name="arrow" style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Home
