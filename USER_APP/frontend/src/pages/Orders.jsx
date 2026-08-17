import React, { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatPrice, ACTIVE_STATUSES, CANCELLABLE_STATUSES } from '../data/mockData'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import SectionLabel from '../components/SectionLabel'
import ActiveOrderCard from '../components/ActiveOrderCard'
import Modal from '../components/Modal'
import { useScrollLock, useSwipeDismiss } from '../utils/popup'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

const RATE_LABELS = ['', 'Poor', 'Okay', 'Good', 'Great', 'Excellent']

const isActive = (o) => ACTIVE_STATUSES.includes(o.statusKey)
const isCancellable = (o) => CANCELLABLE_STATUSES.includes(o.statusKey)

const EMPTY_STATES = {
  all: { icon: 'bag', title: 'No orders yet', text: 'Your laundry journey starts here.', cta: 'Start Your First Order →' },
  active: { icon: 'truck', title: 'No active orders', text: 'Nothing is in the pipeline right now. Schedule a pickup and we will take care of the rest.', cta: 'Start Your First Order →' },
  completed: { icon: 'check', title: 'No completed orders yet', text: 'Your delivered orders will appear here, ready to rate and reorder.', cta: 'Start Your First Order →' },
  cancelled: { icon: 'x', title: 'No cancelled orders', text: 'Orders you cancel will show up here for reference.', cta: 'Browse Services →' },
}

const DEMO_TICK_MS = 8000

