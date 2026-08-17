import React from 'react'
import { useScrollLock, useSwipeDismiss } from '../utils/popup'

const Modal = ({ open, title, text, confirmLabel = 'Confirm', danger, onConfirm, onClose }) => {
  // APK only: freeze the page behind the popup (overflow lock) and let a
  // downward swipe from anywhere — on the sheet or outside it — dismiss it.
  // The web app keeps its plain tap-outside / Cancel behavior.
  useScrollLock(open)
  const { sheetRef, handlers } = useSwipeDismiss(onClose)

  if (!open) return null

  return (
    <div className="modal-back" onClick={onClose} {...handlers}>
      <div
        ref={sheetRef}
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">{title}</div>
        {text && <div className="modal-text">{text}</div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-ink'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

export default Modal
