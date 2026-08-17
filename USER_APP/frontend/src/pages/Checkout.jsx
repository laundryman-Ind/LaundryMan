import React from 'react'
import { useApp } from '../context/AppContext'
import { formatPrice } from '../data/mockData'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import SectionLabel from '../components/SectionLabel'

const Checkout = ({ navigate, notify }) => {
  const {
    cartLines,
    cartTotal,
    addresses,
    selectedAddressId,
    payMethods,
    payMethod,
    setPayMethod,
    selectedPay,
    placeOrder,
  } = useApp()

  if (cartLines.length === 0) {
    return (
      <div className="container">
        <PageHeader title="Checkout" sub="Review before we start" onBack={() => navigate('address', { from: 'checkout' })} />
        <div className="cell span-4 empty">
          <div className="empty-icon"><Icon name="bag" /></div>
          <h3>Your bag is empty</h3>
          <p>Add items to your bag before checking out.</p>
        </div>
        <button className="btn btn-ink" onClick={() => navigate('services')}>
          Browse services <Icon name="arrow" />
        </button>
      </div>
    )
  }

  const address = addresses.find((a) => a.id === selectedAddressId) || null

  const place = () => {
    if (!address) {
      notify('Add a delivery address first')
      navigate('address', { from: 'checkout' })
      return
    }
    const order = placeOrder({
      items: cartLines.map((l) => ({ ...l })),
      total: cartTotal,
      address: `${address.label} — ${address.line}`,
      payment: selectedPay?.label || 'Cash on delivery',
    })
    notify(`Order ${order.id} placed`)
    navigate('tracking', { orderId: order.id })
  }

  return (
    <div className="container pad-bar">
      <PageHeader title="Checkout" sub="One last look before we start" onBack={() => navigate('address', { from: 'checkout' })} />

      <div className="sec-title">Order summary</div>
      <div className="summary-card">
        <div className="totals">
          {cartLines.map((l) => (
            <div key={l.id} className="total-row">
              <span>{l.name} × {l.qty}{l.unit === 'kg' ? ' kg' : ''}</span>
              <span>{formatPrice(l.price * l.qty)}</span>
            </div>
          ))}
          <div className="total-row"><span>Pickup &amp; delivery</span><strong>Free</strong></div>
          <div className="grand">
            <div className="total-row"><span>Total</span><span>{formatPrice(cartTotal)}</span></div>
          </div>
        </div>
      </div>

      <div className="sec-title">Delivery address</div>
      <div className="addr-card on" onClick={() => navigate('address', { from: 'checkout' })}>
        <div className="addr-radio">
          <Icon name={address ? 'check' : 'plus'} style={{ width: 12, height: 12 }} />
        </div>
        <div style={{ flex: 1 }}>
          <span className="addr-label">{address ? address.label : 'Delivery address'}</span>
          <div className="addr-line">{address ? address.line : 'Tap to add a delivery address'}</div>
          {address && <div className="addr-phone">{address.phone}</div>}
        </div>
        <Icon name="chevron" style={{ transform: 'rotate(180deg)', color: 'var(--muted)' }} />
      </div>

      <div className="sec-title">Payment method</div>
      {payMethods.map((m) => (
        <div
          key={m.id}
          className={`pay-row ${payMethod === m.id ? 'on' : ''}`}
          onClick={() => { setPayMethod(m.id); notify(`${m.label} selected`) }}
        >
          <div className={`pay-ico ${m.type === 'upi' ? 'upi' : m.type === 'credit' ? 'credit' : 'debit'}`}>
            <Icon name={m.icon || 'card'} />
          </div>
          <div className="pay-mid">
            <div className="pay-name">{m.label}</div>
            <div className="pay-detail">{m.detail}</div>
          </div>
          <div className="pay-radio">
            {payMethod === m.id && <Icon name="check" style={{ width: 13, height: 13 }} />}
          </div>
        </div>
      ))}
      <div
        className={`pay-row ${payMethod === 'cod' ? 'on' : ''}`}
        onClick={() => { setPayMethod('cod'); notify('Cash on delivery selected') }}
      >
        <div className="pay-ico cod"><Icon name="cash" /></div>
        <div className="pay-mid">
          <div className="pay-name">Cash on delivery</div>
          <div className="pay-detail">Pay the rider when your order arrives</div>
        </div>
        <div className="pay-radio">
          {payMethod === 'cod' && <Icon name="check" style={{ width: 13, height: 13 }} />}
        </div>
      </div>
      <button className="btn btn-ghost" style={{ marginTop: 11 }} onClick={() => navigate('payments', { from: 'checkout' })}>
        <Icon name="plus" style={{ width: 15, height: 15 }} /> Add payment method
      </button>

      <div className="cta-bar">
        <div>
          <div className="cb-label">Pay {selectedPay?.label || 'Cash on delivery'}</div>
          <div className="cb-total">{formatPrice(cartTotal)}</div>
        </div>
        <button className="bar-btn cobalt" onClick={place}>
          Place order <Icon name="check" style={{ width: 15, height: 15 }} />
        </button>
      </div>
    </div>
  )
}

export default Checkout
