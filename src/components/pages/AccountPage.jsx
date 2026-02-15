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

  const handleDownloadData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(memberData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `My_Data.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // Helper for the HubSpot-style initials avatar
  const initials = `${form.firstName?.charAt(0) || ''}${form.lastName?.charAt(0) || ''}`.toUpperCase();

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
      <button className="btn-secondary" onClick={onBack} style={{ marginBottom: '24px', borderRadius: '6px', padding: '8px 16px', fontSize: '14px' }}>
        ← Back to Dashboard
      </button>
      
      {/* MAIN PROFILE CARD */}
      <div className="card" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '40px', padding: '60px', marginBottom: '24px', alignItems: 'center' }}>
        
        {/* LEFT: AVATAR SECTION */}
        <div style={{ textAlign: 'center', borderRight: '1px solid #eee', paddingRight: '40px' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {form.photoURL ? (
              <img src={form.photoURL} style={{ width: '200px', height: '200px', borderRadius: '50%', objectFit: 'cover', border: '6px solid #f3f4f6' }} alt="Profile" />
            ) : (
              <div style={{ width: '200px', height: '200px', borderRadius: '50%', background: '#1e3a5f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px', fontWeight: 'bold', border: '6px solid #f3f4f6' }}>
                {initials}
              </div>
            )}
            <label htmlFor="photo-up" style={{ position: 'absolute', bottom: '15px', right: '15px', background: '#4b5563', color: 'white', width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '3px solid #fff', fontSize: '18px' }}>
              📷
            </label>
          </div>
          <input type="file" id="photo-up" style={{ display: 'none' }} onChange={handlePhotoUpload} accept="image/*" />
          <h2 style={{ margin: '24px 0 4px 0', color: '#1e3a5f', fontSize: '24px' }}>{form.firstName} {form.lastName}</h2>
          <p style={{ color: '#666', fontSize: '15px', margin: 0 }}>{user.email}</p>
        </div>

        {/* RIGHT: FORM SECTION */}
        <div>
          <h2 style={{ marginTop: 0, marginBottom: '8px', fontSize: '26px', fontWeight: '800' }}>Basic Information</h2>
          <p style={{ color: '#666', marginBottom: '32px', fontSize: '15px' }}>These changes will be visible in the Congregation Directory.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#999', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>First Name</label>
              <input className="input-field" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} style={{ background: '#f9fafb' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#999', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Last Name</label>
              <input className="input-field" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} style={{ background: '#f9fafb' }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#999', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Phone Number</label>
              <input className="input-field" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={{ background: '#f9fafb' }} />
            </div>
          </div>
          <button className="btn-primary" onClick={() => onUpdate(form)} style={{ marginTop: '40px', width: '100%', padding: '16px', fontSize: '16px', fontWeight: 'bold', borderRadius: '8px' }}>
            Save Changes
          </button>
        </div>
      </div>

      {/* SECURITY CARD */}
      <div className="card" style={{ padding: '40px', border: '1px solid #fee2e2', background: '#fffcfc', borderRadius: '16px' }}>
        <h3 style={{ color: '#dc2626', marginTop: 0, fontSize: '20px', fontWeight: '800' }}>Security & Privacy</h3>
        <p style={{ color: '#666', fontSize: '15px', marginBottom: '24px' }}>Manage your data and account status for GDPR compliance.</p>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button onClick={handleDownloadData} className="btn-secondary" style={{ borderColor: '#d1d5db', color: '#374151', padding: '10px 20px' }}>Download My Data</button>
          <button onClick={onDelete} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Delete Account</button>
        </div>
      </div>
    </div>
  );
}
