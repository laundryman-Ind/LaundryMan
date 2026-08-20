import React, { useRef, useState } from 'react'
import { formatPhoneLocal } from '../services/phone'
import { supabase, isSupabaseConfigured, isBetaAuth, toPhone } from '../services/supabase'

const Login = ({ notify, onSuccess }) => {
  const [num, setNum] = useState('')
  const [sending, setSending] = useState(false)
  const inputRef = useRef(null)

  const submit = async () => {
    if (num.replace(/\D/g, '').length !== 10) return notify('Enter a valid mobile number')

    // Beta mode: skip SMS, go straight to OTP screen (test numbers use fixed codes)
    if (isBetaAuth) return onSuccess(num)
    if (!isSupabaseConfigured) return onSuccess(num)

    // Real mode: send OTP via Supabase
    setSending(true)
    const { error } = await supabase.auth.signInWithOtp({
      phone: toPhone(num),
    })
    setSending(false)
    if (error) return notify(error.message)
    onSuccess(num)
  }

  return (
    <div className="login">
      <div className="login-art" />

      <div className="login-card">
        <div className="lg-brand">
          <h1><span className="n">Laundry</span> <span className="m">Man</span></h1>
          <p>RIDER PORTAL</p>
        </div>

        <h2 className="lg-head">Log in to<br />start delivering.</h2>

        <div className="lg-divider"><span>Log in or sign up</span></div>

        <div className="lg-phone">
          <div className="lg-chip">
            <span>+91</span>
          </div>
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            placeholder="Enter mobile number"
            value={num}
            disabled={sending}
            onChange={(e) => setNum(formatPhoneLocal(e.target.value))}
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          />
        </div>

        <button className="lg-continue" onClick={submit} disabled={sending}>
          {sending ? 'Sending code…' : 'Continue'}
        </button>

        <p className="lg-terms">
          By continuing, you agree to our <a href="#terms" onClick={(e) => { e.preventDefault(); notify('Terms of Service') }}>Terms of Service</a> &amp; <a href="#privacy" onClick={(e) => { e.preventDefault(); notify('Privacy Policy') }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}

export default Login
