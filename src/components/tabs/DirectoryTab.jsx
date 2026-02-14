// src/components/tabs/DirectoryTab.jsx
import React, { useState } from 'react';

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
);

export default function DirectoryTab({ members = [], families = [], userRole, setEditingMember }) {
  const [search, setSearch] = useState("");

  const filtered = members.filter(m => {
    const fullName = `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase();
    const role = (m.leadershipRole || "").toLowerCase();
    const term = search.toLowerCase();
    return fullName.includes(term) || role.includes(term);
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ color: '#1e3a5f', margin: 0 }}>Congregation Directory ({members.length})</h2>
        <div style={{ display: 'flex', gap: '12px', flex: '1 1 300px' }}>
          <input 
            className="input-field" 
            placeholder="Search members or roles..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
          {['owner', 'admin'].includes(userRole) && (
            <button className="btn-primary" onClick={() => setEditingMember({ id: Date.now(), firstName: '', lastName: '', availability: {}, blockOffDates: [], repeatRules: [], serviceSkills: [], leadershipRole: "", familyId: "" })}>+ Add Person</button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {filtered.map(m => {
          const family = families.find(f => f.id === m.familyId);
          return (
            <div key={m.id} className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#1e3a5f', fontSize: '18px' }}>{m.firstName} {m.lastName}</h3>
                  {m.leadershipRole && <span className="service-badge" style={{ background: '#f3f4f6', color: '#1e3a5f', marginTop: '8px', fontSize: '11px' }}>{m.leadershipRole}</span>}
                  {family && <span className="service-badge" style={{ background: '#fff7ed', color: '#9a3412', marginTop: '8px', fontSize: '11px', border: '1px solid #fed7aa' }}>🏠 {family.name}</span>}
                </div>
                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setEditingMember({ ...m })}>
                  {['owner', 'admin'].includes(userRole) ? <EditIcon /> : '👁️'} {['owner', 'admin'].includes(userRole) ? 'Profile' : 'View'}
                </button>
              </div>
              
              <div style={{ fontSize: '13px', color: '#666', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                <div style={{ marginBottom: '6px' }}>📧 {m.email || '—'}</div>
                <div>📞 {m.phone || '—'}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
