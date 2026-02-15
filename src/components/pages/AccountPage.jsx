// src/components/pages/AccountPage.jsx
import React, { useState } from 'react';

export default function AccountPage({ user, memberData, onUpdate, onDelete, onBack, storage }) {
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
      
      <div className="card" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '40px', padding: '48px', marginBottom: '24px' }}>
        {/* LEFT SIDE: PHOTO SECTION */}
        <div style={{ textAlign: 'center', borderRight: '1px solid #eee', paddingRight: '40px' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img 
              src={form.photoURL || `https://ui-avatars.com/api/?name=${form.firstName}+${form.lastName}&size=200&background=1e3a5f&color=fff`} 
              style={{ width: '180px', height: '180px', borderRadius: '50%', objectFit: 'cover', border: '5px solid #f3f4f6', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} 
              alt="Profile"
            />
            <label htmlFor="photo-up" style={{ position: 'absolute', bottom: '10px', right: '10px', background: '#1e3a5f', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '3px solid #fff' }}>
              📷
            </label>
          </div>
          <input type="file" id="photo-up" style={{ display: 'none' }} onChange={handlePhotoUpload} accept="image/*" />
          <h3 style={{ margin: '20px 0 5px 0', color: '#1e3a5f' }}>{form.firstName} {form.lastName}</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>{user.email}</p>
          {uploading && <p style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 'bold' }}>Uploading...</p>}
        </div>

        {/* RIGHT SIDE: BASIC INFO FORM */}
        <div>
          <h2 style={{ marginTop: 0, marginBottom: '8px', fontSize: '22px' }}>Basic Information</h2>
          <p style={{ color: '#666', marginBottom: '32px', fontSize: '14px' }}>Update your personal details here.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#999', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>First Name</label>
              <input className="input-field" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#999', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Last Name</label>
              <input className="input-field" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#999', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Phone Number</label>
              <input className="input-field" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
          </div>
          <button className="btn-primary" style={{ marginTop: '30px', width: '100%' }} onClick={handleSave}>Save Changes</button>
        </div>
      </div>

      {/* GDPR SECTION: DELETE ACCOUNT */}
      <div className="card" style={{ padding: '32px', border: '1px solid #fee2e2', background: '#fffcfc' }}>
        <h3 style={{ color: '#dc2626', marginTop: 0 }}>Security & Privacy</h3>
        <p style={{ color: '#666', fontSize: '14px' }}>Once you delete your account, all your data will be permanently removed from our organization directory. This action is not reversible.</p>
        <button 
          onClick={onDelete} 
          style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}
        >
          Delete My Account
        </button>
      </div>
    </div>
  );
}
