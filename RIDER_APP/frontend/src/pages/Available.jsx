import React, { useState, useEffect } from 'react'
import { useRider } from '../context/RiderContext'
import { listAvailableOrders, acceptOrder } from '../services/api'
import Icon from '../components/Icon'

const Available = ({ navigate, notify }) => {
  const { ensureSession } = useRider()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(null)

  const loadOrders = async () => {
    try {
      await ensureSession()
      const data = await listAvailableOrders()
      setOrders(data)
    } catch (e) {
      notify('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
    const timer = setInterval(loadOrders, 10000)
    return () => clearInterval(timer)
  }, []) // eslint-disable-line

  const handleAccept = async (orderId) => {
    setAccepting(orderId)
    try {
      await ensureSession()
      await acceptOrder(orderId)
      notify('Order accepted!')
      loadOrders()
    } catch (e) {
      notify(e.message || 'Failed to accept')
    } finally {
      setAccepting(null)
    }
  }

  return (
    <div className="container">
      <div className="page-head">
        <button className="back-btn" onClick={() => navigate('dashboard')}>←</button>
        <div className="page-head-text">
          <div className="page-title">Available Orders</div>
          <div className="page-sub">New orders waiting for pickup</div>
        </div>
      </div>

      {loading ? (
        <div className="empty">
          <h3>Loading...</h3>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><Icon name="bag" style={{ width: '28px', height: '28px', color: 'var(--mint-deep)' }} /></div>
          <h3>No new orders</h3>
          <p>Pull down or wait for new orders to appear</p>
        </div>
      ) : (
        orders.map(order => (
          <div key={order.id}>
            <div className="order-card">
              <div className="oc-mid">
                <div className="oc-id">{order.id}</div>
                <div className="oc-title">{order.title || 'Order'}</div>
                <div className="oc-meta">
                  ₹{order.total || 0}
                  {order.items && ` · ${order.items.length} item${order.items.length !== 1 ? 's' : ''}`}
                </div>
                {order.address && (
                  <div className="oc-meta"><Icon name="location" style={{ width: '12px', height: '12px', display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} /> {order.address.line || order.address.label || 'Address'}</div>
                )}
              </div>
            </div>
            <div style={{ marginTop: '-6px', marginBottom: '11px' }}>
              <button
                className="btn btn-ink"
                onClick={() => handleAccept(order.id)}
                disabled={accepting === order.id}
              >
                {accepting === order.id ? 'Accepting...' : 'Accept Order'}
              </button>
            </div>
          </div>
        ))
      )}

      <button className="btn btn-ghost" onClick={() => { loadOrders(); notify('Refreshed') }} style={{ marginTop: '8px' }}>
        Refresh
      </button>
    </div>
  )
}

export default Available
