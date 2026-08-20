import React, { useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { readImageRaw } from '../services/image'
import { useActivityStats } from '../hooks/useActivityStats'
import { formatPhone } from '../services/phone'
import { toPhone } from '../services/supabase'
import Icon from '../components/Icon'
import Photo from '../components/Photo'
import PageHeader from '../components/PageHeader'
import SectionLabel from '../components/SectionLabel'
import Modal from '../components/Modal'
import ImageCrop from '../components/ImageCrop'
import { useScrollLock, useSwipeDismiss } from '../utils/popup'
import { upsertProfile, deleteAccount as deleteAccountApi, isBackendReady } from '../services/api'

const Profile = ({ navigate, notify }) => {
  const { user, payMethod, payMethods, updateUser, signout, orders } = useApp()
  const stats = useActivityStats()
  const [confirmOut, setConfirmOut] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [cropSrc, setCropSrc] = useState(null)
  const [form, setForm] = useState({ name: user.name, phone: formatPhone(user.phone), photo: user.photo || null })
  const cameraRef = useRef(null)
  const galleryRef = useRef(null)

  // APK only: lock the page behind the edit sheet + swipe down anywhere to close.
  useScrollLock(!!editOpen)
  const { sheetRef: editSheetRef, handlers: editSwipe } = useSwipeDismiss(() => setEditOpen(false))

  const signOut = () => {
    signout()
    setConfirmOut(false)
    notify('Signed out')
    navigate('home')
  }

  // Permanently delete the Supabase account (delete_own_account RPC, which
  // cascades to the profile row), then wipe local data and sign out. If the
  // DB call fails (e.g. the function isn't deployed yet) the app still signs
  // out locally and surfaces the reason.
  const handleDeleteAccount = async () => {
    setConfirmDelete(false)
    setEditOpen(false)
    let failed = null
    try {
      await deleteAccountApi()
    } catch (e) {
      failed = e.message
    }
    signout()
    localStorage.clear()
    if (failed) notify(failed)
    else notify('Account deleted')
    navigate('home')
  }

  const openEdit = () => {
    setForm({ name: user.name, phone: formatPhone(user.phone), photo: user.photo || null })
    setEditOpen(true)
  }

  // Pick an image, open the 1:1 crop first — the cropped square becomes the photo.
  const handlePhoto = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      setCropSrc(await readImageRaw(file))
    } catch {
      notify('Could not read that image')
    }
    setBusy(false)
    if (cameraRef.current) cameraRef.current.value = ''
    if (galleryRef.current) galleryRef.current.value = ''
  }

  const applyCrop = (dataUrl) => {
    setForm((f) => ({ ...f, photo: dataUrl }))
    setCropSrc(null)
    notify('Photo added')
  }

  const saveProfile = async () => {
    if (!form.name.trim()) return notify('Name is required')
    if (form.phone.replace(/\D/g, '').length < 10) return notify('Enter a valid 10-digit mobile number')
    updateUser({ name: form.name.trim(), phone: formatPhone(form.phone), photo: form.photo || null })
    setEditOpen(false)
    notify('Profile updated')
    // Persist to the database (best effort — errors surface as a toast).
    // The row stays keyed by auth.uid(); the phone column is saved as data.
    try {
      await upsertProfile({
        phone: toPhone(form.phone),
        name: form.name.trim(),
        photo: form.photo || null,
      })
    } catch (e) {
      notify(e.message)
    }
  }

  const menu = [
    { icon: 'bag', tone: 'blue', label: 'My orders', sub: 'Track & reorder', go: () => navigate('orders') },
    { icon: 'location', tone: 'mint', label: 'My addresses', sub: `${'Manage saved addresses'}`, go: () => navigate('address', { from: 'profile' }) },
    { icon: 'material-symbols:support-agent-rounded', tone: 'ink', label: 'Support', sub: 'Call, WhatsApp or email', go: () => navigate('support') },
  ]

  return (
    <div className="container">
      <PageHeader title="Profile" sub="Your Laundry Man account" />

      <div className="profile-head">
        <div className="profile-avatar">
          {user?.photo ? <img src={user.photo} alt={user.name || 'User'} /> : ((user?.name || 'U').charAt(0))}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="profile-name">{user.name}</div>
          <div className="profile-sub">{formatPhone(user.phone)}</div>
        </div>
        <button className="icon-btn" aria-label="Edit profile" onClick={openEdit}>
          <Icon name="edit" style={{ width: 19, height: 19 }} />
        </button>
      </div>

      <div className="bento">
        {stats.map((st) => (
          <div key={st.label} className={`cell ${st.flat ? 'flat-ink' : 'has-photo'} ${st.label === 'Avg. turnaround' ? 'span-4' : st.span || 'span-2'} stat-cell`}>
            {st.photo && <Photo src={st.photo} alt={st.label} tone={st.tone} />}
            <div className="stat-label">{st.label}</div>
            <div className="stat-number" style={{ fontSize: 38 }}>{st.value}</div>
            <div className="stat-delta">{st.delta}</div>
          </div>
        ))}
      </div>

      <SectionLabel title="Account" />
      <div className="menu-card">
        {menu.map((m, i) => (
          <div key={m.label} className="menu-row" onClick={m.go} style={i > 0 ? undefined : undefined}>
            <div className={`menu-icon ${m.tone}`}><Icon name={m.icon} /></div>
            <div>
              <strong>{m.label}</strong>
              <small>{m.sub}</small>
            </div>
            <Icon name="chevron" className="icon menu-arrow" style={{ transform: 'rotate(180deg)' }} />
          </div>
        ))}
      </div>

      <SectionLabel title="Payment methods" />
      <div className="menu-card">
        {payMethods.length === 0 ? (
          <div className="menu-row" onClick={() => navigate('payments')}>
            <div className="menu-icon blue"><Icon name="card" /></div>
            <div>
              <strong>No payment methods yet</strong>
              <small>Add a UPI ID, debit or credit card</small>
            </div>
            <Icon name="chevron" className="icon menu-arrow" style={{ transform: 'rotate(180deg)' }} />
          </div>
        ) : (
          payMethods.map((m) => (
            <div key={m.id} className="menu-row" onClick={() => navigate('payments')}>
              <div className={`menu-icon ${m.type === 'upi' ? 'blue' : m.type === 'credit' ? 'mint' : 'ink'}`}>
                <Icon name={m.icon || 'card'} />
              </div>
              <div>
                <strong>{m.label}</strong>
                <small>{m.detail}</small>
              </div>
              {payMethod === m.id ? (
                <span className="pill" style={{ marginLeft: 'auto' }}>Selected</span>
              ) : (
                <Icon name="chevron" className="icon menu-arrow" style={{ transform: 'rotate(180deg)' }} />
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ height: 20 }} />
      <button className="btn btn-ghost" onClick={() => setConfirmOut(true)}>
        <Icon name="power" style={{ width: 16, height: 16 }} /> Sign out
      </button>
      <p className="note">
        {isBackendReady
          ? 'Your profile is stored securely in the database.'
          : 'This is a static preview — your data never leaves this browser.'}
      </p>

      <Modal
        open={confirmOut}
        title="Sign out?"
        text="You'll stay signed out of this preview. Your cart will be cleared."
        confirmLabel="Sign out"
        onConfirm={signOut}
        onClose={() => setConfirmOut(false)}
      />



      {/* EDIT PROFILE SHEET */}
      {editOpen && (
        <div className="modal-back" onClick={() => setEditOpen(false)} {...editSwipe}>
          <div ref={editSheetRef} className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Edit profile</div>
            <div className="modal-text">Update your name, phone and profile photo.</div>

            <div className="edit-avatar">
              <div className="profile-avatar">
                {form.photo ? <img src={form.photo} alt="Profile preview" /> : ((form.name || 'U').charAt(0))}
              </div>
              <div className="photo-actions" style={{ width: '100%' }}>
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
                {form.photo && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => setForm((f) => ({ ...f, photo: null }))}
                  >
                    <Icon name="trash" style={{ width: 16, height: 16 }} /> Remove photo
                  </button>
                )}
              </div>
            </div>

            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => handlePhoto(e.target.files?.[0])}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => handlePhoto(e.target.files?.[0])}
            />

            <div className="field">
              <label htmlFor="p-name">Name</label>
              <input
                id="p-name"
                placeholder="Alex"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="p-phone">Phone</label>
              <input
                id="p-phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditOpen(false)}>Cancel</button>
              <button className="btn btn-ink" onClick={saveProfile}>Save changes</button>
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

      {/* DELETE ACCOUNT — deletes the Supabase auth account + profile row, then wipes this device */}
      <Modal
        open={confirmDelete}
        title="Delete account?"
        text="This permanently deletes your Laundry Man account from the database — including your auth account and profile. It can't be undone."
        confirmLabel="Delete account"
        danger
        onConfirm={handleDeleteAccount}
        onClose={() => setConfirmDelete(false)}
      />

      {/* 1:1 CROP SHEET — shown before a new photo is applied */}
      {cropSrc && (
        <ImageCrop src={cropSrc} onCancel={() => setCropSrc(null)} onCrop={applyCrop} />
      )}
    </div>
  )
}

export default Profile
