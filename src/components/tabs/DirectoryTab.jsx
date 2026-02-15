// src/components/tabs/DirectoryTab.jsx
import React, { useState } from 'react';

export default function DirectoryTab({ members = [], families = [], userRole, setEditingMember }) {
  const [search, setSearch] = useState("");
  const isAdmin = ['owner', 'admin'].includes(userRole);

  const filtered = (members || []).filter(m => {
    const name = `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase();
    const role = (m.leadershipRole || "").toLowerCase();
    return name.includes(search.toLowerCase()) || role.includes(search.toLowerCase());
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ color: '#1e3a5f', margin: 0, fontWeight: '800' }}>Congregation Directory ({members.length})</h2>
        <div style={{ display: 'flex', gap: '12px', flex: '1 1 300px' }}>
          <input className="input-field" placeholder="Search by name or role..." value={search} onChange={e => setSearch(e.target.value)} />
          {isAdmin && (
            <button className="btn-primary" onClick={() => setEditingMember({ id: Date.now(), firstName: '', lastName: '', isSpeaker: false, serviceSkills: [], leadershipRole: "", familyId: "", availability: {}, repeatRules: [] })}>
              + Add Person
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {filtered.map(m => {
          const family = families.find(f => f.id === m.familyId);
          const initials = `${m.firstName?.charAt(0) || ''}${m.lastName?.charAt(0) || ''}`.toUpperCase();
          
          return (
            <div key={m.id} className="card" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
              {m.photoURL ? (
                <img src={m.photoURL} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} alt="Profile" />
              ) : (
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#1e3a5f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800' }}>
                  {initials || "?"}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#1e3a5f', fontSize: '18px', fontWeight: '800' }}>{m.firstName} {m.lastName}</h3>
                    {m.leadershipRole && <span className="service-badge" style={{ background: '#f3f4f6', color: '#1e3a5f', marginTop: '6px' }}>{m.leadershipRole}</span>}
                  </div>
                  <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '12px', borderRadius: '6px' }} onClick={() => setEditingMember(m)}>
                    {isAdmin ? "✏️ Edit" : "👁️ View"}
                  </button>
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '12px' }}>
                  {family && <div style={{ color: '#9a3412', fontWeight: '700', marginBottom: '4px' }}>🏠 {family.name}</div>}
                  <div>📞 {m.phone || '—'}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
