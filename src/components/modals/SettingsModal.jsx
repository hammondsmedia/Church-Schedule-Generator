// src/components/modals/SettingsModal.jsx
import React from 'react';

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  serviceSettings, 
  setServiceSettings, 
  userRole, 
  user, 
  members, 
  pendingInvites, // NEW Prop
  cancelInvite, // NEW Prop
  inviteEmail, 
  setInviteEmail, 
  inviteRole, 
  setInviteRole, 
  generateInviteLink, 
  updateMemberRole, 
  removeMember, 
  setTransferTarget 
}) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 20px 0' }}>⚙️ Service Settings</h3>
        
        {/* SERVICE CONFIGURATION SECTION */}
        {Object.keys(serviceSettings).map(k => (
          <div key={k} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px' }}>
            <label style={{ display: 'flex', gap: '10px', fontWeight: 'bold', marginBottom: '8px' }}>
              <input 
                type="checkbox" 
                checked={serviceSettings[k].enabled} 
                onChange={e => setServiceSettings({ ...serviceSettings, [k]: { ...serviceSettings[k], enabled: e.target.checked } })} 
              /> 
              {serviceSettings[k].label}
            </label>
            {serviceSettings[k].enabled && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input 
                  className="input-field" 
                  style={{flex: '1 1 200px'}} 
                  value={serviceSettings[k].label} 
                  onChange={e => setServiceSettings({ ...serviceSettings, [k]: { ...serviceSettings[k], label: e.target.value } })} 
                />
                {k !== 'communion' && (
                  <input 
                    className="input-field" 
                    style={{flex: '1 1 100px'}} 
                    value={serviceSettings[k].time} 
                    onChange={e => setServiceSettings({ ...serviceSettings, [k]: { ...serviceSettings[k], time: e.target.value } })} 
                  />
                )}
              </div>
            )}
          </div>
        ))}
        
        <div style={{ marginTop: '32px', borderTop: '2px solid #eee', paddingTop: '20px' }}>
          <h4 style={{ color: '#1e3a5f', marginBottom: '16px' }}>👥 Organization Members</h4>
          
          {/* INVITE SECTION */}
          {userRole === 'owner' && (
            <div style={{ background: '#f8f6f3', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Invite a New Member</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input 
                  className="input-field" 
                  placeholder="Recipient email" 
                  style={{ flex: '2 1 200px' }} 
                  value={inviteEmail} 
                  onChange={(e) => setInviteEmail(e.target.value)} 
                />
                <select 
                  className="input-field" 
                  style={{ flex: '1 1 120px' }} 
                  value={inviteRole} 
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="viewer">Viewer</option>
                  <option value="standard">Standard</option>
                  <option value="admin">Admin</option>
                </select>
                <button className="btn-primary" onClick={generateInviteLink} style={{ flex: '1 1 100px', fontSize: '13px' }}>Send Invite</button>
              </div>
            </div>
          )}

          {/* NEW: PENDING INVITATIONS LIST */}
          {pendingInvites.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h5 style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', marginBottom: '10px' }}>Pending Invites</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingInvites.map((invite) => (
                  <div key={invite.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#fff7ed', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{invite.email}</div>
                      <div style={{ fontSize: '11px', color: '#9a3412' }}>
                        Expires: {new Date(invite.expiresAt).toLocaleDateString()} ({invite.role})
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => { setInviteEmail(invite.email); setInviteRole(invite.role); generateInviteLink(); }}
                        style={{ background: 'none', border: 'none', color: '#1e3a5f', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                      >
                        Resend
                      </button>
                      <button 
                        onClick={() => cancelInvite(invite.id)} 
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACTIVE MEMBERS LIST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {members.map((member) => (
              <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #eee' }}>
                <div>
                  <div style={{ fontWeight: '600' }}>{member.displayName} {member.id === user.uid && "(You)"}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{member.email}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {(userRole === 'owner' || (userRole === 'admin' && member.role !== 'owner')) && member.id !== user.uid ? (
                    <select 
                      value={member.role} 
                      onChange={(e) => updateMemberRole(member.id, e.target.value)} 
                      style={{ padding: '4px', fontSize: '12px' }}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="standard">Standard</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : ( 
                    <span className="badge">{member.role}</span> 
                  )}
                  
                  {((userRole === 'owner' && member.role !== 'owner') || 
                    (userRole === 'admin' && !['owner', 'admin'].includes(member.role))) && (
                    <button 
                      onClick={() => removeMember(member.id, member.displayName)} 
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  )}
                  
                  {userRole === 'owner' && member.id !== user.uid && (
                    <button 
                      onClick={() => { setTransferTarget(member); onClose(); }} 
                      className="btn-secondary" 
                      style={{ fontSize: '10px', padding: '4px 8px' }}
                    >
                      Transfer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <button className="btn-primary" style={{ width: '100%', marginTop: '24px' }} onClick={onClose}>Close Settings</button>
      </div>
    </div>
  );
}
