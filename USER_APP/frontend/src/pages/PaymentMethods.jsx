import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import SectionLabel from '../components/SectionLabel'
import Modal from '../components/Modal'
import { useScrollLock, useSwipeDismiss } from '../utils/popup'

const PAY_TYPES = [
  { key: 'upi', label: 'UPI', sub: 'GPay, PhonePe, Paytm', icon: 'phone' },
  { key: 'debit', label: 'Debit card', sub: 'Any bank debit card', icon: 'card' },
  { key: 'credit', label: 'Credit card', sub: 'Visa, Mastercard, RuPay', icon: 'card' },
]

const ADD_TITLES = { upi: 'Add UPI ID', debit: 'Add debit card', credit: 'Add credit card' }
const EMPTY_FORM = { holder: '', upiId: '', number: '', expiry: '', cvv: '' }

const brandOf = (num) => {
  if (/^4/.test(num)) return 'Visa'
  if (/^5[1-5]/.test(num)) return 'Mastercard'
  if (/^3[47]/.test(num)) return 'Amex'
  if (/^(50|6[0-9]|81|82|83|84|85|86|87|88)/.test(num)) return 'RuPay'
  return 'Card'
}

const fmtCard = (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ')
const fmtExpiry = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 4)
  return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d
}

const PaymentMethods = ({ navigate, notify, params }) => {
  const { payMethods, payMethod, setPayMethod, addPayMethod, removePayMethod } = useApp()
  const [addType, setAddType] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)

  // APK only: lock the page behind the add sheet + swipe down anywhere to close.
  useScrollLock(!!addType)
  const { sheetRef: addSheetRef, handlers: addSwipe } = useSwipeDismiss(() => setAddType(null))

  const onBack = () => navigate(params?.from === 'checkout' ? 'checkout' : 'profile')

  const pick = (id) => {
    setPayMethod(id)
    notify(id === 'cod' ? 'Cash on delivery selected' : 'Payment method selected')
  }

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: '' }))
  }

  const openAdd = (key) => {
    setAddType(key)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  const save = () => {
    const errs = {}
    if (addType === 'upi') {
      if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(form.upiId.trim())) {
        errs.upiId = 'Enter a valid UPI ID, e.g. name@bank'
      }
    } else {
      const digits = form.number.replace(/\s/g, '')
      if (digits.length < 12 || digits.length > 19) errs.number = 'Enter a valid card number'
      if (form.holder.trim().length < 3) errs.holder = 'Enter the cardholder name'
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(form.expiry)) {
        errs.expiry = 'Use MM/YY format'
      } else {
        const exp = new Date(2000 + +form.expiry.slice(3), +form.expiry.slice(0, 2), 1)
        if (exp <= new Date()) errs.expiry = 'This card has expired'
      }
      if (!/^\d{3,4}$/.test(form.cvv)) errs.cvv = '3–4 digits'
    }
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    if (addType === 'upi') {
      const upiId = form.upiId.trim()
      addPayMethod({
        type: 'upi',
        upiId,
        holder: form.holder.trim(),
        icon: 'phone',
        label: `UPI · ${upiId}`,
        detail: form.holder.trim() || 'Unified Payments Interface',
      })
      notify('UPI ID added')
    } else {
      const digits = form.number.replace(/\s/g, '')
      const brand = brandOf(digits)
      const last4 = digits.slice(-4)
      addPayMethod({
        type: addType,
        brand,
        last4,
        expiry: form.expiry,
        holder: form.holder.trim(),
        icon: 'card',
        label: `${addType === 'credit' ? 'Credit' : 'Debit'} card ·••${last4}`,
        detail: `${brand} · exp ${form.expiry}`,
      })
      notify(`${addType === 'credit' ? 'Credit' : 'Debit'} card added`)
    }
    setAddType(null)
    setForm(EMPTY_FORM)
  }

  const doDelete = () => {
    removePayMethod(deleteTarget.id)
    notify(`${deleteTarget.label} removed`)
    setDeleteTarget(null)
  }

  const icoClass = (type) => (type === 'upi' ? 'pay-ico upi' : type === 'credit' ? 'pay-ico credit' : type === 'cod' ? 'pay-ico cod' : 'pay-ico debit')

  return (
    <div className="container">
      <PageHeader title="Payment methods" sub="Add UPI, debit or credit" onBack={onBack} />

      {/* SAVED METHODS */}
      {payMethods.length > 0 && (
        <>
          <SectionLabel title="Saved methods" />
          {payMethods.map((m) => (
            <div key={m.id} className={`pay-row ${payMethod === m.id ? 'on' : ''}`} onClick={() => pick(m.id)}>
              <div className={icoClass(m.type)}><Icon name={m.icon || 'card'} /></div>
              <div className="pay-mid">
                <div className="pay-name">{m.label}</div>
                <div className="pay-detail">{m.detail}</div>
              </div>
              <div className="pay-radio">
                {payMethod === m.id && <Icon name="check" style={{ width: 13, height: 13 }} />}
              </div>
              <button
                className="pay-del"
                aria-label={`Remove ${m.label}`}
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(m) }}
              >
                <Icon name="trash" style={{ width: 16, height: 16 }} />
              </button>
            </div>
          ))}
        </>
      )}

      {/* CASH ON DELIVERY */}
      <div className={`pay-row ${payMethod === 'cod' ? 'on' : ''}`} onClick={() => pick('cod')}>
        <div className="pay-ico cod"><Icon name="cash" /></div>
        <div className="pay-mid">
          <div className="pay-name">Cash on delivery</div>
          <div className="pay-detail">Pay the rider when your order arrives</div>
        </div>
        <div className="pay-radio">
          {payMethod === 'cod' && <Icon name="check" style={{ width: 13, height: 13 }} />}
        </div>
      </div>

      {/* ADD NEW */}
      <SectionLabel title="Add a payment method" />
      <div className="add-pay-grid">
        {PAY_TYPES.map((t) => (
          <button key={t.key} className="add-pay" onClick={() => openAdd(t.key)}>
            <Icon name={t.icon} />
            <span>{t.label}</span>
            <small>{t.sub}</small>
          </button>
        ))}
      </div>
      <p className="note" style={{ marginTop: 16 }}>
        Card details are stored only on this device for the prototype — CVV is never saved.
      </p>

      {/* ADD SHEET */}
      {addType && (
        <div className="modal-back" onClick={() => setAddType(null)} {...addSwipe}>
          <div ref={addSheetRef} className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{ADD_TITLES[addType]}</div>
            <div className="modal-text">Your details stay on this device.</div>

            {addType === 'upi' ? (
              <>
                <div className="field">
                  <label>UPI ID</label>
                  <input
                    type="text"
                    placeholder="yourname@bank"
                    value={form.upiId}
                    onChange={(e) => set('upiId', e.target.value)}
                    autoFocus
                  />
                  {errors.upiId && <div className="err">{errors.upiId}</div>}
                </div>
                <div className="field">
                  <label>Name (optional)</label>
                  <input
                    type="text"
                    placeholder="Alex"
                    value={form.holder}
                    onChange={(e) => set('holder', e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="field">
                  <label>Card number</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="1234 5678 9012 3456"
                    value={form.number}
                    onChange={(e) => set('number', fmtCard(e.target.value))}
                    autoFocus
                  />
                  {errors.number && <div className="err">{errors.number}</div>}
                </div>
                <div className="field">
                  <label>Cardholder name</label>
                  <input
                    type="text"
                    placeholder="Alex Doe"
                    value={form.holder}
                    onChange={(e) => set('holder', e.target.value)}
                  />
                  {errors.holder && <div className="err">{errors.holder}</div>}
                </div>
                <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                  <div className="field" style={{ flex: 1 }}>
                    <label>Expiry</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="MM/YY"
                      value={form.expiry}
                      onChange={(e) => set('expiry', fmtExpiry(e.target.value))}
                    />
                    {errors.expiry && <div className="err">{errors.expiry}</div>}
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label>CVV</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="•••"
                      value={form.cvv}
                      onChange={(e) => set('cvv', e.target.value.replace(/\D/g, ''))}
                    />
                    {errors.cvv && <div className="err">{errors.cvv}</div>}
                  </div>
                </div>
              </>
            )}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setAddType(null)}>Cancel</button>
              <button className="btn btn-ink" onClick={save}>Add payment method</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      <Modal
        open={!!deleteTarget}
        title="Remove payment method?"
        text={deleteTarget ? `${deleteTarget.label} will be removed from your saved methods.` : ''}
        confirmLabel="Remove"
        danger
        onConfirm={doDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default PaymentMethods
