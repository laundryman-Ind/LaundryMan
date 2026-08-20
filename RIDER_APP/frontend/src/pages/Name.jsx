import React, { useState } from 'react'

const Name = ({ notify, onDone, onBack }) => {
  const [name, setName] = useState('')

  const handleSubmit = () => {
    if (!name.trim()) {
      notify('Enter your name')
      return
    }
    onDone(name.trim())
  }

  return (
    <div className="login">
      <div className="login-art" />

      <div className="login-card">
        <div className="lg-brand">
          <h1><span className="n">Laundry</span> <span className="m">Man</span></h1>
          <p>RIDER PORTAL</p>
        </div>

        <h2 className="lg-head">What's your name?</h2>

        <div className="name-field">
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
        </div>

        <button className="lg-continue" onClick={handleSubmit}>
          Get Started
        </button>

        <p className="otp-back">
          <a href="#back" onClick={(e) => { e.preventDefault(); onBack() }}>Use a different number</a>
        </p>
      </div>
    </div>
  )
}

export default Name
