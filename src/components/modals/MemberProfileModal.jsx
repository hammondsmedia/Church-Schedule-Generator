// src/components/modals/MemberProfileModal.jsx
import React, { useState } from 'react';

export default function MemberProfileModal({ isOpen, onClose, editingMember, setEditingMember, members, setMembers, families, setFamilies, serviceSettings }) {
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

  // Family Logic
  const createNewFamily = () => {
    const familyName = prompt("Enter family name (e.g., 'The Hammonds Family'):");
    if (!familyName) return;
    const newId = 'fam_' + Date.now();
    setFamilies([...families, { id: newId, name: familyName }]);
    updateField('familyId', newId);
  };

  const currentFamily = families.find(f => f.id === editingMember.familyId);
  const householdMembers = members.filter(m => m.familyId === editingMember.familyId && m.id !== editingMember.id);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', display: 'flex', padding: 0, overflow: 'hidden' }}>
        
        {/* SIDEBAR: CMS Fields */}
        <div style={{ width: '300px', borderRight: '1px solid #eee', padding: '24px', background: '#fbfbfc', overflowY: 'auto' }}>
          <h3 style={{ margin: '0 0 20px 0' }}>About</h3>
          <div style={{ display: 'grid', gap: '14px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#999', textTransform: 'uppercase' }}>First Name</label>
            <input className="input-field" style={{padding: '8px 12px'}} value={editingMember.firstName} onChange={e => updateField('firstName', e.target.value)} />
            
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#999', textTransform: 'uppercase' }}>Last Name</label>
            <input className="input-field" style={{padding: '8px 12px'}} value={editingMember.lastName} onChange={e => updateField('lastName', e.target.value)} />
            
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#999', textTransform: 'uppercase' }}>Leadership Role</label>
            <select className="input-field" style={{padding: '8px 12px'}} value={editingMember.leadershipRole} onChange={e => updateField('leadershipRole', e.target.value)}>
              <option value="">None</option>
              <option value="Elder">Elder</option>
              <option value="Deacon">Deacon</option>
              <option value="Evangelist">Evangelist</option>
              <option value="Teacher">Teacher</option>
            </select>
            
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#999', textTransform: 'uppercase' }}>Email</label>
            <input className="input-field" style={{padding: '8px 12px'}} value={editingMember.email || ''} onChange={e => updateField('email', e.target.value)} />
            
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#999', textTransform: 'uppercase' }}>Phone</label>
            <input className="input-field" style={{padding: '8px 12px'}} value={editingMember.phone || ''} onChange={e => updateField('phone', e.target.value)} />
          </div>
        </div>

        {/* CONTENT AREA: Tabs */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #eee', background: '#fff' }}>
            <button className={`nav-tab ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>Overview</button>
            <button className={`nav-tab ${activeTab === 'family' ? 'active' : ''}`} onClick={() => setActiveTab('family')}>Family</button>
            <button className={`nav-tab ${activeTab === 'speaker' ? 'active' : ''}`} onClick={() => setActiveTab('speaker')}>Speaker Logic</button>
            <button className={`nav-tab ${activeTab === 'service' ? 'active' : ''}`} onClick={() => setActiveTab('service')}>Service Skills</button>
          </div>

          <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
            {activeTab === 'about' && (
              <div>
                <h2 style={{marginTop: 0}}>{editingMember.firstName} {editingMember.lastName}</h2>
                <p style={{color: '#666'}}>Manage the profile and service capabilities of this member.</p>
              </div>
            )}

            {activeTab === 'family' && (
              <div style={{ display: 'grid', gap: '24px' }}>
                <div className="card" style={{ background: '#f8f6f3', border: '1px dashed #ddd' }}>
                  <label style={{ display: 'block', fontWeight: 800, marginBottom: '8px', fontSize: '13px' }}>Link to Household</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select className="input-field" style={{flex: 1}} value={editingMember.familyId || ""} onChange={e => updateField('familyId', e.target.value)}>
                      <option value="">— Not Linked —</option>
                      {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    <button className="btn-secondary" onClick={createNewFamily}>+ New Household</button>
                  </div>
                </div>

                {currentFamily && (
                  <div>
                    <h4 style={{ color: '#1e3a5f', marginBottom: '12px' }}>Members of {currentFamily.name}</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {householdMembers.length === 0 ? (
                        <p style={{ fontSize: '13px', color: '#666' }}>No other members linked to this household yet.</p>
                      ) : (
                        householdMembers.map(m => (
                          <div key={m.id} className="service-badge" style={{ background: '#fff', border: '1px solid #eee' }}>
                            👤 {m.firstName} {m.lastName}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'speaker' && (
              <div>
                <label style={{ display: 'flex', gap: '12px', fontWeight: 'bold', marginBottom: '24px', alignItems: 'center' }}>
                  <input type="checkbox" style={{width: '18px', height: '18px'}} checked={editingMember.isSpeaker} onChange={e => updateField('isSpeaker', e.target.checked)} /> 
                  Enable for Schedule Generator
                </label>
                {editingMember.isSpeaker && (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <strong>Weekly Availability</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {Object.keys(serviceSettings).map(k => (
                        <label key={k} className="service-badge" style={{ background: editingMember.availability?.[k] ? '#dbeafe' : '#f3f4f6', cursor: 'pointer' }}>
                          <input type="checkbox" style={{marginRight: '8px'}} checked={editingMember.availability?.[k] || false} onChange={e => setEditingMember({ ...editingMember, availability: { ...editingMember.availability, [k]: e.target.checked } })} /> {serviceSettings[k].label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'service' && (
              <div>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>Identify which roles this member is trained or qualified to fulfill.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {["Song Leading", "Opening Prayer", "Closing Prayer", "Table", "Scripture Reading", "Usher", "Sound/Media"].map(skill => (
                    <label key={skill} className="service-badge" style={{ background: editingMember.serviceSkills?.includes(skill) ? '#d1fae5' : '#f3f4f6', cursor: 'pointer', padding: '8px 16px' }}>
                      <input type="checkbox" style={{marginRight: '8px'}} checked={editingMember.serviceSkills?.includes(skill)} onChange={e => {
                        const skills = editingMember.serviceSkills || [];
                        updateField('serviceSkills', e.target.checked ? [...skills, skill] : skills.filter(s => s !== skill));
                      }} /> {skill}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: '20px 32px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#fff' }}>
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={handleSave}>Save Profile</button>
          </div>
        </div>
      </div>
    </div>
  );
}
