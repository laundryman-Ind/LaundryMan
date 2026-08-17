import React from 'react'
import Icon from './Icon'
import TrackTimeline from './TrackTimeline'

const ActiveOrderCard = ({ order, onDetails, onTrack }) => (
  <div className="cell span-4 order-cell">
    <div className="order-top">
      <img className="order-thumb" src={order.thumb} alt="Folded laundry" loading="lazy" />
      <div style={{ flex: 1 }}>
        <span className="order-id mono">ORDER #{order.id}</span>
        <span className="order-title">{order.title}</span>
      </div>
      <span className="pill">{order.statusLabel}</span>
    </div>

    <TrackTimeline statusKey={order.statusKey} />

    <div className="order-bottom">
      <div>
        <small>Estimated delivery</small>
        <strong>{order.eta}</strong>
      </div>
      <button className="track-btn" onClick={onTrack}>
        {order.statusKey === 'placed' ? 'View details' : 'Track order'} <Icon name="arrow" style={{ width: 13, height: 13 }} />
      </button>
    </div>
  </div>
)

export default ActiveOrderCard
