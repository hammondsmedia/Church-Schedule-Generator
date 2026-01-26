// src/components/modals/ProfileModal.jsx
import React from 'react';

export default function ProfileModal({
  isOpen,
  onClose,
  userRole,
  churchName,
  setChurchName,
  userFirstName,
  setUserFirstName,
  userLastName,
  setUserLastName,
  newEmail,
  setNewEmail,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  handleUpdateProfile
}) {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Logic for password matching validation
    if (newPassword) {
      if (newPassword !== confirmPassword) {
        alert("Passwords do not match!");
        return;
      }
      if (newPassword.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
      }
    }
    
    handleUpdateProfile(e);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 20px 0' }}>Edit Profile & Congregation</h3>
        <form onSubmit={handleSubmit}>
          {/* CONGREGATION NAME */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600' }}>Congregation Name</label>
            <input 
              className="input-field" 
              value={churchName} 
              onChange={e => setChurchName(e.target.value)} 
              disabled={userRole !== 'owner'} 
              required 
            />
            {userRole !== 'owner' && <p style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>Only the organization owner can change this name.</p>}
          </div>

          {/* PERSONAL DETAILS */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600' }}>First Name</label>
            <input className="input-field" value={userFirstName} onChange={e => setUserFirstName(e.target.value)} required />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600' }}>Last Name</label>
            <input className="input-field" value={userLastName} onChange={e => setUserLastName(e.target.value)} required />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600' }}>Email Address</label>
            <input className="input-field" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
          </div>
          
          {/* PASSWORD UPDATE SECTION */}
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
            <label style={{ fontSize: '13px', fontWeight: '600' }}>New Password (leave blank to keep current)</label>
            <input 
              className="input-field" 
              type="password" 
              placeholder="••••••••" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              style={{ marginBottom: '12px' }}
            />
            <label style={{ fontSize: '13px', fontWeight: '600' }}>Confirm New Password</label>
            <input 
              className="input-field" 
              type="password" 
              placeholder="••••••••" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={() => { onClose(); setNewPassword(''); setConfirmPassword(''); }}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
