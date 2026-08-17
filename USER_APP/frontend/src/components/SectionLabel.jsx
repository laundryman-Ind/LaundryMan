import React from 'react'
import Icon from './Icon'

const SectionLabel = ({ title, actionLabel, onAction }) => (
  <div className="section-label">
    <h3>{title}</h3>
    {actionLabel && (
      <button onClick={onAction}>
        {actionLabel} <Icon name="arrow" style={{ width: 13, height: 13 }} />
      </button>
    )}
  </div>
)

export default SectionLabel
