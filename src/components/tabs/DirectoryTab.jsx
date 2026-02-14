// src/components/tabs/DirectoryTab.jsx
import React, { useState } from 'react';

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
);

export default function DirectoryTab({ members, userRole, setEditingMember, setMembers }) {
  const [search, setSearch] = useState("");

  const filtered = members.filter(m => 
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    m.leadershipRole?.toLowerCase().includes(search.toLowerCase())
  );

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
            <button className="btn-primary" onClick={() => setEditingMember({ id: Date.now(), firstName: '', lastName: '', availability: {}, blockOffDates: [], repeatRules: [], serviceSkills: [], leadershipRole: "" })}>+ Add Person</button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {filtered.map(m => (
          <div key={m.id} className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#1e3a5f' }}>{m.firstName} {m.lastName}</h3>
                {m.leadershipRole && <span className="service-badge" style={{ background: '#f3f4f6', color: '#1e3a5f', marginTop: '6px' }}>{m.leadershipRole}</span>}
              </div>
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setEditingMember({ ...m })}>
                <EditIcon /> View Profile
              </button>
            </div>
            
            <div style={{ fontSize: '13px', color: '#666' }}>
              <div style={{ marginBottom: '4px' }}>📧 {m.email || 'No email added'}</div>
              <div style={{ marginBottom: '4px' }}>📞 {m.phone || 'No phone added'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
