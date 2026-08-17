import React from 'react'
import { useApp } from '../context/AppContext'
import { formatPrice } from '../data/mockData'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import Stepper from '../components/Stepper'
import SectionLabel from '../components/SectionLabel'
import PhotoAttach from '../components/PhotoAttach'

const Cart = ({ navigate, notify, params }) => {
  const { cartLines, cartTotal, setQty, itemPhotos } = useApp()

  // Back returns to wherever the user actually came from (bag is reachable from
  // the service picker, Orders, and the address screen), defaulting to Services.
  const goBack = () => {
    const from = params?.from
    if (from === 'orders') navigate('orders')
    else if (from === 'address') navigate('address')
    else if (from === 'service' && params?.serviceId) navigate('service', { serviceId: params.serviceId })
    else navigate('services')
  }

  if (cartLines.length === 0) {
    return (
      <div className="container">
        <PageHeader title="Your bag" sub="Review items before checkout" onBack={goBack} />
        <div className="cell span-4 empty">
          <div className="empty-icon"><Icon name="bag" /></div>
          <h3>Your bag is empty</h3>
          <p>Pick a service and add some items to get started.</p>
        </div>
        <button className="btn btn-ink" onClick={() => navigate('services')}>
          Browse services <Icon name="arrow" />
        </button>
      </div>
    )
  }

  return (
    <div className="container pad-bar">
      <PageHeader title="Your bag" sub="Review items before checkout" onBack={goBack} />

      <div className="detail-list">
        {cartLines.map((line) => (
          <div key={line.id} className="detail-item">
            <div className="item-ico">
              {itemPhotos[line.id] ? <img src={itemPhotos[line.id]} alt={line.name} /> : <Icon name={line.icon} />}
            </div>
            <div className="item-info">
              <div className="item-name">{line.name}</div>
              <div className="item-price">
                {formatPrice(line.price)}{line.unit === 'kg' ? '/kg' : ' / piece'}
                <span className="item-unit"> · {formatPrice(line.price * line.qty)}</span>
              </div>
            </div>
            <div className="item-actions">
              <PhotoAttach itemId={line.id} label={`Attach photo of ${line.name}`} notify={notify} />
              <Stepper qty={line.qty} unit={line.unit} onChange={(q) => setQty(line.id, q)} />
            </div>
          </div>
        ))}
      </div>

      <SectionLabel title="Bill details" />
      <div className="summary-card">
        <div className="totals">
          <div className="total-row"><span>Subtotal</span><span>{formatPrice(cartTotal)}</span></div>
          <div className="total-row"><span>Pickup &amp; delivery</span><strong>Free</strong></div>
          <div className="grand">
            <div className="total-row"><span>Total</span><span>{formatPrice(cartTotal)}</span></div>
          </div>
        </div>
      </div>

      <div className="cta-bar">
        <div>
          <div className="cb-label">Total</div>
          <div className="cb-total">{formatPrice(cartTotal)}</div>
        </div>
        <button className="bar-btn cobalt" onClick={() => navigate('address', { from: 'cart' })}>
          Checkout <Icon name="arrow" style={{ width: 15, height: 15 }} />
        </button>
      </div>
    </div>
  )
}

export default Cart
