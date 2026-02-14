// src/components/modals/MemberProfileModal.jsx
import React, { useState } from 'react';

export default function MemberProfileModal({ isOpen, onClose, editingMember, setEditingMember, members, setMembers, serviceSettings }) {
  const [activeTab, setActiveTab] = useState('about');
  if (!isOpen || !editingMember) return null;

  const handleSave = () => {
    if (members.find(m => m.id === editingMember.id)) {
      setMembers(members.map(m => m.id === editingMember.id ? editingMember : m));
    } else {
      setMembers([...members, editingMember]);
    }
    onClose();
  };

  const updateField = (field, value) => setEditingMember({ ...editingMember, [field]: value });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', padding: 0, overflow: 'hidden' }}>
        
        {/* SIDEBAR: About Section */}
        <div style={{ width: '300px', borderRight: '1px solid #eee', padding: '24px', background: '#fbfbfc' }}>
          <h3 style={{ margin: '0 0 20px 0' }}>About</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#666' }}>First Name</label>
            <input className="input-field" value={editingMember.firstName} onChange={e => updateField('firstName', e.target.value)} />
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#666' }}>Last Name</label>
            <input className="input-field" value={editingMember.lastName} onChange={e => updateField('lastName', e.target.value)} />
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#666' }}>Leadership Role</label>
            <select className="input-field" value={editingMember.leadershipRole} onChange={e => updateField('leadershipRole', e.target.value)}>
              <option value="">None</option>
              <option value="Elder">Elder</option>
              <option value="Deacon">Deacon</option>
              <option value="Evangelist">Evangelist</option>
              <option value="Teacher">Teacher</option>
            </select>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#666' }}>Phone</label>
            <input className="input-field" value={editingMember.phone || ''} onChange={e => updateField('phone', e.target.value)} />
          </div>
        </div>

        {/* CONTENT AREA: Tabs for Skills/Speaker Logic */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
            <button className={`nav-tab ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>Overview</button>
            <button className={`nav-tab ${activeTab === 'speaker' ? 'active' : ''}`} onClick={() => setActiveTab('speaker')}>Speaker Logic</button>
            <button className={`nav-tab ${activeTab === 'service' ? 'active' : ''}`} onClick={() => setActiveTab('service')}>Service Skills</button>
          </div>

          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            {activeTab === 'speaker' && (
              <div>
                <label style={{ display: 'flex', gap: '10px', fontWeight: 'bold', marginBottom: '20px' }}>
                  <input type="checkbox" checked={editingMember.isSpeaker} onChange={e => updateField('isSpeaker', e.target.checked)} /> 
                  Enable for Schedule Generator
                </label>
                {editingMember.isSpeaker && (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <strong>Availability</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {Object.keys(serviceSettings).map(k => (
                        <label key={k} className="pill" style={{ background: editingMember.availability?.[k] ? '#dbeafe' : '#f3f4f6' }}>
                          <input type="checkbox" checked={editingMember.availability?.[k] || false} onChange={e => setEditingMember({ ...editingMember, availability: { ...editingMember.availability, [k]: e.target.checked } })} /> {serviceSettings[k].label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'service' && (
              <div>
                <p style={{ color: '#666', fontSize: '14px' }}>Select duties this member is qualified for.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {["Song Leading", "Opening Prayer", "Closing Prayer", "Table", "Scripture Reading", "Usher"].map(skill => (
                    <label key={skill} className="pill">
                      <input type="checkbox" checked={editingMember.serviceSkills?.includes(skill)} onChange={e => {
                        const skills = editingMember.serviceSkills || [];
                        updateField('serviceSkills', e.target.checked ? [...skills, skill] : skills.filter(s => s !== skill));
                      }} /> {skill}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={handleSave}>Save Profile</button>
          </div>
        </div>
      </div>
    </div>
  );
}
