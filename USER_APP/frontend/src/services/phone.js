// Format an Indian mobile number as "+91 XXXXX XXXXX".
// The field always displays "+91 ...", so any raw value that starts with "+91"
// carries our own prefix — that leading 91 is always stripped, never part of
// the number. A bare "91…" without the plus (or a trunk "0") is only treated
// as a country/dial code when it's clearly too long for a 10-digit number.
export const formatPhone = (raw) => {
  const s = (raw || '').trim()
  let body = s.replace(/\D/g, '')
  if (s.startsWith('+91')) body = body.slice(2)
  else if (body.startsWith('91') && body.length > 10) body = body.slice(2)
  else if (body.startsWith('0')) body = body.slice(1)
  body = body.slice(0, 10)
  if (!body) return ''
  const part = body.length > 5 ? `${body.slice(0, 5)} ${body.slice(5)}` : body
  return `+91 ${part}`
}

// Same formatting without the country code: "XXXXX XXXXX".
// The login input has a fixed "+91" chip on the left, so the field itself
// only carries the 10-digit number.
export const formatPhoneLocal = (raw) => {
  const s = (raw || '').trim()
  let body = s.replace(/\D/g, '')
  if (s.startsWith('+91')) body = body.slice(2)
  else if (body.startsWith('91') && body.length > 10) body = body.slice(2)
  else if (body.startsWith('0')) body = body.slice(1)
  body = body.slice(0, 10)
  if (!body) return ''
  return body.length > 5 ? `${body.slice(0, 5)} ${body.slice(5)}` : body
}
