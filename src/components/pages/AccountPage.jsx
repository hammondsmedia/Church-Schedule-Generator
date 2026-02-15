// src/components/pages/AccountPage.jsx
import React, { useState } from 'react';

export default function AccountPage({ user, memberData, onUpdate, onBack, storage }) {
  const [form, setForm] = useState({
    firstName: memberData.firstName || "",
    lastName: memberData.lastName || "",
    phone: memberData.phone || "",
    email: memberData.email || user.email,
    photoURL: memberData.photoURL || ""
  });
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const ref = storage.ref(`profile_pics/${user.uid}`);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      setForm({ ...form, photoURL: url });
      onUpdate({ ...form, photoURL: url });
    } catch (err) { alert("Error uploading image"); }
    setUploading(false);
  };

  const handleSave = async () => {
    await onUpdate(form);
    alert("Profile Updated!");
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <button className="btn-secondary" onClick={onBack} style={{ marginBottom: '24px' }}>← Back to Dashboard</button>
      
      <div className="card" style={{ display: 'flex', gap: '40px', padding: '40px' }}>
        {/* Left: Avatar Section */}
        <div style={{ textAlign: 'center', width: '200px' }}>
          <img 
            src={form.photoURL || `https://ui-avatars.com/api/?name=${form.firstName}+${form.lastName}&size=200`} 
            style={{ width: '180px', height: '180px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #f3f4f6', marginBottom: '16px' }} 
            alt="Profile"
          />
          <input type="file" id="photo-up" style={{ display: 'none' }} onChange={handlePhotoUpload} accept="image/*" />
          <label htmlFor="photo-up" style={{ color: '#1e3a5f', fontWeight: '700', cursor: 'pointer', display: 'block' }}>
            {uploading ? "Uploading..." : "☁️ Replace Photo"}
          </label>
        </div>

        {/* Right: Form Section */}
        <div style={{ flex: 1 }}>
          <h3 style={{ marginTop: 0, marginBottom: '24px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Basic Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '800', color: '#999' }}>FIRST NAME</label>
              <input className="input-field" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '800', color: '#999' }}>LAST NAME</label>
              <input className="input-field" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '12px', fontWeight: '800', color: '#999' }}>PHONE NUMBER</label>
              <input className="input-field" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '12px', fontWeight: '800', color: '#999' }}>EMAIL</label>
              <input className="input-field" value={form.email} disabled />
            </div>
          </div>
          <button className="btn-primary" style={{ marginTop: '30px', width: '100%' }} onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
