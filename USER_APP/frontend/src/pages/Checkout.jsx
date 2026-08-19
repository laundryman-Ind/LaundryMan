import React, { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatPrice } from '../data/mockData'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import SectionLabel from '../components/SectionLabel'
import { listCoupons, listCouponUses } from '../services/api'

const mockCouponSuggestions = [
  { id: 'FRESH20', code: 'FRESH20', title: 'Weekend special', tag: '20% off', desc: 'On dry cleaning orders.', type: 'percent', value: 20, min_total: 0, service_id: 'dry-clean', service_type: 'dry-clean', tone: '#C9821A' },
  { id: 'NEW50', code: 'NEW50', title: 'Welcome offer', tag: '50% off', desc: 'Up to ₹150 on first order.', type: 'percent', value: 50, min_total: 0, max_value: 150, tone: '#16279E' },
  { id: 'FREEPICK', code: 'FREEPICK', title: 'Free pickup', tag: 'Free delivery', desc: 'On all orders above ₹499.', type: 'flat', value: 0, min_total: 499, tone: '#1F7A50' },
]

const Checkout = ({ navigate, notify, back }) => {
  const {
    cartLines = [],
    cartTotal = 0,
    addresses = [],
    selectedAddressId = '',
    payMethods = [],
    payMethod = 'cod',
    setPayMethod,
    selectedPay,
    placeOrder,
  } = useApp()

  const [couponInput, setCouponInput] = useState('')
  const [couponList, setCouponList] = useState(mockCouponSuggestions)
  const [selectedCoupon, setSelectedCoupon] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [usedCouponCodes, setUsedCouponCodes] = useState([])

  // Load coupon usage from the database (source of truth across devices).
  // Do NOT fall back to localStorage — stale local data could show a coupon
  // as "used" when it was released on another device, or vice versa.
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const uses = await listCouponUses().catch(() => [])
        if (mounted && Array.isArray(uses)) {
          // Build a map of coupon_code → count for proper usage_limit checks
          const codeCount = new Map()
          for (const u of uses) {
            const code = String(u?.coupon_code || u?.code || '').toUpperCase().trim()
            if (code) codeCount.set(code, (codeCount.get(code) || 0) + 1)
          }
          setUsedCouponCodes(Array.from(codeCount.entries()))
        } else if (mounted) {
          setUsedCouponCodes([])
        }
      } catch {
        if (mounted) setUsedCouponCodes([])
      }
    })()
    return () => { mounted = false }
  }, [])

  // Load available coupons catalog
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const coupons = await listCoupons().catch(() => null)
        if (mounted && Array.isArray(coupons) && coupons.length > 0) {
          setCouponList(coupons)
        }
      } catch {
        if (mounted) setCouponList(mockCouponSuggestions)
      }
    })()
    return () => { mounted = false }
  }, [])

  // Check whether a coupon is eligible for the current cart contents.
  // This is CLIENT-SIDE feedback only; the server re-validates on order
  // placement via the place-order Edge Function + redeem_coupon RPC.
  const getCouponRejectReason = (coupon) => {
    if (!coupon) return 'No coupon selected'

    // Minimum total check
    const minTotal = Number(coupon.min_total || 0)
    const currentTotal = Number(cartTotal) || 0
    if (minTotal > 0 && minTotal > currentTotal) {
      return `Minimum order of ${formatPrice(minTotal)} required`
    }

    // Service restriction check
    const lines = Array.isArray(cartLines) ? cartLines : []
    const serviceIds = new Set(lines.map((line) => line?.serviceId).filter(Boolean))
    const requiredService = String(coupon.service_id || coupon.service_type || '').toLowerCase().trim()
    if (requiredService) {
      const matches = Array.from(serviceIds).some((id) => String(id || '').toLowerCase() === requiredService)
      if (!matches) return `Valid only for ${requiredService.replace(/-/g, ' ')} orders`
    }

    // Value check
    const t = String(coupon.type || '').toLowerCase().trim()
    const val = Number(coupon.value || 0)
    if (val <= 0 && (t === 'percent' || t === 'percentage' || t === 'flat' || t === 'fixed')) {
      return 'This coupon has no discount value'
    }

    // Usage limit check — uses the DB-sourced usage count per coupon code.
    // Checks both one_time (legacy) and usage_limit fields.
    const code = String(coupon.code || '').toUpperCase().trim()
    const usageMap = Array.isArray(usedCouponCodes) ? usedCouponCodes : [] // entries: [code, count]
    const usageEntry = usageMap.find(([c]) => c === code)
    const usageCount = usageEntry ? usageEntry[1] : 0

    if (usageCount > 0) {
      const usageLimit = Number(coupon.usage_limit || 0)
      const isOneTime = Boolean(coupon.one_time || coupon.single_use)
      // If usage_limit is set and reached, block. If one_time/single_use, block on any usage.
      const limit = usageLimit > 0 ? usageLimit : (isOneTime ? 1 : 0)
      if (limit > 0 && usageCount >= limit) {
        return 'This coupon has already been used'
      }
    }

    return null // eligible
  }

  const discountAmount = useMemo(() => {
    if (!selectedCoupon) return 0
    const currentTotal = Number(cartTotal) || 0
    if (currentTotal <= 0) return 0

    const t = String(selectedCoupon.type || '').toLowerCase().trim()
    const isPercent = t === 'percent' || t === 'percentage' || t === 'pct' || t === '%'
    const isFlat = t === 'flat' || t === 'fixed' || t === 'amount' || t === '₹'
    const val = Number(selectedCoupon.value || 0)

    if (isFlat) {
      return Math.min(Math.max(0, val), currentTotal)
    }
    if (isPercent) {
      const pct = Math.max(0, val) / 100
      const maxDiscount = Number(selectedCoupon.max_value || 0)
      const raw = currentTotal * pct
      return maxDiscount > 0 ? Math.min(raw, maxDiscount) : raw
    }
    return 0
  }, [cartTotal, selectedCoupon])

  const safeCartTotal = Number(cartTotal) || 0
  const discountedTotal = Math.max(safeCartTotal - discountAmount, 0)
  const gstRate = 0.18
  const gstAmount = discountedTotal * gstRate
  const cgstAmount = gstAmount / 2
  const sgstAmount = gstAmount / 2
  const finalTotalWithTax = discountedTotal + gstAmount

  const applyCoupon = (code) => {
    const normalized = String(code || '').trim().toUpperCase()
    if (!normalized) {
      notify('Enter a coupon code')
      return
    }

    // If the same coupon is already selected, remove it (toggle off)
    if (selectedCoupon && String(selectedCoupon.code || '').toUpperCase().trim() === normalized) {
      setSelectedCoupon(null)
      setCouponInput('')
      setCouponError('')
      notify('Coupon removed')
      return
    }

    const list = Array.isArray(couponList) ? couponList : mockCouponSuggestions
    const match = list.find((c) => String(c?.code || '').toUpperCase().trim() === normalized)
    if (!match) {
      notify('Coupon not found')
      setCouponError('Coupon not found')
      return
    }

    const reason = getCouponRejectReason(match)
    if (reason) {
      notify(reason)
      setCouponError(reason)
      return
    }

    // Applying a coupon is purely a UI selection — NO database write.
    // Coupon usage is recorded server-side only when the order is
    // successfully placed (via the place-order Edge Function).
    setSelectedCoupon(match)
    setCouponInput(match.code || '')
    setCouponError('')
    notify(`${match.code} applied`)
  }

  const handleBack = () => {
    if (typeof back === 'function') {
      back()
    } else {
      navigate('address', { from: 'checkout' })
    }
  }

  const lines = Array.isArray(cartLines) ? cartLines : []

  if (lines.length === 0) {
    return (
      <div className="container">
        <PageHeader title="Checkout" sub="Review before we start" onBack={handleBack} />
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

  const addrList = Array.isArray(addresses) ? addresses : []
  const address = addrList.find((a) => a && a.id === selectedAddressId) || null

  const [placing, setPlacing] = useState(false)

  const place = async () => {
    if (!address) {
      notify('Add a delivery address first')
      navigate('address', { from: 'checkout' })
      return
    }
    if (placing) return  // prevent double-tap
    setPlacing(true)

    // Collect service IDs from cart lines for coupon validation
    const serviceIdSet = new Set(
      lines.map((l) => l?.serviceId).filter(Boolean)
    )

    try {
      const order = await placeOrder({
        items: lines.map((l) => ({ ...l })),
        total: Math.round(finalTotalWithTax),
        subtotal: Math.round(safeCartTotal),
        discount: Math.round(discountAmount),
        coupon: selectedCoupon ? { code: selectedCoupon.code, title: selectedCoupon.title, type: selectedCoupon.type, value: selectedCoupon.value } : null,
        tax: Math.round(gstAmount),
        address: `${address.label || 'Delivery'} — ${address.line || ''}`,
        payment: selectedPay?.label || 'Cash on delivery',
        serviceIds: Array.from(serviceIdSet),
      })
      notify(`Order ${order?.id || ''} placed`)
      navigate('tracking', { orderId: order?.id })
    } catch (e) {
      // Server rejected the order (e.g. coupon already used)
      const msg = e?.message || 'Order placement failed'
      notify(msg)
      setCouponError(msg)
      // Clear the invalid coupon selection
      if (msg.toLowerCase().includes('coupon') || msg.includes('already been used')) {
        setSelectedCoupon(null)
        setCouponInput('')
      }
    } finally {
      setPlacing(false)
    }
  }

  const couponsToRender = Array.isArray(couponList) ? couponList : mockCouponSuggestions
  const safePayMethods = Array.isArray(payMethods) ? payMethods : []

  return (
    <div className="container pad-bar">
      <PageHeader title="Checkout" sub="One last look before we start" onBack={handleBack} />

      <div className="sec-title">Order summary</div>
      <div className="summary-card">
        <div className="totals">
          {lines.map((l) => (
            <div key={l.id || l.name} className="total-row">
              <span>{l.name} × {l.qty}{l.unit === 'kg' ? ' kg' : ''}</span>
              <span>{formatPrice((Number(l.price) || 0) * (Number(l.qty) || 1))}</span>
            </div>
          ))}
          {discountAmount > 0 && (
            <div className="total-row">
              <span>Discount ({selectedCoupon?.code})</span>
              <span style={{ color: 'var(--mint-deep, #1F7A50)' }}>-{formatPrice(discountAmount)}</span>
            </div>
          )}
          <div className="total-row"><span>CGST 9%</span><span>{formatPrice(cgstAmount)}</span></div>
          <div className="total-row"><span>SGST 9%</span><span>{formatPrice(sgstAmount)}</span></div>
          <div className="total-row"><span>Pickup &amp; delivery</span><strong>Free</strong></div>
          <div className="grand">
            <div className="total-row"><span>Total</span><span>{formatPrice(finalTotalWithTax)}</span></div>
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
          {address?.phone && <div className="addr-phone">{address.phone}</div>}
        </div>
        <Icon name="chevron" style={{ transform: 'rotate(180deg)', color: 'var(--muted)' }} />
      </div>

      <div className="sec-title">Apply coupon</div>
      <div className="coupon-card summary-card">
        <div className="coupon-input-row">
          <input
            value={couponInput}
            onChange={(e) => { setCouponInput(e.target.value); setCouponError('') }}
            placeholder="Enter code"
            className="coupon-input"
          />
          {selectedCoupon ? (
            <button
              className="coupon-apply"
              style={{ background: '#e53e3e' }}
              onClick={() => {
                setSelectedCoupon(null)
                setCouponInput('')
                setCouponError('')
                notify('Coupon removed')
              }}
            >
              Remove
            </button>
          ) : (
            <button className="coupon-apply" onClick={() => applyCoupon(couponInput)}>
              Apply
            </button>
          )}
        </div>

        {couponError && <div style={{ fontSize: 12, color: '#e53e3e', padding: '4px 0 2px' }}>{couponError}</div>}

        {selectedCoupon && discountAmount > 0 && (
          <div style={{ fontSize: 13, color: 'var(--mint-deep, #1F7A50)', padding: '6px 0 2px', fontWeight: 600 }}>
            ✓ {selectedCoupon.code} applied — {formatPrice(discountAmount)} off
          </div>
        )}

        {couponsToRender.slice(0, 3).map((coupon) => {
          if (!coupon) return null
          const isSelected = selectedCoupon?.code === coupon.code
          const rejectReason = getCouponRejectReason(coupon)
          const isDisabled = !isSelected && !!rejectReason
          return (
            <button
              key={coupon.id || coupon.code || coupon.title}
              type="button"
              className={`coupon-option ${isSelected ? 'on' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => applyCoupon(coupon.code || '')}
              style={isDisabled ? { opacity: 0.45 } : undefined}
            >
              <div className="coupon-badge" style={{ background: coupon.tone || '#16279E' }}>
                <Icon name="offers" />
              </div>
              <div className="coupon-copy">
                <div className="coupon-title">{coupon.tag || 'Offer'}</div>
                <div className="coupon-subtitle">{coupon.title || 'Coupon'} · {coupon.desc || ''}</div>
                {isDisabled && <div style={{ fontSize: 11, color: '#e53e3e', marginTop: 2 }}>{rejectReason}</div>}
              </div>
              <div className="coupon-check">
                {isSelected && <Icon name="check" style={{ width: 13, height: 13 }} />}
              </div>
            </button>
          )
        })}
      </div>

      <div className="sec-title">Payment method</div>
      {safePayMethods.map((m) => {
        if (!m) return null
        return (
          <div
            key={m.id}
            className={`pay-row ${payMethod === m.id ? 'on' : ''}`}
            onClick={() => { setPayMethod?.(m.id); notify(`${m.label || 'Payment method'} selected`) }}
          >
            <div className={`pay-ico ${m.type === 'upi' ? 'upi' : m.type === 'credit' ? 'credit' : 'debit'}`}>
              <Icon name={m.icon || 'card'} />
            </div>
            <div className="pay-mid">
              <div className="pay-name">{m.label || 'Card'}</div>
              <div className="pay-detail">{m.detail || ''}</div>
            </div>
            <div className="pay-radio">
              {payMethod === m.id && <Icon name="check" style={{ width: 13, height: 13 }} />}
            </div>
          </div>
        )
      })}
      <div
        className={`pay-row ${payMethod === 'cod' ? 'on' : ''}`}
        onClick={() => { setPayMethod?.('cod'); notify('Cash on delivery selected') }}
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

      <div className="summary-card" style={{ padding: 14, marginTop: 14 }}>
        <div className="total-row"><span>Subtotal</span><span>{formatPrice(safeCartTotal)}</span></div>
        {discountAmount > 0 && <div className="total-row"><span>Discount</span><span style={{ color: 'var(--mint-deep, #1F7A50)' }}>-{formatPrice(discountAmount)}</span></div>}
        <div className="total-row"><span>CGST 9%</span><span>{formatPrice(cgstAmount)}</span></div>
        <div className="total-row"><span>SGST 9%</span><span>{formatPrice(sgstAmount)}</span></div>
        <div className="grand">
          <div className="total-row"><span>Total</span><span>{formatPrice(finalTotalWithTax)}</span></div>
        </div>
      </div>

      <div className="cta-bar">
        <div>
          <div className="cb-label">Pay {selectedPay?.label || 'Cash on delivery'}</div>
          <div className="cb-total">{formatPrice(finalTotalWithTax)}</div>
        </div>
        <button className="bar-btn cobalt" onClick={place} disabled={placing}>
          {placing ? 'Placing…' : 'Place order'} <Icon name="check" style={{ width: 15, height: 15 }} />
        </button>
      </div>
    </div>
  )
}

export default Checkout
