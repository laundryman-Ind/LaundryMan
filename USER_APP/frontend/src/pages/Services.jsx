import React from 'react'
import { SERVICES } from '../data/mockData'
import PageHeader from '../components/PageHeader'
import ServiceCard from '../components/ServiceCard'

// Render the full catalog in Home's 3-column grid (bento-3): two flagship wide
// cards (Wash & Fold, Wash & Iron) each paired with a narrow card, then two
// full rows of three narrow cards — Blankets · Premium · Shoes and
// Curtains · Bags · Carpets — so the grid packs with no empty columns.
const SERVICES_ORDER = [
  'wash-fold', 'iron-only', 'wash-iron', 'dry-clean',
  'blankets', 'premium', 'shoes', 'curtains', 'bags', 'carpets',
]

const Services = ({ navigate }) => {
  // Everything renders narrow (span-1) except the two wide flagship cards.
  const ordered = SERVICES_ORDER
    .map((id) => SERVICES.find((s) => s.id === id))
    .filter(Boolean)
    .map((s) =>
      s.id === 'wash-fold' || s.id === 'wash-iron' ? s : { ...s, span: 'span-1' }
    )

  return (
    <div className="container">
      <PageHeader title="Services" sub="Pick a service to get started" />
      <div className="bento bento-3">
        {ordered.map((s) => (
          <ServiceCard key={s.id} service={s} onSelect={() => navigate('service', { serviceId: s.id })} />
        ))}
      </div>
      <p className="note">Prices are indicative. Final amount is confirmed before pickup.</p>
    </div>
  )
}

export default Services
