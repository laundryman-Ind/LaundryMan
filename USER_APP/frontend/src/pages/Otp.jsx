import React, { useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured, toPhone } from '../services/supabase'

const Otp = ({ num, notify, onVerify, onBack }) => {
  const [digits, setDigits] = useState(Array(6).fill(''))
  const [count, setCount] = useState(30)
  const [busy, setBusy] = useState(false)
  const refs = useRef([])

  // Focus the first box on open + resend countdown
  useEffect(() => { refs.current[0]?.focus() }, [])
  useEffect(() => {
    if (count <= 0) return
    const t = setTimeout(() => setCount((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [count])

  // Real OTP verification via Supabase. Falls back to the old demo
  // behavior (any 6 digits pass) when Supabase isn't configured.
  const verify = async (code) => {
    if (code.length < 6) return notify('Enter the 6-digit code')
    if (!isSupabaseConfigured) return onVerify()

    setBusy(true)
    const { error } = await supabase.auth.verifyOtp({
      phone: toPhone(num),
      token: code,
      type: 'sms',
    })
    setBusy(false)
    if (error) return notify(error.message)
    onVerify()
  }

  const setDigit = (i, val) => {
    const clean = val.replace(/\D/g, '')
    let next
    if (clean.length > 1) {
      next = Array(6).fill('')
      clean.slice(0, 6).split('').forEach((c, j) => { next[j] = c })
      refs.current[Math.min(5, clean.length - 1)]?.focus()
    } else {
      next = [...digits]
      next[i] = clean
      if (clean && i < 5) refs.current[i + 1]?.focus()
    }
    setDigits(next)
    if (next.every((d) => d !== '')) verify(next.join(''))
  }

  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
  }

  const resend = async () => {
    if (count > 0) return notify(`Resend in ${count}s`)
    if (!isSupabaseConfigured) {
      setCount(30)
      setDigits(Array(6).fill(''))
      notify('Code resent')
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({ phone: toE164(num) })
    setBusy(false)
    if (error) return notify(error.message)
    setCount(30)
    setDigits(Array(6).fill(''))
    notify('Code resent')
  }

  return (
    <div className="login">
      <div className="login-art" />

      <div className="login-card">
        <div className="lg-brand">
          <h1><span className="n">Laundry</span> <span className="m">Man</span></h1>
          <p>One call, clean it all</p>
        </div>

        <h2 className="lg-head">Verify your number</h2>
        <p className="otp-sub">We've sent a 6-digit code to <strong>+91 {num}</strong></p>

        <div className="otp-boxes">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el }}
              className={`otp-box${d ? ' filled' : ''}`}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              disabled={busy}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKey(i, e)}
              onPaste={(e) => {
                e.preventDefault()
                const text = (e.clipboardData || window.clipboardData).getData('text')
                setDigit(0, text.replace(/\D/g, ''))
              }}
            />
          ))}
        </div>

        <p className="otp-resend">
          Didn't receive it?{' '}
          <a href="#resend" onClick={(e) => { e.preventDefault(); resend() }}>
            {count > 0 ? `Resend in ${count}s` : 'Resend OTP'}
          </a>
        </p>

        <button className="lg-continue" onClick={() => verify(digits.join(''))} disabled={busy}>
          {busy ? 'Verifying…' : 'Verify'}
        </button>

        <p className="otp-back">
          <a href="#change" onClick={(e) => { e.preventDefault(); onBack() }}>Use a different number</a>
        </p>
      </div>
    </div>
  )
}

export default Otp
