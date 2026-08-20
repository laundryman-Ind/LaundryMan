import React, { useState, useEffect } from 'react'
import { useRider } from '../context/RiderContext'
import { getOrder, updateOrderStatus } from '../services/api'
import Modal from '../components/Modal'

const STATUS_LABELS = {
  assigned: 'Assigned',
  pickup_started: 'Pickup Started',
  picked_up: 'Picked Up',
  processing: 'Processing',
  ready_for_delivery: 'Ready for Delivery',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  placed: 'Placed',
}

const NEXT_ACTION = {
  assigned: { label: 'Start Pickup', next: 'pickup_started' },
  pickup_started: { label: 'Confirm Pickup', next: 'picked_up' },
  picked_up: { label: 'Mark Processing', next: 'processing' },
  processing: { label: 'Mark Ready', next: 'ready_for_delivery' },
  ready_for_delivery: { label: 'Start Delivery', next: 'out_for_delivery' },
  out_for_delivery: { label: 'Confirm Delivery', next: 'delivered' },
}

const OrderDetail = ({ navigate, notify, params }) => {
  const { ensureSession } = useRider()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)

  const loadOrder = async () => {
    try {
      await ensureSession()
      const data = await getOrder(params.orderId)
      setOrder(data)
    } catch (e) {
      notify('Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.orderId) loadOrder()
  }, [params.orderId]) // eslint-disable-line

  const handleAction = () => {
    if (!order) return
    const action = NEXT_ACTION[order.statusKey]
    if (!action) return
    setConfirmAction(action)
  }

  const confirmDoAction = async () => {
    if (!confirmAction || !order) return
    setConfirmAction(null)
    setUpdating(true)
    try {
      await ensureSession()
      await updateOrderStatus(order.id, action.next)
      notify(confirmAction.label + ' ✓')
      loadOrder()
    } catch (e) {
      notify(e.message || 'Failed')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <div className="container"><div className="empty"><h3>Loading...</h3></div></div>
  if (!order) return <div className="container"><div className="empty"><h3>Order not found</h3></div></div>

  const action = NEXT_ACTION[order.statusKey]
  const isDone = order.statusKey === 'delivered'

  return (
    <div className="container">
      <div className="page-head">
        <button className="back-btn" onClick={() => navigate('dashboard')}>←</button>
        <div className="page-head-text">
          <div className="page-title">Order {order.id}</div>
          <div className="page-sub">{STATUS_LABELS[order.statusKey] || order.statusKey}</div>
        </div>
        <span className={`pill ${isDone ? '' : 'cobalt'}`}>
          {isDone ? 'Done' : 'Active'}
        </span>
      </div>

      {/* Order info */}
      <div className="cell" style={{ marginBottom: '14px' }}>
        <div className="spread">
          <div>
            <div className="oc-id">ORDER TOTAL</div>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: "'Space Grotesk',sans-serif", letterSpacing: '-1px' }}>₹{order.total || 0}</div>
          </div>
          <span className={`pill ${isDone ? '' : 'cobalt'}`}>
            {STATUS_LABELS[order.statusKey] || order.statusKey}
          </span>
        </div>
      </div>

      {/* Items */}
      {order.items && order.items.length > 0 && (
        <div className="section-label"><h3>Items</h3></div>
      )}
      {order.items && order.items.map((item, i) => (
        <div key={i} className="cell" style={{ marginBottom: '8px', padding: '14px 16px' }}>
          <div className="spread">
            <span style={{ fontWeight: 700, fontSize: '14px' }}>{item.name}</span>
            <span style={{ fontWeight: 800, fontSize: '14px' }}>× {item.qty}</span>
          </div>
        </div>
      ))}

      {/* Addresses */}
      {order.address && (
        <>
          <div className="section-label"><h3>Pickup Address</h3></div>
          <div className="cell" style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>{order.address.line || order.address.label || '—'}</div>
          </div>
        </>
      )}

      {order.deliveryAddress && (
        <>
          <div className="section-label"><h3>Delivery Address</h3></div>
          <div className="cell" style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>{order.deliveryAddress.line || order.deliveryAddress.label || '—'}</div>
          </div>
        </>
      )}

      {/* Timeline */}
      {order.timeline && order.timeline.length > 0 && (
        <>
          <div className="section-label"><h3>Timeline</h3></div>
          <div className="cell" style={{ marginBottom: '14px' }}>
            <div className="timeline">
              {order.timeline.map((t, i) => (
                <div key={i} className="timeline-item">
                  <div className={`timeline-dot ${i === order.timeline.length - 1 ? 'active' : ''}`} />
                  <div className="timeline-content">
                    <div className="timeline-label">{STATUS_LABELS[t.step] || t.step}</div>
                    <div className="timeline-time">{t.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Action button */}
      {!isDone && action && (
        <div style={{ marginTop: '8px', marginBottom: '16px' }}>
          <button
            className="btn btn-ink"
            onClick={handleAction}
            disabled={updating}
          >
            {updating ? 'Updating...' : action.label}
          </button>
        </div>
      )}

      {isDone && (
        <div className="cell flat-mint" style={{ marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 800 }}>✓ Order Delivered</div>
        </div>
      )}

      <Modal
        open={!!confirmAction}
        title={confirmAction?.label || ''}
        text="Are you sure you want to proceed?"
        confirmLabel="Confirm"
        onConfirm={confirmDoAction}
        onClose={() => setConfirmAction(null)}
      />
    </div>
  )
}

export default OrderDetail
