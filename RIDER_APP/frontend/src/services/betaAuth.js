import { supabase, isSupabaseConfigured, isBetaAuth, toPhone } from './supabase'

let _sessionCreated = false

/**
 * Try to create a real Supabase session for beta testing.
 * Does NOT create a profile in the `profiles` table (that's the user app's table).
 * The rider profile is created separately in the rider app after OTP verification.
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
    // Store phone in metadata (for rider app use only)
    await supabase.auth.updateUser({
      data: { phone, phone_number: phone, role: 'rider' },
    }).catch(() => {})
    // NOTE: We do NOT create a row in `profiles` table here.
    // The rider profile is created in the rider app after name entry.
    return true
  }

  // 3. Anonymous auth is disabled — fall back to local-only mode.
  console.info('Beta auth: anonymous sign-in disabled. Running in local-only mode.')
  return false
}

/**
 * Update the rider profile name (in the `riders` table, NOT `profiles`).
 */
export const setRiderProfileName = async (name) => {
  if (!isSupabaseConfigured || !isBetaAuth || !supabase) return

  const { data } = await supabase.auth.getUser()
  const user = data?.user
  if (!user) return

  // Upsert into `riders` table with user_id linking to auth user
  await supabase.from('riders').upsert({
    user_id: user.id,
    name,
  }, { onConflict: 'user_id' }).catch(() => {})
}

/**
 * Check if we have an active Supabase session.
 */
export const hasBetaSession = () => _sessionCreated
