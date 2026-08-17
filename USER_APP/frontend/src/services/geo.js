// Location services for Laundry Man.
//
// The EXACT location is always the device GPS fix: latitude / longitude /
// accuracy. The reverse-geocoded address is only a readable, editable LABEL
// built from structured fields (house, street, area, city, state, pincode) —
// it is never used as the actual pickup/delivery point.
// Uses the browser Geolocation API + OpenStreetMap (Nominatim) reverse
// geocoding, falling back to plain coordinates when geocoding is unavailable.

const GEOCODE_URL = 'https://nominatim.openstreetmap.org/reverse'

// A single getCurrentPosition often returns a coarse first fix (network /
// cached position — sometimes tens of kilometres off). Instead, watch the
// position and keep the MOST ACCURATE fix we receive, resolving early once
// it's good enough or once the fix stops improving. The reported accuracy is
// the GPS horizontal error in metres.
const ACCURACY_GOOD_M = 25 // stop early once this precise
const MAX_WAIT_MS = 15000 // hard deadline — never leave the user hanging
const STALL_MS = 3500 // settle if the fix stops improving

export const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('unsupported'))
      return
    }

    let best = null // { latitude, longitude, accuracy }
    let lastImprovement = Date.now()
    let watcherId = null
    let settled = false

    const accuracyOf = (fix) =>
      fix.accuracy == null ? Infinity : Math.abs(fix.accuracy)

    const finish = (fix) => {
      if (settled) return
      settled = true
      if (watcherId !== null) navigator.geolocation.clearWatch(watcherId)
      clearInterval(settleTimer)
      clearTimeout(deadlineTimer)
      resolve(fix)
    }

    // If the fix is still improving, keep waiting; once it stalls, settle.
    const settleTimer = setInterval(() => {
      if (best && Date.now() - lastImprovement >= STALL_MS) finish(best)
    }, 500)

    const deadlineTimer = setTimeout(() => {
      if (best) finish(best)
      else {
        clearInterval(settleTimer)
        reject(new Error('timeout'))
      }
    }, MAX_WAIT_MS)

    watcherId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        const fix = {
          latitude,
          longitude,
          accuracy: Number.isFinite(accuracy) ? accuracy : null,
        }
        if (!best || accuracyOf(fix) < accuracyOf(best)) {
          best = fix
          lastImprovement = Date.now()
        }
        if (accuracyOf(best) <= ACCURACY_GOOD_M) finish(best)
      },
      (err) => {
        // Keep any fix we already have; otherwise surface the error.
        if (best) finish(best)
        else {
          clearInterval(settleTimer)
          clearTimeout(deadlineTimer)
          reject(err)
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: MAX_WAIT_MS }
    )
  })

const coordsLine = (latitude, longitude) =>
  `Current location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`

// Reverse-geocode coordinates into structured address fields plus a readable
// label. AREA/LOCALITY prefers a nearby landmark or road name over the
// administrative suburb — what's visible on the ground describes a pickup
// point better. Locality and PIN are completing fields, never the location.
const joinLine = (parts) => {
  const clean = parts.map((s) => s.trim()).filter(Boolean)
  // Dedupe consecutive repeats so a road used as both street and area
  // (no landmark nearby) doesn't print twice.
  return clean.filter((p, i) => i === 0 || p !== clean[i - 1]).join(', ')
}

// Nominatim reports the street under different keys depending on the OSM
// highway type — check them all so "Mother Teresa Sarani" always lands in
// STREET / ROAD.
const STREET_KEYS = [
  'road',
  'living_street',
  'pedestrian',
  'footway',
  'cycleway',
  'service',
  'residential',
  'path',
  'highway',
  'street',
]

const emptyAddress = (latitude, longitude) => ({
  formatted_address: coordsLine(latitude, longitude),
  house: '',
  street: '',
  area: '',
  city: '',
  state: '',
  pincode: '',
})

export const reverseGeocode = async (latitude, longitude, _attempt = 0) => {
  try {
    const res = await fetch(
      `${GEOCODE_URL}?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=en`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) throw new Error(`geocode failed (${res.status})`)
    const data = await res.json()
    const a = data.address || {}

    const house = [a.house_number, a.building].filter(Boolean).join(' ')
    const street = STREET_KEYS.map((k) => a[k]).find(Boolean) || ''
    // Named landmark (tourism / attraction / historic / amenity), falling back
    // to the road name, then to the neighbourhood / suburb.
    const landmark = a.tourism || a.attraction || a.historic || a.amenity || ''
    const area = landmark || street || a.neighbourhood || a.suburb || a.hamlet || a.quarter || ''
    const city = a.city || a.town || a.village || a.municipality || a.county || a.city_district || ''
    const state = a.state || ''
    const pincode = a.postcode || ''

    return {
      formatted_address: joinLine([house, street, area, city, state, pincode]),
      house,
      street,
      area,
      city,
      state,
      pincode,
    }
  } catch (err) {
    // Nominatim rate-limits aggressively (1 req/s) and can return HTML errors —
    // retry once with a delay before giving up, so a transient failure doesn't
    // leave the address fields blank.
    if (_attempt < 1) {
      await new Promise((r) => setTimeout(r, 900))
      return reverseGeocode(latitude, longitude, _attempt + 1)
    }
    return emptyAddress(latitude, longitude)
  }
}

// Capture the exact GPS location plus the structured reverse-geocoded address.
// Resolves with { latitude, longitude, accuracy, formatted_address, house,
// street, area, city, state, pincode }.
export const getCurrentLocation = async () => {
  const { latitude, longitude, accuracy } = await getCurrentPosition()
  const addr = await reverseGeocode(latitude, longitude)
  return { latitude, longitude, accuracy, ...addr }
}

// Backwards-compatible wrapper — same shape as the original service.
export const getCurrentAddress = async () => {
  const { latitude, longitude, accuracy, formatted_address } = await getCurrentLocation()
  return { line: formatted_address, coords: { latitude, longitude, accuracy } }
}
