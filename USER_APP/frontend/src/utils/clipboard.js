// Copy a coupon code to the clipboard (where supported) and always show
// feedback — used by the Offers page and the Home offer cards.
export const copyCode = (code, notify) => {
  try {
    navigator.clipboard?.writeText(code)
  } catch {
    /* clipboard unavailable — still show feedback */
  }
  notify(`${code} copied`)
}
