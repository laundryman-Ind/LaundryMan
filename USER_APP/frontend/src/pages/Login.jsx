import React, { useRef, useState } from 'react'
import Icon from '../components/Icon'
import { formatPhoneLocal } from '../services/phone'
import { supabase, isSupabaseConfigured, toPhone } from '../services/supabase'

const Login = ({ notify, onSuccess }) => {
  const [num, setNum] = useState('')
  const [sending, setSending] = useState(false)
  const inputRef = useRef(null)

  const submit = async () => {
    if (num.replace(/\D/g, '').length !== 10) return notify('Enter a valid mobile number')
    if (!isSupabaseConfigured) return onSuccess(num)

    setSending(true)
    const { error } = await supabase.auth.signInWithOtp({
      phone: toPhone(num),
      // Default channel is 'sms'. If your Supabase project has no SMS
      // provider linked, this returns an error we surface below.
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
          <p>One call, clean it all</p>
        </div>

        <h2 className="lg-head">Log in to<br />book your laundry.</h2>

        <div className="lg-divider"><span>Log in or sign up</span></div>

        <div className="lg-phone">
          <div className="lg-chip">
            <Icon name="phone" />
            <span>+91</span>
            <Icon name="chevron" />
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
