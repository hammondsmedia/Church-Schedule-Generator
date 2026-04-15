// src/components/tabs/DirectoryTab.jsx
import React, { useState } from 'react';

const SearchIcon = () => (
  <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const ROLE_COLORS = {
  Elder:      { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  Deacon:     { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
  Evangelist: { bg: '#ede9fe', color: '#5b21b6', border: '#c4b5fd' },
  Teacher:    { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
};

export default function DirectoryTab({ members = [], families = [], userRole, setEditingMember, user }) {
  const [search, setSearch] = useState('');
  const isAdmin = ['owner', 'admin'].includes(userRole);

  const filtered = (members || []).filter(m => {
    const name = `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase();
    const role = (m.leadershipRole || '').toLowerCase();
    return name.includes(search.toLowerCase()) || role.includes(search.toLowerCase());
  });

  return (
    <div>
      {/* Header row */}
      <div className="section-header" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 className="section-title">Directory</h2>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 24, height: 24, borderRadius: 99,
            background: 'var(--primary-xlight)', color: 'var(--primary-dark)',
            fontSize: 12, fontWeight: 700, padding: '0 8px',
          }}>
            {members.length}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, flex: '1 1 260px', justifyContent: 'flex-end' }}>
          <div className="search-wrap" style={{ maxWidth: 320 }}>
            <SearchIcon />
            <input
              className="search-input"
              placeholder="Search by name or role…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {isAdmin && (
            <button
              className="btn-primary"
              style={{ flexShrink: 0 }}
              onClick={() => setEditingMember({
                id: Date.now(),
                firstName: '', lastName: '',
                isSpeaker: false, serviceSkills: [],
                leadershipRole: '', familyId: '',
                availability: {}, repeatRules: [], hasAccount: false
              })}
            >
              + Add Member
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <h3>{search ? 'No results found' : 'No members yet'}</h3>
          <p>{search ? `No members match "${search}". Try a different search.` : 'Add members to your congregation directory to get started.'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(m => {
            const family = families.find(f => f.id === m.familyId);
            const initials = `${m.firstName?.charAt(0) || ''}${m.lastName?.charAt(0) || ''}`.toUpperCase();
            const roleStyle = ROLE_COLORS[m.leadershipRole] || null;
            const canEdit = isAdmin || m.id === user?.uid;

            return (
              <div key={m.id} className="member-card">
                {/* Avatar */}
                {m.photoURL ? (
                  <img src={m.photoURL} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--border)' }} alt="Profile" />
                ) : (
                  <div className="avatar-circle" style={{ width: 52, height: 52, fontSize: 18, flexShrink: 0 }}>
                    {initials || '?'}
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                        {m.firstName} {m.lastName}
                      </h3>
                      {m.leadershipRole && roleStyle && (
                        <span style={{
                          display: 'inline-block', marginTop: 4,
                          padding: '2px 8px', borderRadius: 99,
                          fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
                          background: roleStyle.bg, color: roleStyle.color, border: `1px solid ${roleStyle.border}`,
                        }}>
                          {m.leadershipRole}
                        </span>
                      )}
                      {m.leadershipRole && !roleStyle && (
                        <span className="role-badge" style={{ display: 'inline-block', marginTop: 4, fontSize: 11 }}>
                          {m.leadershipRole}
                        </span>
                      )}
                    </div>
                    <button
                      className="btn-ghost"
                      style={{ padding: '5px 10px', fontSize: 12, flexShrink: 0, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                      onClick={() => setEditingMember(m)}
                    >
                      {canEdit ? 'Edit' : 'View'}
                    </button>
                  </div>

                  <div style={{ fontSize: 13, color: 'var(--text-3)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {family && (
                      <div style={{ color: '#9a3412', fontWeight: 600, fontSize: 12 }}>{family.name}</div>
                    )}
                    {(!m.hiddenFields?.phone || isAdmin) && (
                      <div style={{ color: m.hiddenFields?.phone && isAdmin ? 'var(--text-3)' : 'inherit' }}>
                        {m.phone || '—'}
                        {m.hiddenFields?.phone && isAdmin && (
                          <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 4 }}>(hidden)</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
