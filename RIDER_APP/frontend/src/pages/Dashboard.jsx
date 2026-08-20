import React from 'react'
import { useRider } from '../context/RiderContext'
import Icon from '../components/Icon'

const Dashboard = ({ navigate, notify }) => {
  const { rider, online, toggleOnline, activeOrder, myOrders, refreshOrders } = useRider()

  const todayDelivered = myOrders.filter(o => {
    if (o.statusKey !== 'delivered') return false
    const d = o.deliveredAt || o.placedAt
    if (!d) return false
    const dt = typeof d === 'number' ? new Date(d) : new Date(d)
    return dt.toDateString() === new Date().toDateString()
  })

  const todayEarnings = todayDelivered.reduce((sum, o) => sum + (Number(o.total) || 0), 0)

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div className="brand">
          <div className="brand-mark">
            <img src="/logo.png" alt="Rider" className="brand-logo" />
          </div>
          <div>
            <div className="brand-name">Rider</div>
            <div className="brand-sub">{rider?.name || 'Rider'}</div>
          </div>
        </div>
        <div className="row" style={{ gap: '8px' }}>
          <span className={`pill ${online ? '' : 'ink'}`}>{online ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="bento bento-2">
        <div className="cell stat-cell flat-cobalt">
          <div className="stat-label">Delivered Today</div>
          <div className="stat-number">{todayDelivered.length}</div>
        </div>
        <div className="cell stat-cell flat-sun">
          <div className="stat-label">Today's Earnings</div>
          <div className="stat-number">₹{todayEarnings}</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="section-label">
        <h3>Quick Actions</h3>
      </div>
      <div className="bento bento-2">
        <button className="cell action-cell" onClick={toggleOnline}>
          <div className="action-icon" style={{ background: online ? 'rgba(192,57,43,.1)' : 'rgba(31,122,80,.1)' }}>
            <Icon name="power" style={{ width: '22px', height: '22px', color: online ? '#C0392B' : '#1F7A50' }} />
          </div>
          <strong>{online ? 'Go Offline' : 'Go Online'}</strong>
          <span>{online ? 'Stop receiving orders' : 'Start receiving orders'}</span>
        </button>
        <button className="cell action-cell" onClick={() => navigate('available')}>
          <div className="action-icon">
            <Icon name="bag" style={{ width: '22px', height: '22px', color: 'var(--cobalt)' }} />
          </div>
          <strong>Available Orders</strong>
          <span>View and accept new orders</span>
        </button>
      </div>

      {/* Active order */}
      {activeOrder && (
        <>
          <div className="section-label">
            <h3>Active Order</h3>
          </div>
          <div className="order-card" onClick={() => navigate('orderDetail', { orderId: activeOrder.id })}>
            <div className="oc-mid">
              <div className="oc-id">{activeOrder.id}</div>
              <div className="oc-title">{activeOrder.title || 'Order'}</div>
              <div className="oc-meta">₹{activeOrder.total || 0} · {activeOrder.statusKey}</div>
            </div>
            <span className="pill cobalt">Active</span>
          </div>
        </>
      )}

      {/* Recent orders */}
      {myOrders.length > 0 && (
        <>
          <div className="section-label">
            <h3>Recent Orders</h3>
            <button onClick={() => navigate('trips')}>View All →</button>
          </div>
          {myOrders.slice(0, 3).map(order => (
            <div key={order.id} className="order-card" onClick={() => navigate('orderDetail', { orderId: order.id })}>
              <div className="oc-mid">
                <div className="oc-id">{order.id}</div>
                <div className="oc-title">{order.title || 'Order'}</div>
                <div className="oc-meta">₹{order.total || 0}</div>
              </div>
              <span className={`pill ${order.statusKey === 'delivered' ? '' : 'cobalt'}`}>
                {order.statusKey}
              </span>
            </div>
          ))}
        </>
      )}

      {/* Refresh */}
      <div style={{ marginTop: '16px' }}>
        <button className="btn btn-ghost" onClick={() => { refreshOrders(); notify('Refreshed') }}>
          Refresh
        </button>
      </div>
    </div>
  )
}

export default Dashboard
