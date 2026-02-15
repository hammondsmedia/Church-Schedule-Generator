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
      setForm({ ...form, photoURL: url });
      await onUpdate({ ...form, photoURL: url });
    } catch (err) { alert("Error uploading image"); }
    setUploading(false);
  };

  const handleSave = async () => {
    await onUpdate(form);
    alert("Personal profile updated and synced with Directory!");
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <button className="btn-secondary" onClick={onBack} style={{ marginBottom: '24px' }}>
        ← Back to Directory
      </button>
      
      <div className="card" style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '40px', padding: '48px' }}>
        
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
          {uploading && <p style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 'bold' }}>Uploading photo...</p>}
        </div>

        {/* RIGHT SIDE: BASIC INFO FORM */}
        <div>
          <h2 style={{ marginTop: 0, marginBottom: '8px', fontSize: '22px' }}>Basic Information</h2>
          <p style={{ color: '#666', marginBottom: '32px', fontSize: '14px' }}>Update your personal details. These changes will be visible to others in the Directory.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div style={{ gridColumn: 'span 1' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#999', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>First Name</label>
              <input className="input-field" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} placeholder="e.g. Jacob" />
            </div>
            <div style={{ gridColumn: 'span 1' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#999', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Last Name</label>
              <input className="input-field" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} placeholder="e.g. McKinney" />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#999', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Phone Number</label>
              <input className="input-field" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="555-555-5555" />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#999', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Email (Sign-in Email)</label>
              <input className="input-field" value={user.email} disabled style={{ background: '#f9fafb', cursor: 'not-allowed' }} />
            </div>
          </div>

          <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={handleSave} style={{ minWidth: '150px' }}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
