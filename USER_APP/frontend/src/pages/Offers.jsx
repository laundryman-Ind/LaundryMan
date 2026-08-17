import React from 'react'
import { OFFERS } from '../data/mockData'
import Photo from '../components/Photo'
import PageHeader from '../components/PageHeader'
import { copyCode } from '../utils/clipboard'

const Offers = ({ notify }) => (
  <div className="container">
    <PageHeader title="Offers" sub="Codes you can use at checkout" />
    <div className="bento">
      {OFFERS.map((o) => (
        <div key={o.code} className="cell has-photo span-2 offer-cell">
          <Photo src={o.photo} alt={o.tag} tone={o.tone} />
          <small>{o.tag}</small>
          <h2>{o.title}</h2>
          <p>{o.desc}</p>
          <button className="offer-code" onClick={() => copyCode(o.code, notify)}>
            <span className="mono">{o.code}</span>
          </button>
        </div>
      ))}
    </div>
    <p className="note">Tap a code to copy it. One code per order — terms &amp; conditions apply.</p>
  </div>
)

export default Offers
