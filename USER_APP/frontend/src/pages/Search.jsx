import React, { useState, useMemo, useRef, useEffect } from 'react'
import { SERVICES, ITEM_INDEX, formatPrice } from '../data/mockData'
import Icon from '../components/Icon'
import SectionLabel from '../components/SectionLabel'

const POPULAR = ['Wash & Iron', 'Dry Clean', 'Shoes', 'Blankets', 'Iron Only']

const Search = ({ navigate }) => {
  const [q, setQ] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const query = q.trim().toLowerCase()

  const serviceResults = useMemo(
    () =>
      query
        ? SERVICES.filter(
            (s) => s.name.toLowerCase().includes(query) || s.sub.toLowerCase().includes(query)
          )
        : [],
    [query]
  )

  const itemResults = useMemo(
    () => (query ? ITEM_INDEX.filter((it) => it.name.toLowerCase().includes(query)) : []),
    [query]
  )

  const openService = (id) => navigate('service', { serviceId: id })

  const submit = () => {
    if (serviceResults[0]) openService(serviceResults[0].id)
    else if (itemResults[0]) openService(itemResults[0].serviceId)
  }

  const resultRow = (key, icon, title, sub, onClick) => (
    <div key={key} className="menu-row" onClick={onClick}>
      <div className="menu-icon blue">
        <Icon name={icon} />
      </div>
      <div>
        <strong>{title}</strong>
        <small>{sub}</small>
      </div>
      <Icon name="chevron" className="icon menu-arrow" style={{ transform: 'rotate(180deg)' }} />
    </div>
  )

  return (
    <div className="container">
      <div className="search-head">
        <button className="back-btn" aria-label="Close search" onClick={() => navigate('home')}>
          <Icon name="chevron" />
        </button>
        <div className="search-box">
          <Icon name="search" style={{ width: 18, height: 18 }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Search services or items…"
            aria-label="Search services or items"
          />
          {q && (
            <button aria-label="Clear" onClick={() => setQ('')}>
              <Icon name="x" style={{ width: 15, height: 15 }} />
            </button>
          )}
        </div>
      </div>

      {!query ? (
        <>
          <SectionLabel title="Popular searches" />
          <div className="chip-row">
            {POPULAR.map((t) => (
              <button key={t} className="chip" onClick={() => setQ(t)}>
                {t}
              </button>
            ))}
          </div>

          <SectionLabel title="All services" />
          <div className="menu-card">
            {SERVICES.map((s) =>
              resultRow(
                s.id,
                s.icon,
                s.name,
                `${s.sub}${s.price ? ` · ${s.price}` : ''}`,
                () => openService(s.id)
              )
            )}
          </div>
        </>
      ) : serviceResults.length === 0 && itemResults.length === 0 ? (
        <div className="cell span-4 empty">
          <div className="empty-icon"><Icon name="search" /></div>
          <h3>No results for “{q.trim()}”</h3>
          <p>Try “wash”, “shoes”, “iron” or browse all services.</p>
        </div>
      ) : (
        <>
          {serviceResults.length > 0 && (
            <>
              <SectionLabel title={`Services · ${serviceResults.length}`} />
              <div className="menu-card">
                {serviceResults.map((s) =>
                  resultRow(
                    s.id,
                    s.icon,
                    s.name,
                    `${s.sub}${s.price ? ` · ${s.price}` : ''}`,
                    () => openService(s.id)
                  )
                )}
              </div>
            </>
          )}

          {itemResults.length > 0 && (
            <>
              <SectionLabel title={`Items · ${itemResults.length}`} />
              <div className="menu-card">
                {itemResults.map((it) => {
                  const svc = SERVICES.find((s) => s.id === it.serviceId)
                  return resultRow(
                    it.id,
                    it.icon,
                    it.name,
                    `${svc?.name} · ${formatPrice(it.price)}${it.unit === 'kg' ? '/kg' : '/piece'}`,
                    () => openService(it.serviceId)
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default Search
