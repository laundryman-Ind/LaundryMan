import React, { useState, useEffect } from 'react'
import { useRider } from '../context/RiderContext'
import { getOrder, updateOrderStatus } from '../services/api'
import Icon from '../components/Icon'

const ACTIONS = {
  ready_for_delivery: { label: 'Start Delivery', next: 'out_for_delivery' },
  out_for_delivery: { label: 'Confirm Delivery', next: 'delivered' },
}

const Delivery = ({ navigate, notify, params }) => {
  const { ensureSession } = useRider()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const loadOrder = async () => {
    try {
      await ensureSession()
      const data = await getOrder(params.orderId)
      setOrder(data)
    } catch (e) {
      notify('Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.orderId) loadOrder()
  }, [params.orderId]) // eslint-disable-line

  const handleAction = async () => {
    if (!order) return
    const action = ACTIONS[order.statusKey]
    if (!action) return
    setUpdating(true)
    try {
      await ensureSession()
      await updateOrderStatus(order.id, action.next)
      notify(action.label + ' ✓')
      loadOrder()
    } catch (e) {
      notify(e.message || 'Failed')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <div className="container"><div className="empty"><h3>Loading...</h3></div></div>
  if (!order) return <div className="container"><div className="empty"><h3>Order not found</h3></div></div>

  const action = ACTIONS[order.statusKey]

  return (
    <div className="container">
      <div className="page-head">
        <button className="back-btn" onClick={() => navigate('orderDetail', { orderId: order.id })}>←</button>
        <div className="page-head-text">
          <div className="page-title">Delivery</div>
          <div className="page-sub">{order.id}</div>
        </div>
      </div>

      {order.deliveryAddress && (
        <div className="cell" style={{ marginBottom: '14px' }}>
          <div className="oc-id">DELIVERY ADDRESS</div>
          <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>
            <Icon name="location" style={{ width: '14px', height: '14px', display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
            {order.deliveryAddress.line || order.deliveryAddress.label || '—'}
          </div>
        </div>
      )}

      {order.items && order.items.length > 0 && (
        <>
          <div className="section-label"><h3>Items to Deliver</h3></div>
          {order.items.map((item, i) => (
            <div key={i} className="cell" style={{ marginBottom: '8px', padding: '14px 16px' }}>
              <div className="spread">
                <span style={{ fontWeight: 700 }}>{item.name}</span>
                <span style={{ fontWeight: 800 }}>× {item.qty}</span>
              </div>
            </div>
          ))}
        </>
      )}

      {action && (
        <div style={{ marginTop: '16px', marginBottom: '16px' }}>
          <button className="btn btn-ink" onClick={handleAction} disabled={updating}>
            {updating ? 'Updating...' : action.label}
          </button>
        </div>
      )}
    </div>
  )
}

export default Delivery
