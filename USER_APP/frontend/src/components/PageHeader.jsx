import React from 'react'
import Icon from './Icon'

const PageHeader = ({ title, sub, onBack, right }) => (
  <div className="page-head">
    {onBack && (
      <button className="back-btn" aria-label="Go back" onClick={onBack}>
        <Icon name="chevron" />
      </button>
    )}
    <div className="page-head-text">
      <div className="page-title">{title}</div>
      {sub && <div className="page-sub">{sub}</div>}
    </div>
    {right}
  </div>
)

export default PageHeader
