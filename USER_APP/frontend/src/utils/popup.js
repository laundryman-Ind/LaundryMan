import { useEffect, useRef } from 'react'
import { isNativeApp } from './env'

// APK-only helpers for popups/modals:
//   • lockBackgroundScroll — freezes the page behind an open popup so the
//     background can never scroll while the popup is up (counter-based, so
//     nested popups restore the page only when the last one closes).
//   • useScrollLock — effect wrapper gated on the native (Capacitor) runtime;
//     the web app keeps its exact current behavior.
//   • useSwipeDismiss — swipe down from ANYWHERE on the screen to dismiss a
//     popup (APK only). The popup follows the finger at ~55% damping; a drag
//     past 100px or a quick downward flick slides it off, anything shorter
//     springs it back.

let lockCount = 0
let savedOverflow = null
let popupCount = 0

// Track popup state separately from scroll locking. The navigation bar and
// sticky chrome use this document-level marker so they are always treated as
// inactive background, including in browsers where the scroll lock itself is
// intentionally disabled.
function setPopupState(open) {
  if (typeof document === 'undefined') return
  if (open) {
    popupCount += 1
    document.documentElement.classList.add('popup-open')
    return
  }

  popupCount = Math.max(0, popupCount - 1)
  if (popupCount === 0) document.documentElement.classList.remove('popup-open')
}

export function lockBackgroundScroll(lock) {
  if (typeof document === 'undefined') return
  if (lock) {
    if (lockCount === 0) {
      savedOverflow = document.documentElement.style.overflow
      // Only lock the root element. Setting overflow:hidden on <body> too
      // breaks position:sticky in Chromium: while the page is scrolled, the
      // sticky page headers lose their viewport anchoring and jump off the
      // top of the screen (APK-only, since this lock only runs on native).
      document.documentElement.style.overflow = 'hidden'
    }
    lockCount += 1
  } else if (lockCount > 0) {
    lockCount -= 1
    if (lockCount === 0 && savedOverflow !== null) {
      document.documentElement.style.overflow = savedOverflow
      savedOverflow = null
    }
  }
}

export function useScrollLock(open, { force = false } = {}) {
  const native = isNativeApp()
  useEffect(() => {
    if (!open) return

    // Every popup marks the app as modal, regardless of runtime. This keeps
    // the fixed bottom navigation dimmed and non-interactive everywhere.
    setPopupState(true)

    const shouldLockScroll = native || force
    if (shouldLockScroll) lockBackgroundScroll(true)

    return () => {
      if (shouldLockScroll) lockBackgroundScroll(false)
      setPopupState(false)
    }
  }, [native, open, force])
}

const DISMISS_DISTANCE = 100
const DISMISS_VELOCITY = 0.6
const MIN_FLICK_DISTANCE = 30

// `dismissTransform` is applied to the sheet when it slides away — for
// bottom-anchored sheets `translateY(110%)` (relative to the sheet's own
// height) clears the screen; centered popups (e.g. the crop card) need a
// viewport-relative value.
export function useSwipeDismiss(onClose, { dismissTransform = 'translateY(110%)' } = {}) {
  const sheetRef = useRef(null)
  const drag = useRef(null)
  const native = isNativeApp()

  const start = (e) => {
    if (!native || !e.touches || e.touches.length === 0) return
    // Interactive drag targets handle their own gestures (crop reposition) —
    // don't hijack them.
    const t = e.target
    if (t && t.closest && t.closest('.crop-box')) return
    drag.current = {
      startY: e.touches[0].clientY,
      lastY: e.touches[0].clientY,
      lastT: Date.now(),
      velocity: 0,
    }
  }

  const move = (e) => {
    const d = drag.current
    if (!d || !e.touches || e.touches.length === 0) return
    const now = Date.now()
    const y = e.touches[0].clientY
    const dy = y - d.startY
    if (dy > 0) {
      d.velocity = (y - d.lastY) / Math.max(1, now - d.lastT)
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${Math.round(dy * 0.55)}px)`
      }
    }
    d.lastY = y
    d.lastT = now
  }

  const end = () => {
    const d = drag.current
    drag.current = null
    const sheet = sheetRef.current
    if (!d || !sheet) return
    const dy = d.lastY - d.startY
    if (dy >= DISMISS_DISTANCE || (d.velocity > DISMISS_VELOCITY && dy >= MIN_FLICK_DISTANCE)) {
      sheet.style.transition = 'transform .2s ease'
      sheet.style.transform = dismissTransform
      setTimeout(onClose, 190)
    } else {
      sheet.style.transition = 'transform .3s cubic-bezier(.2,.7,.3,1)'
      sheet.style.transform = 'translateY(0)'
      setTimeout(() => { sheet.style.transition = '' }, 320)
    }
  }

  return { sheetRef, handlers: { onTouchStart: start, onTouchMove: move, onTouchEnd: end, onTouchCancel: end } }
}
