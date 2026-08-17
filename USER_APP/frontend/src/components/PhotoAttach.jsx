import React, { useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { readImageFile } from '../services/image'
import { useScrollLock, useSwipeDismiss } from '../utils/popup'
import Icon from './Icon'

const PhotoAttach = ({ itemId, label, notify }) => {
  const { itemPhotos, setItemPhoto } = useApp()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const cameraRef = useRef(null)
  const galleryRef = useRef(null)

  // APK only: lock the page behind the popup + swipe down anywhere to close.
  useScrollLock(open)
  const { sheetRef, handlers } = useSwipeDismiss(() => setOpen(false))

  const photo = itemPhotos[itemId]

  const handleFile = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const dataUrl = await readImageFile(file)
      setItemPhoto(itemId, dataUrl)
      notify('Photo attached')
    } catch {
      notify('Could not read that image')
    }
    setBusy(false)
    setOpen(false)
    if (cameraRef.current) cameraRef.current.value = ''
    if (galleryRef.current) galleryRef.current.value = ''
  }

  return (
    <>
      <button
        className={`cam-btn ${photo ? 'has-photo' : ''}`}
        aria-label={label}
        onClick={() => setOpen(true)}
      >
        <Icon name={photo ? 'check' : 'camera'} />
      </button>

      {open && (
        <div
          className="modal-back"
          onClick={() => setOpen(false)}
          {...handlers}
        >
          <div ref={sheetRef} className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Attach a photo</div>
            <div className="modal-text">
              Add a picture of this item so we can verify its condition when we pick it up.
            </div>

            {photo && (
              <div className="photo-preview">
                <img src={photo} alt="Attached item" />
              </div>
            )}

            <div className="photo-actions">
              <button
                className="btn btn-ink"
                disabled={busy}
                onClick={() => cameraRef.current?.click()}
              >
                <Icon name="camera" style={{ width: 16, height: 16 }} /> Take photo
              </button>
              <button
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => galleryRef.current?.click()}
              >
                <Icon name="image" style={{ width: 16, height: 16 }} /> Choose from gallery
              </button>
              {photo && (
                <button
                  className="btn btn-ghost"
                  onClick={() => { setItemPhoto(itemId, null); setOpen(false); notify('Photo removed') }}
                >
                  <Icon name="trash" style={{ width: 16, height: 16 }} /> Remove photo
                </button>
              )}
            </div>

            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        </div>
      )}
    </>
  )
}

export default PhotoAttach
