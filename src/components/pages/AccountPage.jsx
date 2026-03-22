// src/components/pages/AccountPage.jsx
import React, { useState, useEffect } from 'react';

export default function AccountPage({ user, memberData, onUpdate, onDelete, onBack, storage }) {
  // Use useEffect to update local state if memberData changes
  const [form, setForm] = useState({
    firstName: memberData?.firstName || "",
    lastName: memberData?.lastName || "",
    phone: memberData?.phone || "",
    photoURL: memberData?.photoURL || ""
  });
  const [uploading, setUploading] = useState(false);

  const initials = `${form.firstName?.charAt(0) || ''}${form.lastName?.charAt(0) || ''}`.toUpperCase();

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !storage) return;
    setUploading(true);
    try {
      const ref = storage.ref(`profile_pics/${user.uid}`);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      setForm(prev => ({ ...prev, photoURL: url }));
      await onUpdate({ ...form, photoURL: url });
    } catch (err) { alert("Upload failed."); }
    setUploading(false);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <button className="btn-secondary" onClick={onBack} style={{ marginBottom: '24px' }}>← Back to Dashboard</button>
      
      <div className="card" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '40px', padding: '60px', marginBottom: '24px' }}>
        <div style={{ textAlign: 'center', borderRight: '1px solid #eee', paddingRight: '40px' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {form.photoURL ? (
              <img src={form.photoURL} style={{ width: '200px', height: '200px', borderRadius: '50%', objectFit: 'cover', border: '6px solid #f3f4f6' }} alt="Profile" />
            ) : (
              <div style={{ width: '200px', height: '200px', borderRadius: '50%', background: '#1e3a5f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px', fontWeight: 'bold' }}>
                {initials || "?"}
              </div>
            )}
            <label htmlFor="photo-up" style={{ position: 'absolute', bottom: '15px', right: '15px', background: '#4b5563', color: 'white', width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '3px solid #fff' }}>📷</label>
          </div>
          <input type="file" id="photo-up" style={{ display: 'none' }} onChange={handlePhotoUpload} accept="image/*" />
          <h2 style={{ margin: '20px 0 5px 0' }}>{form.firstName} {form.lastName}</h2>
          <p style={{ color: '#666' }}>{user?.email}</p>
        </div>

        <div>
          <h2 style={{ marginTop: 0, marginBottom: '8px' }}>Basic Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div><label style={{ fontSize: '11px', fontWeight: '800', color: '#999' }}>FIRST NAME</label><input className="input-field" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} /></div>
            <div><label style={{ fontSize: '11px', fontWeight: '800', color: '#999' }}>LAST NAME</label><input className="input-field" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} /></div>
            <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '11px', fontWeight: '800', color: '#999' }}>PHONE</label><input className="input-field" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          </div>
          <button className="btn-primary" style={{ marginTop: '30px', width: '100%' }} onClick={() => onUpdate(form)}>Save Changes</button>
        </div>
      </div>

      <div className="card" style={{ padding: '40px', border: '1px solid #fee2e2' }}>
        <h3 style={{ color: '#dc2626' }}>Security & Privacy</h3>
        <button onClick={onDelete} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Delete Account</button>
      </div>
    </div>
  );
}
