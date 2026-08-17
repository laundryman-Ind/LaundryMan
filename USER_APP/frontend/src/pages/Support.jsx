import React, { useState } from 'react'
import { SUPPORT, FAQS } from '../data/mockData'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import SectionLabel from '../components/SectionLabel'

const Support = ({ navigate }) => {
  const [open, setOpen] = useState(0)

  const channels = [
    { c: 'c-call', icon: 'phone', label: 'Call', sub: SUPPORT.phone, href: SUPPORT.phoneHref },
    { c: 'c-wa', icon: 'ic:baseline-whatsapp', label: 'WhatsApp', sub: SUPPORT.whatsapp, href: SUPPORT.whatsappHref },
    { c: 'c-mail', icon: 'mail', label: 'Email', sub: SUPPORT.email, href: SUPPORT.emailHref },
  ]

  return (
    <div className="container">
      <PageHeader title="Support" sub={SUPPORT.hours} onBack={() => navigate('profile')} />

      <div className="channel-grid">
        {channels.map((ch) => (
          <a key={ch.label} className={`channel ${ch.c}`} href={ch.href}>
            <Icon name={ch.icon} />
            <span>{ch.label}</span>
          </a>
        ))}
      </div>
      <p className="note">{SUPPORT.phone} · Mon–Sat, 9 AM – 9 PM</p>

      <SectionLabel title="FAQs" />
      <div className="faq-list">
        {FAQS.map((f, i) => (
          <div key={i} className={`faq-item ${open === i ? 'open' : ''}`} onClick={() => setOpen(open === i ? -1 : i)}>
            <div className="faq-q">
              <span>{f.q}</span>
              <Icon name={open === i ? 'minus' : 'plus'} style={{ width: 16, height: 16, color: 'var(--cobalt)' }} />
            </div>
            {open === i && <div className="faq-a">{f.a}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Support
