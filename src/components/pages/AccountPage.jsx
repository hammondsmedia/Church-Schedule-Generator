// src/components/pages/AccountPage.jsx
import React, { useState } from 'react';

export default function AccountPage({ user, memberData, onUpdate, onDelete, onBack, storage }) {
  const [form, setForm] = useState({
    firstName: memberData?.firstName || '',
    lastName:  memberData?.lastName  || '',
    phone:     memberData?.phone     || '',
    photoURL:  memberData?.photoURL  || '',
  });
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  const initials = `${form.firstName?.charAt(0) || ''}${form.lastName?.charAt(0) || ''}`.toUpperCase();

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !storage) return;
    setUploading(true);
    try {
      const ref = storage.ref(`profile_pics/${user.uid}`);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      const updated = { ...form, photoURL: url };
      setForm(updated);
      await onUpdate(updated);
    } catch (err) { alert('Upload failed.'); }
    setUploading(false);
  };

  const handleSave = async () => {
    await onUpdate(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Back button */}
      <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 20, gap: 6 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Dashboard
      </button>

      <div style={{ display: 'grid', gap: 20 }}>
        {/* Profile Card */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header band */}
          <div style={{ height: 80, background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)' }} />

          <div style={{ padding: '0 28px 28px', marginTop: -40 }}>
            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ position: 'relative' }}>
                {form.photoURL ? (
                  <img
                    src={form.photoURL}
                    style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--surface)', display: 'block' }}
                    alt="Profile"
                  />
                ) : (
                  <div className="avatar-circle" style={{ width: 80, height: 80, fontSize: 28, border: '4px solid var(--surface)' }}>
                    {initials || '?'}
                  </div>
                )}
                <label
                  htmlFor="photo-up"
                  style={{
                    position: 'absolute', bottom: 2, right: 2,
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'var(--text)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', border: '2px solid var(--surface)',
                    fontSize: 12,
                  }}
                >
                  {uploading ? '…' : '+' }
                </label>
                <input type="file" id="photo-up" style={{ display: 'none' }} onChange={handlePhotoUpload} accept="image/*" />
              </div>
            </div>

            {/* Name display */}
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text)' }}>
              {form.firstName || form.lastName ? `${form.firstName} ${form.lastName}` : 'Your Name'}
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-3)' }}>{user?.email}</p>

            {/* Form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="form-label">First Name</label>
                <input className="input-field" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="First name" />
              </div>
              <div>
                <label className="form-label">Last Name</label>
                <input className="input-field" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Last name" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Phone Number</label>
                <input className="input-field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(555) 555-5555" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20, alignItems: 'center' }}>
              <button className="btn-primary" onClick={handleSave}>
                Save Changes
              </button>
              {saved && (
                <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>✓ Saved!</span>
              )}
            </div>
          </div>
        </div>

        {/* Security section */}
        <div className="card" style={{ border: '1px solid var(--error-border)' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--error)', letterSpacing: '-0.02em' }}>
            Security &amp; Privacy
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-3)' }}>
            Permanently remove your account and all associated data.
          </p>
          <button className="btn-danger" onClick={onDelete}>
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
