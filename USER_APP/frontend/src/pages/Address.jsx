import React, { useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { getCurrentLocation, reverseGeocode } from '../services/geo'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import SectionLabel from '../components/SectionLabel'
import Modal from '../components/Modal'
import LocationMap from '../components/LocationMap'

const EMPTY_FORM = {
  label: '',
  house: '',
  street: '',
  area: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  latitude: null,
  longitude: null,
  accuracy: null,
  formatted_address: '',
  delivery_instructions: '',
}

// The address fields, in display order — used to build the readable `line`.
const ADDRESS_FIELDS = ['house', 'street', 'area', 'city', 'state', 'pincode']

// GPS accuracy → badge color: good ≤ 25 m (green), ok ≤ 100 m (yellow),
// poor > 100 m (red) — the badge itself signals how precise the fix is.
const accuracyLevel = (accuracy) => {
  if (accuracy <= 25) return 'good'
  if (accuracy <= 100) return 'ok'
  return 'poor'
}

const Address = ({ navigate, notify, params }) => {
  const {
    user,
    addresses,
    selectedAddressId,
    setSelectedAddressId,
    addAddress,
    updateAddress,
    removeAddress,
    cartCount,
  } = useApp()
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [locState, setLocState] = useState('idle') // idle | loading | done
  const [confirmDel, setConfirmDel] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM, phone: user?.phone || '' })
  // Guards against a slow reverse-geocode overwriting a NEWER pin drag.
  const geocodeSeq = useRef(0)

  const selected = addresses.find((a) => a.id === selectedAddressId) || null
  const editing = addresses.find((a) => a.id === editingId) || null

  const openAdd = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, phone: user?.phone || '' })
    setFormOpen(true)
  }

  const openEdit = (a) => {
    setEditingId(a.id)
    setForm({
      label: a.label,
      house: a.house || '',
      street: a.street || '',
      area: a.area || '',
      city: a.city || '',
      state: a.state || '',
      pincode: a.pincode || '',
      phone: a.phone,
      latitude: a.latitude ?? null,
      longitude: a.longitude ?? null,
      accuracy: a.accuracy ?? null,
      formatted_address: a.formatted_address || '',
      delivery_instructions: a.delivery_instructions || '',
    })
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
  }

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  // Capture the device's exact GPS position + accuracy, then reverse-geocode it
  // into the structured address fields. The coordinates are the real location;
  // the fields are just an editable, readable label.
  const useMyLocation = async () => {
    setLocState('loading')
    try {
      const loc = await getCurrentLocation()
      setForm((f) => ({
        ...f,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        formatted_address: loc.formatted_address,
        house: loc.house,
        street: loc.street,
        area: loc.area,
        city: loc.city,
        state: loc.state,
        pincode: loc.pincode,
        phone: f.phone || user?.phone || '',
      }))
      setFormOpen(true)
      setLocState('done')
      notify('GPS location captured — drag the pin to fine-tune')
    } catch (e) {
      setLocState('idle')
      notify(e.message === 'unsupported' ? 'Location not supported on this device' : 'Could not get your location')
    }
  }

  // The user moved the pin — the new coordinates ARE the location. Refresh the
  // structured address fields from those coordinates.
  const onPinMoved = async (lat, lng) => {
    const seq = ++geocodeSeq.current
    setForm((f) => ({
      ...f,
      latitude: lat,
      longitude: lng,
      // Pin manually placed → exact point by definition.
      accuracy: 0,
    }))
    try {
      const addr = await reverseGeocode(lat, lng)
      if (seq !== geocodeSeq.current) return // a newer drag already won
      setForm((f) => ({
        ...f,
        formatted_address: addr.formatted_address,
        house: addr.house,
        street: addr.street,
        area: addr.area,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
      }))
    } catch {
      // Keep the previous fields — the coordinates were already saved on the form.
    }
  }

  const submit = () => {
    const parts = ADDRESS_FIELDS.map((k) => form[k].trim()).filter(Boolean)
    if (!form.label.trim() || parts.length === 0) {
      notify('Fill in the address details')
      return
    }
    // Dedupe consecutive repeats so a road used as both street and area
    // doesn't print twice in the derived line.
    const line = parts.filter((p, i) => i === 0 || p !== parts[i - 1]).join(', ')
    const payload = {
      label: form.label.trim(),
      house: form.house.trim(),
      street: form.street.trim(),
      area: form.area.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      line,
      phone: form.phone.trim() || user?.phone || '',
      latitude: form.latitude,
      longitude: form.longitude,
      accuracy: form.accuracy,
      formatted_address: form.formatted_address || line,
      delivery_instructions: form.delivery_instructions.trim(),
    }
    if (editing) {
      updateAddress(editing.id, payload)
      notify('Address updated')
    } else {
      addAddress(payload)
      notify('Address added')
    }
    closeForm()
  }

  const doDelete = () => {
    if (confirmDel) {
      removeAddress(confirmDel.id)
      notify('Address deleted')
    }
    setConfirmDel(null)
  }

  const goBack = () => {
    const from = params?.from
    if (from && ['cart', 'checkout', 'home', 'profile', 'orders'].includes(from)) {
      navigate(from)
      return
    }
    if (cartCount > 0) navigate('cart', { from: 'address' })
    else navigate('profile')
  }

  const continueToCheckout = () => {
    if (cartCount === 0) {
      notify('Your bag is empty — add items first')
      navigate('services')
      return
    }
    if (!selected) {
      notify('Select a delivery address first')
      return
    }
    navigate('checkout')
  }

  const addressField = (key, label, placeholder) => (
    <div className="field" key={key}>
      <label htmlFor={`a-${key}`}>{label}</label>
      <input
        id={`a-${key}`}
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setField(key, e.target.value)}
      />
    </div>
  )

  return (
    <div className="container">
      <PageHeader title="Delivery address" sub="Where should we pick up and drop off?" onBack={goBack} />

      {addresses.length === 0 ? (
        <div className="cell span-4 empty">
          <div className="empty-icon"><Icon name="location" /></div>
          <h3>No saved addresses yet</h3>
          <p>Add your address manually, or use your current location to fill it automatically.</p>
        </div>
      ) : (
        <>
          <SectionLabel title="Saved addresses" />
          {addresses.map((a) => (
            <div
              key={a.id}
              className={`addr-card ${selectedAddressId === a.id ? 'on' : ''}`}
              onClick={() => setSelectedAddressId(a.id)}
            >
              <div className="addr-radio"><Icon name="check" style={{ width: 12, height: 12 }} /></div>
              <div style={{ flex: 1 }}>
                <span className="addr-label">{a.label}</span>
                <div className="addr-line">{a.line}</div>
                <div className="addr-phone">{a.phone}</div>
                {a.delivery_instructions && (
                  <div className="addr-instr">
                    <Icon name="chat" style={{ width: 13, height: 13 }} />
                    <span>{a.delivery_instructions}</span>
                  </div>
                )}
              </div>
              <div className="addr-actions">
                <button className="addr-action" aria-label={`Edit ${a.label}`} onClick={(e) => { e.stopPropagation(); openEdit(a) }}>
                  <Icon name="edit" style={{ width: 14, height: 14 }} /> Edit
                </button>
                <button className="addr-action del" aria-label={`Delete ${a.label}`} onClick={(e) => { e.stopPropagation(); setConfirmDel(a) }}>
                  <Icon name="trash" style={{ width: 14, height: 14 }} /> Delete
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {formOpen ? (
        <div className="summary-card">
          <div className="modal-title" style={{ marginBottom: 14 }}>
            {editing ? 'Edit address' : 'Add address'}
          </div>

          <button className="btn btn-ghost" onClick={useMyLocation} disabled={locState === 'loading'}>
            <Icon name="location" style={{ width: 16, height: 16 }} />
            {locState === 'loading' ? 'Getting your location…' : 'Use my current location'}
          </button>

          {form.latitude != null && form.longitude != null && (
            <>
              <div className="loc-head">
                <span className="loc-title">Selected location</span>
                {form.accuracy > 0 && (
                  <span className={`loc-acc ${accuracyLevel(form.accuracy)}`}>
                    GPS accuracy ±{Math.round(form.accuracy)} m
                  </span>
                )}
              </div>
              <LocationMap
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={onPinMoved}
              />
              <p className="note loc-note">Drag the pin to fine-tune the exact pickup / delivery point.</p>
            </>
          )}

          <div style={{ height: 14 }} />

          {addressField('label', 'Label', 'Home, Work, ...')}
          {addressField('house', 'House / Flat', 'Flat / house number, building')}
          {addressField('street', 'Street / Road', 'Street, road or lane')}
          {addressField('area', 'Area / Locality', 'Landmark, road or locality')}
          {addressField('city', 'City', 'City or town')}
          {addressField('state', 'State', 'State')}
          {addressField('pincode', 'PIN Code', '6-digit PIN code')}
          <div className="field">
            <label htmlFor="a-phone">Phone</label>
            <input
              id="a-phone"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="a-instr">Delivery instructions <span className="opt">(optional)</span></label>
            <textarea
              id="a-instr"
              placeholder="Call me when you arrive. Blue gate, second floor."
              value={form.delivery_instructions}
              onChange={(e) => setField('delivery_instructions', e.target.value)}
            />
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-ghost" onClick={closeForm}>Cancel</button>
            <button className="btn btn-ink" onClick={submit}>
              {editing ? 'Update address' : 'Save address'}
            </button>
          </div>
        </div>
      ) : (
        <div className="row" style={{ gap: 10, marginTop: 16 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={openAdd}>
            <Icon name="plus" style={{ width: 16, height: 16 }} /> Add address
          </button>
          <button
            className="btn btn-cobalt"
            style={{ flex: 1.2 }}
            onClick={useMyLocation}
            disabled={locState === 'loading'}
          >
            <Icon name="location" style={{ width: 16, height: 16 }} />
            {locState === 'loading' ? 'Locating…' : 'Use current location'}
          </button>
        </div>
      )}

      <div style={{ height: 16 }} />

      <button className="btn btn-ink" disabled={!selected && cartCount > 0} onClick={continueToCheckout}>
        Continue to checkout <Icon name="arrow" />
      </button>
      {cartCount === 0 ? (
        <p className="note">Your bag is empty — add items before checkout.</p>
      ) : !selected ? (
        <p className="note">Add and select an address to continue.</p>
      ) : null}

      <Modal
        open={!!confirmDel}
        title="Delete address?"
        text={confirmDel ? `Remove “${confirmDel.label} — ${confirmDel.line}”?` : ''}
        confirmLabel="Delete"
        onConfirm={doDelete}
        onClose={() => setConfirmDel(null)}
      />
    </div>
  )
}

export default Address
