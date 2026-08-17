import React from 'react'
import Icon from './Icon'

const Stepper = ({ qty, unit = 'pc', onChange }) => {
  const label = (n) => (unit === 'kg' ? `${n} kg` : n)
  return (
    <div className="stepper">
      <button
        className="minus"
        aria-label="Decrease"
        disabled={qty <= 0}
        onClick={() => onChange(Math.max(0, qty - 1))}
      >
        <Icon name="minus" style={{ width: 15, height: 15 }} />
      </button>
      <span className="qty">{label(qty)}</span>
      <button className="plus" aria-label="Increase" onClick={() => onChange(qty + 1)}>
        <Icon name="plus" style={{ width: 15, height: 15 }} />
      </button>
    </div>
  )
}

export default Stepper
