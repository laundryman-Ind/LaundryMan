import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatPrice, STATUS_FLOW, TRACK_ACTIVE, CANCELLABLE_STATUSES, RIDER } from '../data/mockData'
import Icon from '../components/Icon'
import Photo from '../components/Photo'
import PageHeader from '../components/PageHeader'
import TrackTimeline from '../components/TrackTimeline'
import TrackingMap from '../components/TrackingMap'
import Modal from '../components/Modal'
import { useScrollLock, useSwipeDismiss } from '../utils/popup'
import { generateInvoicePdf } from '../services/invoice'

const TIP_AMOUNTS = [20, 50, 100, 200]

const Tracking = ({ navigate, params, notify }) => {
  const { orders, cancelOrder, user } = useApp()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [tipOpen, setTipOpen] = useState(false)
  const [tip, setTip] = useState(50)
  const order = orders.find((o) => o.id === params?.orderId) || null

  // Tip sheet behaves like every other popup: background scroll locked, swipe down to dismiss.
  useScrollLock(tipOpen)
  const { sheetRef: tipSheetRef, handlers: tipSwipe } = useSwipeDismiss(() => setTipOpen(false))

  if (!order) {
    return (
      <div className="container">
        <PageHeader title="Order details" onBack={() => navigate('orders')} />
        <div className="cell span-4 empty">
          <div className="empty-icon"><Icon name="bag" /></div>
          <h3>Order not found</h3>
          <p>This order may have been removed.</p>
        </div>
        <button className="btn btn-ink" onClick={() => navigate('orders')}>Back to orders</button>
      </div>
    )
  }

  const cancelled = order.statusKey === 'cancelled'
  const delivered = order.statusKey === 'delivered'
  const events = order.timeline || []

  // Which lifecycle step is the latest reached one?
  const lastReached = cancelled
    ? (events.filter((e) => e.step !== 'cancelled').pop()?.step || null)
    : order.statusKey
  const reachedIdx = cancelled
    ? (lastReached ? STATUS_FLOW.findIndex((s) => s.key === lastReached) + 1 : 0)
    : (TRACK_ACTIVE[order.statusKey] ?? 0)
  const currentIdx = reachedIdx - 1
  const flow = cancelled ? STATUS_FLOW.slice(0, reachedIdx) : STATUS_FLOW

  // Rider assigned to this order. Live tracking / contact only make
  // sense while the order is on the move — hidden once delivered or cancelled.
  const rider = order.riderId ? (order.rider || null) : null

  // Download the A4 invoice PDF (delivered orders only).
  // In the APK, the PDF is saved to Documents/LaundryMan/invoice.
  const downloadInvoice = async () => {
    try {
      await generateInvoicePdf(order, user)
      notify('Invoice saved to Documents/LaundryMan/invoice')
    } catch (e) {
      console.warn('Invoice download failed', e)
      notify('Could not download invoice: ' + (e?.message || 'Error'))
    }
  }
  const riderStatus = {
    placed: 'Rider is on the way to pick up your order',
    picked_up: 'Bag picked up — heading to the laundry',
    washing: 'Your clothes are being washed',
    processing: 'Quality check & packing in progress',
    delivery: 'Rider is on the way with your order',
  }[order.statusKey] || 'Rider is on the way'

  return (
    <div className="container">
      <PageHeader title={`Order #${order.id}`} sub={`Placed ${order.createdAt}`} onBack={() => navigate('orders')} />

      <div className="cell has-photo span-4 svc-hero" style={{ minHeight: 190, marginBottom: 11 }}>
        <Photo src={order.thumb} alt={order.title} tone="var(--cobalt)" />
        <span className={`pill svc-pill ${delivered ? 'sun' : cancelled ? 'red' : ''}`}>
          {order.statusLabel}
        </span>
        <h2 style={{ fontSize: 30 }}>{order.title}</h2>
      </div>

      {/* RIDER GPS TRACKER — live map, shown before the activity timeline */}
      {!delivered && !cancelled && (
        <div className="summary-card" style={{ marginBottom: 11 }}>
          <div className="spread">
            <div className="sec-title" style={{ margin: 0 }}>Rider GPS Tracker</div>
            <span className="pill cobalt">{order.statusLabel}</span>
          </div>
          <TrackingMap
            pickup={order.pickupCoords}
            delivery={order.deliveryCoords}
            rider={order.riderCoords}
            statusKey={order.statusKey}
          />
          <div className="kv" style={{ marginTop: 12 }}><span>Rider status</span><strong>{riderStatus}</strong></div>
          <div className="kv"><span>Delivery ETA</span><strong>{order.eta}</strong></div>
        </div>
      )}

      {/* DETAILED TIMELINE */}
      <div className="summary-card" style={{ marginBottom: 11 }}>
        <div className="sec-title" style={{ margin: 0 }}>Activity</div>
        <div className="vtimeline">
          {flow.map((s, i) => {
            const done = cancelled ? i < reachedIdx : i < currentIdx
            const latest = !cancelled && i === currentIdx
            const ev = events.find((e) => e.step === s.key)
            return (
              <div key={s.key} className={`vstep ${done ? 'done' : ''} ${latest ? 'latest' : ''}`}>
                <div className="vdot"><Icon name={s.icon} style={{ width: 16, height: 16 }} /></div>
                <div className="vbody">
                  <div className="vrow">
                    <span className="vlabel">{s.label}</span>
                    {latest && <span className="vbadge">Latest</span>}
                  </div>
                  {(done || latest) && ev && <div className="vtime mono">{ev.time}</div>}
                  {(done || latest) && ev?.note && <div className="vnote">{ev.note}</div>}
                </div>
              </div>
            )
          })}
          {cancelled && (
            <div className="vstep cancelled">
              <div className="vdot"><Icon name="x" style={{ width: 16, height: 16 }} /></div>
              <div className="vbody">
                <div className="vrow">
                  <span className="vlabel">Order cancelled</span>
                  <span className="vbadge">Latest</span>
                </div>
                <div className="vtime mono">{events.find((e) => e.step === 'cancelled')?.time || '—'}</div>
                <div className="vnote">This order was cancelled. Refunds, if any, are processed within 3–5 business days.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!delivered && !cancelled && (
        <div className="summary-card" style={{ marginBottom: 11 }}>
          <TrackTimeline statusKey={order.statusKey} />
          <div className="kv"><span>Estimated delivery</span><strong>{order.eta}</strong></div>
          <div className="kv"><span>One-time OTP</span><strong className="mono">••••</strong></div>
          <p className="note" style={{ textAlign: 'left', margin: '10px 0 0' }}>
            Your rider shares a single OTP for both pickup and delivery. Never share it with anyone else.
          </p>
        </div>
      )}

      <div className="summary-card" style={{ marginBottom: 11 }}>
        <div className="sec-title" style={{ margin: 0 }}>Order details</div>
        <div className="totals" style={{ marginTop: 12 }}>
          {order.items.map((it, i) => (
            <div key={i} className={`total-row ${it.photo ? 'item-photo-row' : ''}`}>
              {it.photo && <img className="item-photo-thumb" src={it.photo} alt={it.name} loading="lazy" />}
              <span>{it.name} × {it.qty}{it.unit === 'kg' ? ' kg' : ''}</span>
              <span className={it.photo ? 'amount' : ''}>{formatPrice(it.amount)}</span>
            </div>
          ))}
          <div className="grand">
            <div className="total-row"><span>Total</span><span>{formatPrice(order.total)}</span></div>
          </div>
        </div>
        {order.items.some((it) => it.photo) && (
          <p className="note" style={{ textAlign: 'left', margin: '12px 0 0', fontSize: 11 }}>
            <Icon name="shield" style={{ width: 12, height: 12, marginRight: 5, verticalAlign: -2 }} />
            Photos attached for pickup verification.
          </p>
        )}
      </div>

      {/* RIDER CONTACT & TIP */}
      {!delivered && !cancelled && rider && (
        <div className="summary-card" style={{ marginBottom: 11 }}>
          <div className="spread">
            <div className="row">
              <div className="rider-avatar">{rider.name.charAt(0)}</div>
              <div>
                <div className="rider-name">{rider.name} is your delivery partner</div>
                <div className="rider-sub">Rider · {rider.phone}</div>
              </div>
            </div>
            <a className="call-btn" href={rider.phoneHref}>
              <Icon name="phone" style={{ width: 16, height: 16 }} /> Call Now
            </a>
          </div>
          <div className="tip-box">
            <div>
              <div className="tip-title">Make their day by leaving a tip.</div>
              <div className="tip-sub">Tips go directly to {rider.name}.</div>
            </div>
            <button className="tip-btn" onClick={() => { setTip(50); setTipOpen(true) }}>
              <Icon name="star" style={{ width: 16, height: 16 }} /> Leave a Tip
            </button>
          </div>
        </div>
      )}

      <div className="summary-card">
        <div className="kv"><span>Delivery address</span><strong style={{ textAlign: 'right', maxWidth: '60%' }}>{order.address}</strong></div>
        <div className="kv"><span>Pickup window</span><strong>{order.pickup || '—'}</strong></div>
        <div className="kv"><span>Payment</span><strong>{order.payment}</strong></div>
        <div className="kv"><span>Placed on</span><strong>{order.createdAt}</strong></div>
      </div>

      {delivered && order.review && (
        <div className="summary-card" style={{ marginTop: 11 }}>
          <div className="spread">
            <div>
              <div className="stat-label">Your review</div>
              <div className="stars-sm" style={{ marginTop: 6 }}>
                {'★'.repeat(order.review.rating)}{'☆'.repeat(5 - order.review.rating)}
              </div>
            </div>
            <Icon name="star" style={{ width: 26, height: 26, color: 'var(--sun)' }} />
          </div>
          {order.review.comment && (
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginTop: 10, lineHeight: 1.55 }}>
              “{order.review.comment}”
            </p>
          )}
        </div>
      )}

      <div style={{ height: 12 }} />
      {CANCELLABLE_STATUSES.includes(order.statusKey) && (
        <>
          <button className="btn btn-ghost btn-del" onClick={() => setConfirmCancel(true)}>
            <Icon name="trash" style={{ width: 16, height: 16 }} /> Cancel order
          </button>
          <div style={{ height: 10 }} />
        </>
      )}
      {/* Invoice is only downloadable once the order has been delivered */}
      {delivered && (
        <>
          <button className="btn btn-ghost" onClick={downloadInvoice}>
            <Icon name="download" style={{ width: 16, height: 16 }} /> Download invoice
          </button>
          <div style={{ height: 10 }} />
        </>
      )}
      <button className="btn btn-ghost" onClick={() => navigate('support')}>
        <Icon name="material-symbols:support-agent-rounded" style={{ width: 16, height: 16 }} /> Need help with this order?
      </button>

      {/* TIP SHEET */}
      {tipOpen && (
        <div className="modal-back" onClick={() => setTipOpen(false)} {...tipSwipe}>
          <div ref={tipSheetRef} className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Leave a tip</div>
            <div className="modal-text">
              Make {rider.name}'s day — your tip goes directly to your delivery partner.
            </div>
            <div className="tip-grid">
              {TIP_AMOUNTS.map((a) => (
                <button key={a} className={`tip-chip ${tip === a ? 'on' : ''}`} onClick={() => setTip(a)}>
                  <span className="mono">₹{a}</span>
                </button>
              ))}
            </div>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setTipOpen(false)}>Cancel</button>
              <button className="btn btn-ink" onClick={() => { setTipOpen(false); notify(`Tip of ₹${tip} sent — thank you!`) }}>
                Send tip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION */}
      <Modal
        open={confirmCancel}
        title="Cancel this order?"
        text={`Order #${order.id} · ${order.title} will be cancelled. Any advance paid is refunded within 3–5 business days.`}
        confirmLabel="Cancel order"
        danger
        onConfirm={async () => {
          setConfirmCancel(false)
          try {
            await cancelOrder(order.id)
            notify(`Order #${order.id} cancelled`)
          } catch (e) {
            notify(e.message || 'Could not cancel order — try again')
          }
        }}
        onClose={() => setConfirmCancel(false)}
      />
    </div>
  )
}

export default Tracking
