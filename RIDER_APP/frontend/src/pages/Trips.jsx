import React from 'react'
import { useRider } from '../context/RiderContext'
import Icon from '../components/Icon'

const STATUS_LABELS = {
  assigned: 'Assigned',
  pickup_started: 'Pickup Started',
  picked_up: 'Picked Up',
  processing: 'Processing',
  ready_for_delivery: 'Ready',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  placed: 'Placed',
}

const Trips = ({ navigate }) => {
  const { myOrders } = useRider()

  return (
    <div className="container">
      <div className="page-head">
        <div className="page-head-text">
          <div className="page-title">My Trips</div>
          <div className="page-sub">{myOrders.length} total orders</div>
        </div>
      </div>

      {myOrders.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><Icon name="truck" style={{ width: '28px', height: '28px', color: 'var(--mint-deep)' }} /></div>
          <h3>No trips yet</h3>
          <p>Start delivering to see your trip history</p>
        </div>
      ) : (
        myOrders.map(order => (
          <div key={order.id} className="order-card" onClick={() => navigate('orderDetail', { orderId: order.id })}>
            <div className="oc-mid">
              <div className="oc-id">{order.id}</div>
              <div className="oc-title">{order.title || 'Order'}</div>
              <div className="oc-meta">₹{order.total || 0}</div>
            </div>
            <span className={`pill ${order.statusKey === 'delivered' ? '' : 'cobalt'}`}>
              {STATUS_LABELS[order.statusKey] || order.statusKey}
            </span>
          </div>
        ))
      )}
    </div>
  )
}

export default Trips