const Orders = ({ navigate, notify, registerRefresh }) => {
  const { orders, activeOrder, cancelOrder, reorder, rateOrder, advanceActiveOrder, cartCount, reloadFromStorage } = useApp()
  const [filter, setFilter] = useState('all')
  const [reviewTarget, setReviewTarget] = useState(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [demo, setDemo] = useState(false)

  // APK only: lock the page behind the review sheet + swipe down anywhere to close.
  useScrollLock(!!reviewTarget)
  const { sheetRef: reviewSheetRef, handlers: reviewSwipe } = useSwipeDismiss(() => setReviewTarget(null))

  // Pull-to-refresh resets this section only: re-sync stored data, restore the
  // default filter and stop the live demo — never reloads the whole app.
  useEffect(() => {
    if (!registerRefresh) return
    registerRefresh(() => {
      reloadFromStorage()
      setFilter('all')
      setDemo(false)
      setReviewTarget(null)
      setCancelTarget(null)
      notify('Orders refreshed')
    })
    return () => registerRefresh(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerRefresh])

  // Live demo: advance the active order's status on a timer.
  useEffect(() => {
    if (!demo) return
    const id = setInterval(() => {
      const label = advanceActiveOrder()
      if (!label) {
        setDemo(false)
        notify('All orders delivered — demo finished 🎉')
      } else {
        notify(`Status → ${label}`)
      }
    }, DEMO_TICK_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, advanceActiveOrder])

  const toggleDemo = () => {
    if (demo) {
      setDemo(false)
      notify('Demo paused')
      return
    }
    const label = advanceActiveOrder()
    if (!label) return notify('No active orders to simulate')
    setDemo(true)
    notify(`Demo on — status → ${label}`)
  }

  const counts = useMemo(
    () => ({
      all: orders.length,
      active: orders.filter(isActive).length,
      completed: orders.filter((o) => o.statusKey === 'delivered').length,
      cancelled: orders.filter((o) => o.statusKey === 'cancelled').length,
    }),
    [orders]
  )

  // Orders shown in the list — the featured active order renders separately on top.
  const list = useMemo(() => {
    let rows = orders
    if (filter === 'active') rows = rows.filter(isActive)
    else if (filter === 'completed') rows = rows.filter((o) => o.statusKey === 'delivered')
    else if (filter === 'cancelled') rows = rows.filter((o) => o.statusKey === 'cancelled')
    return rows.filter((o) => !(activeOrder && o.id === activeOrder.id))
  }, [orders, filter, activeOrder])

  const showFeatured = activeOrder && (filter === 'all' || filter === 'active')
  const emptyState = EMPTY_STATES[filter]

  const openReview = (o) => {
    setReviewTarget(o)
    setRating(o.review?.rating || 0)
    setComment(o.review?.comment || '')
  }

  const saveReview = () => {
    if (rating < 1) return notify('Tap a star to rate first')
    rateOrder(reviewTarget.id, rating, comment.trim())
    notify('Thanks — review saved!')
    setReviewTarget(null)
  }

  const doReorder = (o) => {
    const n = reorder(o)
    if (!n) return notify('Could not reorder — no matching items')
    notify(`${n} item${n > 1 ? 's' : ''} added to your bag`)
    navigate('cart', { from: 'orders' })
  }

  const doCancel = () => {
    cancelOrder(cancelTarget.id)
    notify(`Order #${cancelTarget.id} cancelled`)
    setCancelTarget(null)
  }

  const pillClass = (o) =>
    o.statusKey === 'delivered' ? 'pill sun' : o.statusKey === 'cancelled' ? 'pill red' : 'pill'

  return (
    <div className="container">
      <PageHeader
        title="Orders"
        sub="Track, review &amp; reorder"
        right={
          <button className="icon-btn cart-btn" aria-label="Your bag" onClick={() => navigate('cart', { from: 'orders' })}>
            <Icon name="cart" />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
        }
      />

      {/* LIVE DEMO TOGGLE */}
      <div className="demo-row">
        <button className={`live-toggle ${demo ? 'on' : ''}`} onClick={toggleDemo}>
          <span className="live-dot" />
          {demo ? 'Demo running — advancing every 8s' : 'Play live status demo'}
        </button>
      </div>

      {/* FILTERS */}
      <div className="chip-row">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`chip ${filter === f.key ? 'on' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span className="chip-count">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {/* FEATURED ACTIVE ORDER */}
      {showFeatured && (
        <>
          <SectionLabel title="Active order" />
          <div className="bento">
            <ActiveOrderCard
              order={activeOrder}
              onTrack={() => navigate('tracking', { orderId: activeOrder.id })}
            />
          </div>
        </>
      )}

      {/* LIST OR EMPTY STATE */}
      {counts[filter] === 0 ? (
        <div className="cell span-4 empty" style={{ marginTop: showFeatured ? 16 : 0 }}>
          <div className="empty-icon"><Icon name={emptyState.icon} /></div>
          <h3>{emptyState.title}</h3>
          <p>{emptyState.text}</p>
          <button className="btn btn-sun empty-cta" onClick={() => navigate('services')}>
            {emptyState.cta}
          </button>
        </div>
      ) : list.length === 0 ? (
        showFeatured && (
          <p className="note" style={{ marginTop: 16 }}>
            No other orders yet — this is your only order so far.
          </p>
        )
      ) : (
        <>
          <SectionLabel title="Order history" />
          {list.map((o) => (
            <div key={o.id} className="order-item">
              <div className="order-card" onClick={() => navigate('tracking', { orderId: o.id })}>
                <img className="oc-thumb" src={o.thumb} alt={o.title} loading="lazy" />
                <div className="oc-mid">
                  <span className="oc-id mono">#{o.id} · {o.createdAt}</span>
                  <div className="oc-title">{o.title}</div>
                  <div className="oc-meta">
                    {formatPrice(o.total)} · {o.payment}
                    {o.review && <span className="stars-sm" style={{ marginLeft: 6 }}>{'★'.repeat(o.review.rating)}</span>}
                  </div>
                </div>
                <div className="oc-right">
                  <span className={pillClass(o)}>{o.statusLabel}</span>
                  <Icon name="chevron" style={{ transform: 'rotate(180deg)', color: 'var(--muted)' }} />
                </div>
              </div>

              <div className="order-actions">
                {o.statusKey === 'delivered' && (
                  <>
                    <button className="mini-btn" onClick={() => openReview(o)}>
                      <Icon name="star" /> {o.review ? 'Edit review' : 'Rate & Review'}
                    </button>
                    <button className="mini-btn ink" onClick={() => doReorder(o)}>
                      <Icon name="bag" /> Reorder
                    </button>
                  </>
                )}
                {isActive(o) && (
                  <>
                    <button className="mini-btn" onClick={() => navigate('tracking', { orderId: o.id })}>
                      <Icon name="truck" /> Track
                    </button>
                    {isCancellable(o) && (
                      <button className="mini-btn del" onClick={() => setCancelTarget(o)}>
                        <Icon name="trash" /> Cancel
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </>
      )}

      {/* RATE & REVIEW SHEET */}
      {reviewTarget && (
        <div className="modal-back" onClick={() => setReviewTarget(null)} {...reviewSwipe}>
          <div ref={reviewSheetRef} className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Rate your order</div>
            <div className="modal-text">
              How was <strong style={{ color: 'var(--ink)' }}>{reviewTarget.title}</strong> · #{reviewTarget.id}?
            </div>
            <div className="rate-stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className={`rate-star ${n <= rating ? 'on' : ''}`}
                  onClick={() => setRating(n)}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                >
                  <Icon name="star" />
                </button>
              ))}
            </div>
            <div className="rate-label">{RATE_LABELS[rating]}</div>
            <div className="field" style={{ marginTop: 16 }}>
              <textarea
                placeholder="Share a few words about your experience (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setReviewTarget(null)}>Cancel</button>
              <button className="btn btn-ink" onClick={saveReview}>Save review</button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION */}
      <Modal
        open={!!cancelTarget}
        title="Cancel this order?"
        text={
          cancelTarget
            ? `Order #${cancelTarget.id} · ${cancelTarget.title} will be cancelled. Any advance paid is refunded within 3–5 business days.`
            : ''
        }
        confirmLabel="Cancel order"
        danger
        onConfirm={doCancel}
        onClose={() => setCancelTarget(null)}
      />
    </div>
  )
}

export default Orders
