import React from 'react'

const Photo = ({ src, alt, tone = 'var(--ink)' }) => (
  <>
    <img className="cell-photo" src={src} alt={alt} loading="lazy" />
    <div className="cell-tone" style={{ '--tone': tone }} />
    <div className="cell-shade" />
  </>
)

export default Photo
