// src/components/pages/AccountPage.jsx
import React, { useState } from 'react';

export default function AccountPage({ user, memberData, onUpdate, onBack, storage }) {
  const [form, setForm] = useState({
    firstName: memberData.firstName || "",
    lastName: memberData.lastName || "",
    phone: memberData.phone || "",
    photoURL: memberData.photoURL || ""
  });
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !storage) return;
    setUploading(true);
    try {
      const ref = storage.ref(`profile_pics/${user.uid}`);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      const updatedForm = { ...form, photoURL: url };
      setForm(updatedForm);
      await onUpdate(updatedForm);
    } catch (err) { alert("Photo upload failed."); }
    setUploading(false);
  };

  const handleSave = async () => {
    await onUpdate(form);
    alert("Profile saved!");
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <button className="btn-secondary" onClick={onBack} style={{ marginBottom: '24px' }}>← Back to Dashboard</button>
      <div className="card" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '40px', padding: '40px' }}>
        <div style={{ textAlign: 'center', borderRight: '1px solid #eee', paddingRight: '40px' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={form.photoURL || `https://ui-avatars.com/api/?name=${form.firstName}+${form.lastName}&size=200`} style={{ width: '180px', height: '180px', borderRadius: '50%', objectFit: 'cover', border: '5px solid #f3f4f6' }} alt="Profile" />
            <label htmlFor="photo-up" style={{ position: 'absolute', bottom: '10px', right: '10px', background: '#1e3a5f', color: 'white', width: '35px', height: '35px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #fff' }}>📷</label>
          </div>
          <input type="file" id="photo-up" style={{ display: 'none' }} onChange={handlePhotoUpload} accept="image/*" />
          <h3 style={{ margin: '15px 0 5px 0' }}>{form.firstName} {form.lastName}</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>{user.email}</p>
        </div>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: '24px' }}>Basic Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div><label style={{ fontSize: '11px', fontWeight: '800', color: '#999' }}>FIRST NAME</label><input className="input-field" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} /></div>
            <div><label style={{ fontSize: '11px', fontWeight: '800', color: '#999' }}>LAST NAME</label><input className="input-field" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} /></div>
            <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '11px', fontWeight: '800', color: '#999' }}>PHONE</label><input className="input-field" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          </div>
          <button className="btn-primary" style={{ marginTop: '30px', width: '100%' }} onClick={handleSave}>Save Profile</button>
        </div>
      </div>
    </div>
  );
}
