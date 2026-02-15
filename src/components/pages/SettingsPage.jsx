// src/components/pages/SettingsPage.jsx
import React, { useState } from 'react';

export default function SettingsPage({ 
  onBack, serviceSettings, setServiceSettings, userRole, user, members, 
  pendingInvites, cancelInvite, generateInviteLink, updateMemberRole, removeMember 
}) {
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('viewer');

  const handleInvite = () => {
    if (!newEmail) return alert("Enter an email.");
    generateInviteLink(newEmail, newRole);
    setNewEmail('');
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
      <button className="btn-secondary" onClick={onBack} style={{ marginBottom: '24px' }}>← Back to Dashboard</button>
      
      <div style={{ display: 'grid', gap: '24px' }}>
        <div className="card">
          <h2 style={{ color: '#1e3a5f', marginTop: 0, marginBottom: '24px', fontSize: '24px', fontWeight: '800' }}>Service Settings</h2>
          {Object.keys(serviceSettings).map(k => (
            <div key={k} style={{ padding: '16px', border: '1px solid #f3f4f6', borderRadius: '12px', marginBottom: '12px', background: '#fcfcfd' }}>
              <label style={{ display: 'flex', gap: '12px', fontWeight: '800', marginBottom: '12px', alignItems: 'center' }}>
                <input 
                  type="checkbox" style={{ width: '18px', height: '18px' }}
                  checked={serviceSettings[k].enabled} 
                  onChange={e => setServiceSettings({ ...serviceSettings, [k]: { ...serviceSettings[k], enabled: e.target.checked } })} 
                /> 
                {serviceSettings[k].label}
              </label>
              {serviceSettings[k].enabled && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input className="input-field" style={{ flex: 2 }} value={serviceSettings[k].label} onChange={e => setServiceSettings({ ...serviceSettings, [k]: { ...serviceSettings[k], label: e.target.value } })} />
                  {k !== 'communion' && <input className="input-field" style={{ flex: 1 }} value={serviceSettings[k].time} onChange={e => setServiceSettings({ ...serviceSettings, [k]: { ...serviceSettings[k], time: e.target.value } })} />}
                </div>
              )}
            </div>
          ))}
        </div>

        {userRole === 'owner' && (
          <div className="card">
            <h2 style={{ color: '#1e3a5f', marginTop: 0, marginBottom: '12px', fontSize: '24px', fontWeight: '800' }}>Organization Management</h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>Invite members and manage permissions.</p>
            
            <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', marginBottom: '32px', border: '1px solid #e2e8f0' }}>
              <strong style={{ display: 'block', marginBottom: '12px' }}>Invite Member</strong>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input className="input-field" style={{ flex: 2 }} placeholder="email@example.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                <select className="input-field" style={{ flex: 1 }} value={newRole} onChange={e => setNewRole(e.target.value)}>
                  <option value="viewer">Viewer</option>
                  <option value="standard">Standard</option>
                  <option value="admin">Admin</option>
                </select>
                <button className="btn-primary" onClick={handleInvite}>Send Invite</button>
              </div>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>Current Directory Access</h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              {members.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#fff', border: '1px solid #eee', borderRadius: '10px' }}>
                  <div>
                    <div style={{ fontWeight: '800' }}>{m.firstName} {m.lastName} {m.id === user.uid && "(You)"}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{m.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <select className="input-field" style={{ padding: '6px 12px', fontSize: '13px' }} value={m.role || 'viewer'} onChange={e => updateMemberRole(m.id, e.target.value)} disabled={m.id === user.uid}>
                      <option value="viewer">Viewer</option>
                      <option value="standard">Standard</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                    {m.id !== user.uid && <button onClick={() => removeMember(m.id, m.firstName)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
