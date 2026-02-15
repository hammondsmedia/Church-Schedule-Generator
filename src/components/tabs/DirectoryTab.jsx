// src/components/tabs/DirectoryTab.jsx
import React, { useState } from 'react';

export default function DirectoryTab({ members = [], families = [], userRole, setEditingMember }) {
  const [search, setSearch] = useState("");
  const isAdmin = ['owner', 'admin'].includes(userRole);

  const filtered = members.filter(m => {
    const name = `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase();
    const role = (m.leadershipRole || "").toLowerCase();
    return name.includes(search.toLowerCase()) || role.includes(search.toLowerCase());
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ color: '#1e3a5f', margin: 0 }}>Congregation Directory ({members.length})</h2>
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
          return (
            <div key={m.id} className="card" style={{ padding: '24px', display: 'flex', gap: '16px' }}>
              <img 
                src={m.photoURL || `https://ui-avatars.com/api/?name=${m.firstName}+${m.lastName}`} 
                style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} 
                alt="Profile"
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#1e3a5f', fontSize: '18px' }}>{m.firstName} {m.lastName}</h3>
                    {m.leadershipRole && <span className="service-badge" style={{ background: '#f3f4f6', color: '#1e3a5f', marginTop: '5px', fontSize: '11px' }}>{m.leadershipRole}</span>}
                  </div>
                  <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => setEditingMember(m)}>
                    {isAdmin ? "✏️ Edit" : "👁️ View"}
                  </button>
                </div>
                <div style={{ fontSize: '13px', color: '#666', marginTop: '10px' }}>
                  {family && <div style={{ color: '#9a3412', fontWeight: '600' }}>🏠 {family.name}</div>}
                  <div style={{ marginTop: '4px' }}>📞 {m.phone || '—'}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
