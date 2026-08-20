import React, { useState } from 'react'
import { useRider } from '../context/RiderContext'
import { upsertRiderProfile, deleteRiderAccount } from '../services/api'
import Icon from '../components/Icon'
import Modal from '../components/Modal'

const Profile = ({ notify }) => {
  const { rider, logout, online, toggleOnline, ensureSession } = useRider()
  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState(rider?.name || '')
  const [saving, setSaving] = useState(false)
  const [confirmOut, setConfirmOut] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const openEdit = () => {
    setName(rider?.name || '')
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) return notify('Name is required')
    setSaving(true)
    try {
      await ensureSession()
      await upsertRiderProfile({ name: name.trim() })
      // Update localStorage so the UI reflects the change
      const updated = { ...rider, name: name.trim() }
      localStorage.setItem('rm_rider', JSON.stringify(updated))
      notify('Profile updated')
      setEditOpen(false)
      window.location.reload()
    } catch (e) {
      notify(e.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    setConfirmOut(true)
  }

  const confirmSignOut = async () => {
    setConfirmOut(false)
    await logout()
  }

  const handleDeleteAccount = async () => {
    setConfirmDelete(false)
    setEditOpen(false)
    try {
      await ensureSession()
      await deleteRiderAccount()
      notify('Rider account deleted')
    } catch (e) {
      notify(e.message || 'Deletion failed')
    }
    await logout()
  }

  const initials = (rider?.name || 'R').slice(0, 1).toUpperCase()

  return (
    <div className="container">
      {/* Profile header — matches user app pattern */}
      <div className="profile-head">
        <div className="profile-avatar">{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="profile-name">{rider?.name || 'Rider'}</div>
          <div className="profile-sub">{rider?.phone || ''}</div>
        </div>
        <button className="icon-btn" aria-label="Edit profile" onClick={openEdit}>
          <Icon name="edit" style={{ width: 19, height: 19 }} />
        </button>
      </div>

      {/* Status pill */}
      <div style={{ marginBottom: '20px' }}>
        <span className={`pill ${online ? '' : 'ink'}`}>{online ? 'Online' : 'Offline'}</span>
      </div>

      {/* Menu card */}
      <div className="section-label"><h3>Settings</h3></div>
      <div className="menu-card">
        <div className="menu-row" onClick={toggleOnline}>
          <div className="menu-icon" style={{ background: online ? 'rgba(192,57,43,.1)' : 'rgba(31,122,80,.1)', color: online ? '#C0392B' : '#1F7A50' }}><Icon name="power" style={{ width: '20px', height: '20px' }} /></div>
          <div>
            <strong>{online ? 'Go Offline' : 'Go Online'}</strong>
            <small>{online ? 'Stop receiving orders' : 'Start receiving orders'}</small>
          </div>
          <Icon name="chevron" className="icon menu-arrow" style={{ transform: 'rotate(180deg)' }} />
        </div>
        <div className="menu-row" onClick={handleLogout}>
          <div className="menu-icon ink"><Icon name="lock" style={{ width: '20px', height: '20px' }} /></div>
          <div>
            <strong>Sign out</strong>
            <small>Sign out of your account</small>
          </div>
          <Icon name="chevron" className="icon menu-arrow" style={{ transform: 'rotate(180deg)' }} />
        </div>
      </div>

      <p className="note">Your profile is synced with the database.</p>

      <Modal
        open={confirmOut}
        title="Sign out?"
        text="You'll be signed out of your account."
        confirmLabel="Sign out"
        onConfirm={confirmSignOut}
        onClose={() => setConfirmOut(false)}
      />

      <Modal
        open={confirmDelete}
        title="Delete rider account?"
        text="This permanently deletes your Rider profile. It can't be undone."
        confirmLabel="Delete account"
        danger
        onConfirm={handleDeleteAccount}
        onClose={() => setConfirmDelete(false)}
      />

      {/* EDIT PROFILE SHEET — matches user app modal pattern */}
      {editOpen && (
        <div className="modal-back" onClick={() => setEditOpen(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Edit profile</div>
            <div className="modal-text">Update your name and profile details.</div>

            <div className="edit-avatar">
              <div className="profile-avatar">{initials}</div>
            </div>

            <div className="field">
              <label htmlFor="r-name">Name</label>
              <input
                id="r-name"
                placeholder="Rider name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>

            <div className="field">
              <label>Phone</label>
              <input
                type="tel"
                value={rider?.phone || ''}
                disabled
                style={{ opacity: 0.6 }}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditOpen(false)}>Cancel</button>
              <button className="btn btn-ink" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>

            <button
              className="btn btn-danger"
              style={{ marginTop: 12, width: '100%' }}
              onClick={() => setConfirmDelete(true)}
            >
              <Icon name="trash" style={{ width: 16, height: 16 }} /> Delete account
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile
