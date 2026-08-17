import React from 'react'
import Icon from './Icon'
import Photo from './Photo'

const ServiceCard = ({ service, onSelect }) => (
  <button
    className={`cell ${service.span} ${service.flat || ''} ${service.photo ? 'has-photo' : ''} service-cell`}
    onClick={onSelect}
  >
    {service.photo && <Photo src={service.photo} alt={service.name} tone={service.tone} />}
    <div className="service-icon"><Icon name={service.icon} /></div>
    <div>
      <strong>{service.name}</strong>
      <small>{service.sub}</small>
    </div>
  </button>
)

export default ServiceCard
