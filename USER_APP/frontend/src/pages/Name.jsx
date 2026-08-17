import React, { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon'

const Name = ({ notify, onDone, onBack }) => {
  const [name, setName] = useState('')
  const ref = useRef(null)

  useEffect(() => { ref.current?.focus() }, [])

  const submit = () => {
    if (!name.trim()) return notify('Enter your name')
    onDone(name.trim())
  }

  return (
    <div className="login">
      <div className="login-art" />

      <div className="login-card">
        <div className="lg-brand">
          <h1><span className="n">Laundry</span> <span className="m">Man</span></h1>
          <p>One call, clean it all</p>
        </div>

        <h2 className="lg-head">What's your name?</h2>
        <p className="otp-sub">We'll use this on your profile and orders.</p>

        <div className="lg-phone" style={{ marginTop: 24 }}>
          <div className="lg-chip">
            <Icon name="user" />
          </div>
          <input
            ref={ref}
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          />
        </div>

        <button className="lg-continue" onClick={submit}>Continue</button>

        <p className="otp-back">
          <a href="#change" onClick={(e) => { e.preventDefault(); onBack() }}>Change number</a>
        </p>
      </div>
    </div>
  )
}

export default Name
