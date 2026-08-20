import React from 'react'

const Modal = ({ open, title, text, confirmLabel = 'Confirm', danger, onConfirm, onClose }) => {
  if (!open) return null
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        {text && <div className="modal-text">{text}</div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className={`btn ${danger ? 'btn-ink' : 'btn-ink'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

export default Modal
