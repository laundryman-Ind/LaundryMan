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
