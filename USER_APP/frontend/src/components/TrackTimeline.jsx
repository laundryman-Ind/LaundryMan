import React from 'react'
import Icon from './Icon'
import { TRACK_STEPS, TRACK_ACTIVE, TRACK_FILL } from '../data/mockData'

const TrackTimeline = ({ statusKey }) => {
  const active = TRACK_ACTIVE[statusKey] ?? 0
  const fill = TRACK_FILL[statusKey] ?? 0

  return (
    <div className="track">
      <div className="track-line">
        <div className="track-line-fill" style={{ width: `${fill}%` }} />
      </div>
      {TRACK_STEPS.map((step, i) => (
        <div key={step.key} className={`track-step ${i < active ? 'active' : ''}`}>
          <div className="track-dot"><Icon name={step.icon} style={{ width: 15, height: 15 }} /></div>
          <p>{step.label}</p>
        </div>
      ))}
    </div>
  )
}

export default TrackTimeline
