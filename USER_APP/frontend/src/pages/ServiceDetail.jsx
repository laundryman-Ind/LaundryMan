import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { formatPrice } from '../data/mockData'
import Icon from '../components/Icon'
import Photo from '../components/Photo'
import PageHeader from '../components/PageHeader'
import Stepper from '../components/Stepper'
import PhotoAttach from '../components/PhotoAttach'

const ServiceDetail = ({ navigate, params, notify }) => {
  const { cart, setQty, itemPhotos, services } = useApp()
  const service = services.find((s) => s.id === params?.serviceId) || services[0]
  const items = service?.items || []

  const [localQty, setLocalQty] = useState({})
  useEffect(() => {
    const initial = {}
    items.forEach((it) => { initial[it.id] = cart[it.id] || 0 })
    setLocalQty(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service.id])

  const change = (id, qty) => {
    setLocalQty((prev) => ({ ...prev, [id]: Math.max(0, qty) }))
  }

  const count = Object.values(localQty).reduce((a, b) => a + b, 0)
  const total = items.reduce((sum, it) => sum + (localQty[it.id] || 0) * it.price, 0)

  const addToBag = () => {
    const changed = Object.entries(localQty).filter(([, q]) => q > 0)
    if (changed.length === 0) {
      notify('Pick at least one item first')
      return
    }
    changed.forEach(([id, q]) => setQty(id, q))
    notify(`Added ${count} ${count === 1 ? 'item' : 'items'} to bag`)
    navigate('cart', { from: 'service', serviceId: service.id })
  }

  return (
    <div className="container pad-bar">
      <PageHeader title="Select items" sub={service.name} onBack={() => navigate('services')} />

      <div className={`cell ${service.photo ? 'has-photo' : 'flat-ink'} span-4 svc-hero`}>
        {service.photo && <Photo src={service.photo} alt={service.name} tone={service.tone} />}
        <h2>{service.name}</h2>
        <small>{service.sub}</small>
      </div>

      <div className="detail-list">
        {items.map((it) => (
          <div key={it.id} className="detail-item">
            <div className="item-ico">
              {itemPhotos[it.id] ? <img src={itemPhotos[it.id]} alt={it.name} /> : <Icon name={it.icon} />}
            </div>
            <div className="item-info">
              <div className="item-name">{it.name}</div>
              <div className="item-price">{formatPrice(it.price)}{it.unit === 'kg' ? '/kg' : ' / piece'}</div>
            </div>
            <div className="item-actions">
              <PhotoAttach itemId={it.id} label={`Attach photo of ${it.name}`} notify={notify} />
              <Stepper qty={localQty[it.id] || 0} unit={it.unit} onChange={(q) => change(it.id, q)} />
            </div>
          </div>
        ))}
      </div>

      <div className="cta-bar">
        <div>
          <div className="cb-label">{count} {count === 1 ? 'item' : 'items'} selected</div>
          <div className="cb-total">{formatPrice(total)}</div>
        </div>
        <button className="bar-btn" onClick={addToBag}>
          Add to bag <Icon name="bag" style={{ width: 15, height: 15 }} />
        </button>
      </div>
    </div>
  )
}

export default ServiceDetail
