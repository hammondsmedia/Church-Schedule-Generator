// src/components/pages/SettingsPage.jsx
import React, { useState } from 'react';

const ROLE_LABELS = {
  viewer: { label: 'Viewer', color: 'var(--text-3)', bg: 'var(--border-light)' },
  standard: { label: 'Standard', color: '#1d4ed8', bg: '#dbeafe' },
  admin: { label: 'Admin', color: '#5b21b6', bg: 'var(--accent-light)' },
  owner: { label: 'Owner', color: '#b45309', bg: '#fef3c7' },
};

function RoleBadge({ role }) {
  const r = ROLE_LABELS[role] || ROLE_LABELS.viewer;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 99,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase',
      background: r.bg, color: r.color,
    }}>
      {r.label}
    </span>
  );
}

export default function SettingsPage({
  onBack, serviceSettings, setServiceSettings, userRole, user, members,
  pendingInvites = [], cancelInvite, generateInviteLink, updateMemberRole, removeMember,
  churchName, setChurchName
}) {
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole]   = useState('standard');

  const handleSendInvite = () => {
    if (!newEmail.trim()) return;
    generateInviteLink(newEmail.trim(), newRole);
    setNewEmail('');
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', paddingBottom: 40 }}>
      {/* Back */}
      <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 20, gap: 6 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Dashboard
      </button>

      <h2 style={{ margin: '0 0 24px', fontSize: 24, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text)' }}>
        Settings
      </h2>

      <div style={{ display: 'grid', gap: 20 }}>
        {/* ── Congregation Profile ── */}
        <div className="card">
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
            Congregation Profile
          </h3>
          <label className="form-label">Congregation Name</label>
          <input
            className="input-field"
            value={churchName || ''}
            onChange={e => setChurchName(e.target.value)}
            disabled={userRole !== 'owner'}
            placeholder="Enter congregation name…"
          />
          {userRole !== 'owner' && (
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '6px 0 0' }}>Only the owner can change the congregation name.</p>
          )}
        </div>

        {/* ── Service Settings ── */}
        <div className="card">
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
            Service Settings
          </h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {Object.keys(serviceSettings).map(k => {
              const s = serviceSettings[k];
              return (
                <div key={k} style={{
                  padding: '14px 16px',
                  border: `1.5px solid ${s.enabled ? 'var(--primary-light)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  background: s.enabled ? 'var(--primary-xlight)' : 'var(--surface-2)',
                  transition: 'all 150ms ease',
                }}>
                  <label className="toggle-label" style={{ marginBottom: s.enabled ? 12 : 0 }}>
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={e => setServiceSettings({ ...serviceSettings, [k]: { ...s, enabled: e.target.checked } })}
                    />
                    <span style={{ fontWeight: 700, color: s.enabled ? 'var(--primary-dark)' : 'var(--text-2)' }}>
                      {s.label}
                    </span>
                    {!s.enabled && <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>— Disabled</span>}
                  </label>
                  {s.enabled && (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ flex: 2 }}>
                        <label className="form-label">Label</label>
                        <input
                          className="input-field"
                          value={s.label}
                          onChange={e => setServiceSettings({ ...serviceSettings, [k]: { ...s, label: e.target.value } })}
                        />
                      </div>
                      {k !== 'communion' && (
                        <div style={{ flex: 1 }}>
                          <label className="form-label">Time</label>
                          <input
                            className="input-field"
                            value={s.time}
                            onChange={e => setServiceSettings({ ...serviceSettings, [k]: { ...s, time: e.target.value } })}
                            placeholder="e.g. 10:00 AM"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Organization Management ── */}
        {['owner', 'admin'].includes(userRole) && (
          <div className="card">
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
              Organization Management
            </h3>

            {/* Invite member */}
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: 24 }}>
              <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 14, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                Invite a Member
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  className="input-field"
                  style={{ flex: '2 1 200px' }}
                  placeholder="email@example.com"
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendInvite()}
                />
                <select
                  className="input-field"
                  style={{ flex: '1 1 120px' }}
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                >
                  <option value="viewer">Viewer</option>
                  <option value="standard">Standard</option>
                  <option value="admin">Admin</option>
                </select>
                <button className="btn-primary" onClick={handleSendInvite} style={{ flexShrink: 0 }}>
                  Send Invite
                </button>
              </div>
            </div>

            {/* Pending invites */}
            {pendingInvites.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)', marginBottom: 10 }}>
                  Pending Invites ({pendingInvites.length})
                </p>
                <div style={{ display: 'grid', gap: 8 }}>
                  {pendingInvites.map(inv => (
                    <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--warning-bg)', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)' }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{inv.email}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 8 }}>({inv.role})</span>
                      </div>
                      <button onClick={() => cancelInvite(inv.id)} className="btn-ghost" style={{ fontSize: 12, color: 'var(--error)', padding: '4px 8px' }}>
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Members with access */}
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12, letterSpacing: '-0.01em' }}>
              Directory Access
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              {members.filter(m => m.hasAccount !== false).map(m => (
                <div key={m.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                      {m.firstName} {m.lastName}
                      {m.id === user.uid && (
                        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, marginLeft: 6 }}>(You)</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{m.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <RoleBadge role={m.role || 'viewer'} />
                    <select
                      className="input-field"
                      style={{ width: 'auto', padding: '5px 10px', fontSize: 13 }}
                      value={m.role || 'viewer'}
                      onChange={e => updateMemberRole(m.id, e.target.value)}
                      disabled={m.id === user.uid}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="standard">Standard</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                    {m.id !== user.uid && (
                      <button
                        onClick={() => removeMember(m.id, m.firstName)}
                        className="btn-ghost"
                        style={{ color: 'var(--error)', padding: '5px 8px', fontSize: 16 }}
                      >
                        ✕
                      </button>
                    )}
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
