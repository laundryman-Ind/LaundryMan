// Beta auth helper — creates real Supabase sessions without SMS.
//
// When VITE_BETA_AUTH=true, this module attempts to create a session via:
//   1. Anonymous sign-in (if enabled on the Supabase project)
//   2. Falls back to local-only mode if anonymous auth is disabled
//
// The app always works from localStorage (source of truth). Supabase sync
// is a bonus — when a session exists, data is pushed to the database so
// two phones can share data. When no session exists, the app still works
// perfectly from localStorage on a single device.

import { supabase, isSupabaseConfigured, isBetaAuth, toPhone } from './supabase'

let _sessionCreated = false

/**
 * Try to create a real Supabase session for beta testing.
 * Returns true if a session was created, false if falling back to local-only.
 */
export const createBetaSession = async (phoneNumber) => {
  if (!isSupabaseConfigured || !isBetaAuth || !supabase) return false
  if (_sessionCreated) return true

  const phone = toPhone(phoneNumber)

  // 1. Check if we already have a session
  const { data: existing } = await supabase.auth.getSession()
  if (existing?.session?.user) {
    _sessionCreated = true
    return true
  }

  // 2. Try anonymous sign-in
  const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously()

  if (!anonError && anonData?.user) {
    _sessionCreated = true
    // Store phone in metadata
    await supabase.auth.updateUser({
      data: { phone, phone_number: phone },
    }).catch(() => {})
    // Create profile row
    await supabase.from('profiles').upsert({
      id: anonData.user.id,
      phone,
      name: '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' }).catch(() => {})
    return true
  }

  // 3. Anonymous auth is disabled — fall back to local-only mode.
  // The app still works perfectly from localStorage. Supabase sync
  // will be available once anonymous auth is enabled or real OTP is set up.
  console.info('Beta auth: anonymous sign-in disabled. Running in local-only mode.')
  console.info('To enable two-phone sync, enable Anonymous sign-in in Supabase Dashboard → Authentication → Providers.')
  return false
}

/**
 * Update the beta user's profile name.
 */
export const setBetaProfileName = async (name) => {
  if (!isSupabaseConfigured || !isBetaAuth || !supabase) return

  const { data } = await supabase.auth.getUser()
  const user = data?.user
  if (!user) return

  await supabase.from('profiles').upsert({
    id: user.id,
    name,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' }).catch(() => {})
}

/**
 * Check if we have an active Supabase session.
 */
export const hasBetaSession = () => _sessionCreated
