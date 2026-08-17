import React, { useEffect, useRef, useState } from 'react'
import { useScrollLock, useSwipeDismiss } from '../utils/popup'

// Square (1:1) crop modal. Drag to reposition, slider/wheel to zoom,
// then Apply exports the visible square at `size` px as a JPEG data URL.
const ImageCrop = ({ src, onCancel, onCrop, size = 512 }) => {
  const boxRef = useRef(null)

  // Lock the page behind the crop (web AND APK) so scrolling can't bleed
  // through while repositioning/zooming, and swipe down anywhere to close.
  // The crop box keeps its own drag/zoom gestures (useSwipeDismiss ignores
  // touches that start inside it).
  useScrollLock(true, { force: true })
  const { sheetRef: cardRef, handlers } = useSwipeDismiss(onCancel, { dismissTransform: 'translateY(120vh)' })
  const [img, setImg] = useState(null)
  const [box, setBox] = useState({ w: 280, h: 280 })
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [drag, setDrag] = useState(null)

  // Load the source image, then fit it to cover the square (base zoom, centered).
  useEffect(() => {
    const el = new Image()
    el.onload = () => {
      const rect = boxRef.current?.getBoundingClientRect()
      const w = rect?.width || 280
      const h = rect?.height || 280
      const base = Math.max(w / el.width, h / el.height)
      setImg(el)
      setBox({ w, h })
      setZoom(base)
      setPos({ x: (w - el.width * base) / 2, y: (h - el.height * base) / 2 })
    }
    el.src = src
  }, [src])

  const minZoom = img ? Math.max(box.w / img.width, box.h / img.height) : 1

  const clampPos = (p, z = zoom) => {
    if (!img) return p
    const mw = box.w - img.width * z
    const mh = box.h - img.height * z
    return { x: Math.min(0, Math.max(mw, p.x)), y: Math.min(0, Math.max(mh, p.y)) }
  }

  const changeZoom = (z) => {
    if (!img) return
    const nz = Math.max(minZoom, z)
    setZoom(nz)
    setPos((p) => clampPos(p, nz))
  }

  // Active pointers (id → {x, y}) plus the pinch anchor, so two fingers can
  // zoom the crop the way the mouse wheel does on desktop.
  const pointersRef = useRef(new Map())
  const pinchRef = useRef(null)

  const onPointerDown = (e) => {
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* pointer capture unavailable (e.g. synthetic events) — drag still works inside the box */
    }
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 2) {
      // Second finger down → pinch-to-zoom: remember the start distance & zoom.
      const [a, b] = [...pointersRef.current.values()]
      pinchRef.current = { dist: Math.hypot(b.x - a.x, b.y - a.y), zoom }
      setDrag(null)
    } else if (pointersRef.current.size === 1) {
      setDrag({ id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y })
    }
  }

  const onPointerMove = (e) => {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    // Pinch: scale the start zoom by the current finger-distance ratio.
    if (pointersRef.current.size === 2) {
      const pin = pinchRef.current
      if (!pin) return
      const [a, b] = [...pointersRef.current.values()]
      const dist = Math.hypot(b.x - a.x, b.y - a.y)
      changeZoom(pin.zoom * (dist / pin.dist))
      return
    }

    if (drag && drag.id === e.pointerId) {
      setPos(clampPos({ x: drag.ox + (e.clientX - drag.sx), y: drag.oy + (e.clientY - drag.sy) }))
    }
  }

  const onPointerUp = (e) => {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (drag && drag.id === e.pointerId) setDrag(null)
  }

  // Native non-passive wheel listener: React attaches wheel passively (so its
  // preventDefault is ignored and the page can scroll behind the crop). This
  // runs after every render so `zoom`/`img` are always current.
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const handler = (e) => {
      e.preventDefault()
      changeZoom(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  })

  const apply = () => {
    if (!img) return
    const vw = box.w / zoom // visible square in source pixels
    const px = -pos.x / zoom
    const py = -pos.y / zoom
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    canvas.getContext('2d').drawImage(img, px, py, vw, vw, 0, 0, size, size)
    onCrop(canvas.toDataURL('image/jpeg', 0.85))
  }

  return (
    <div
      className="crop-back"
      onClick={onCancel}
      {...handlers}
    >
      <div ref={cardRef} className="crop-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Crop photo</div>
        <div className="modal-text">Drag to reposition, zoom to frame your picture — the crop is square (1:1).</div>

        <div
          ref={boxRef}
          className="crop-box"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {img && (
            <img
              className="crop-img"
              src={src}
              alt="Crop preview"
              draggable="false"
              style={{ width: img.width * zoom, height: img.height * zoom, transform: `translate(${pos.x}px, ${pos.y}px)` }}
            />
          )}
          <div className="crop-grid" />
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-ink" onClick={apply}>Apply crop</button>
        </div>
      </div>
    </div>
  )
}

export default ImageCrop
