// Supabase client — phone (OTP) authentication.
//
// Config comes from Vite env vars (see .env.example):
//   VITE_SUPABASE_URL=      https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY= eyJ...
//
// When the vars are missing the app falls back to the old demo flow
// (any 6-digit code passes) so the prototype still runs in preview /
// APK without a Supabase project. Add the keys to .env and restart the
// dev server to switch on real OTP verification.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

// Normalize a phone input to the bare 10-digit form Supabase expects for
// this project (e.g. "9749117663"). GoTrue normalizes to E.164 internally,
// and the project's test phone numbers are registered without the +91
// prefix, so sending the bare number is what matches them.
// Accepts the formatted "XXXXX XXXXX" / "+91 XXXXX XXXXX" strings the
// login screens produce, or any raw digits.
export const toPhone = (raw) => {
  let digits = (raw || '').replace(/\D/g, '')
  if (digits.startsWith('91') && digits.length > 10) digits = digits.slice(2)
  return digits
}
