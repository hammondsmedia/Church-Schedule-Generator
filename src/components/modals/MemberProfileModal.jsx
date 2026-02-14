// src/components/modals/MemberProfileModal.jsx
import React, { useState } from 'react';

export default function MemberProfileModal({ 
  isOpen, 
  onClose, 
  editingMember, 
  setEditingMember, 
  members, 
  setMembers, 
  families, 
  setFamilies, 
  serviceSettings,
  userRole // Receive userRole
}) {
  const [activeTab, setActiveTab] = useState('about');
  if (!isOpen || !editingMember) return null;

  // READ-ONLY LOGIC
  const isReadOnly = !['owner', 'admin'].includes(userRole);

  const handleSave = () => {
    if (isReadOnly) return; // Prevent saving if unauthorized
    if (members.find(m => m.id === editingMember.id)) {
      setMembers(members.map(m => m.id === editingMember.id ? editingMember : m));
    } else {
      setMembers([...members, editingMember]);
    }
    onClose();
  };

  const updateField = (field, value) => {
    if (isReadOnly) return;
    setEditingMember({ ...editingMember, [field]: value });
  };

  const createNewFamily = () => {
    if (isReadOnly) return;
    const familyName = prompt("Enter family name (e.g., 'The Hammonds Family'):");
    if (!familyName) return;
    const newId = 'fam_' + Date.now();
    setFamilies([...families, { id: newId, name: familyName }]);
    updateField('familyId', newId);
  };

  const currentFamily = (families || []).find(f => f.id === editingMember.familyId);
  const householdMembers = (members || []).filter(m => m.familyId === editingMember.familyId && m.id !== editingMember.id);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', display: 'flex', padding: 0, overflow: 'hidden' }}>
        
        {/* SIDEBAR: CMS Fields */}
        <div style={{ width: '300px', borderRight: '1px solid #eee', padding: '24px', background: '#fbfbfc', overflowY: 'auto' }}>
          <h3 style={{ margin: '0 0 20px 0' }}>About</h3>
          <div style={{ display: 'grid', gap: '14px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#999', textTransform: 'uppercase' }}>First Name</label>
            <input className="input-field" disabled={isReadOnly} style={{padding: '8px 12px'}} value={editingMember.firstName || ''} onChange={e => updateField('firstName', e.target.value)} />
            
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#999', textTransform: 'uppercase' }}>Last Name</label>
            <input className="input-field" disabled={isReadOnly} style={{padding: '8px 12px'}} value={editingMember.lastName || ''} onChange={e => updateField('lastName', e.target.value)} />
            
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#999', textTransform: 'uppercase' }}>Leadership Role</label>
            <select className="input-field" disabled={isReadOnly} style={{padding: '8px 12px'}} value={editingMember.leadershipRole || ''} onChange={e => updateField('leadershipRole', e.target.value)}>
              <option value="">None</option>
              <option value="Elder">Elder</option>
              <option value="Deacon">Deacon</option>
              <option value="Evangelist">Evangelist</option>
              <option value="Teacher">Teacher</option>
            </select>
            
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#999', textTransform: 'uppercase' }}>Email</label>
            <input className="input-field" disabled={isReadOnly} style={{padding: '8px 12px'}} value={editingMember.email || ''} onChange={e => updateField('email', e.target.value)} />
            
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#999', textTransform: 'uppercase' }}>Phone</label>
            <input className="input-field" disabled={isReadOnly} style={{padding: '8px 12px'}} value={editingMember.phone || ''} onChange={e => updateField('phone', e.target.value)} />
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
                <p style={{color: '#666'}}>Unified profile for congregation management.</p>
                {isReadOnly && <p style={{fontSize: '12px', color: '#dc2626', background: '#fef2f2', padding: '8px', borderRadius: '4px', border: '1px solid #fee2e2'}}>Note: Only Admins can modify profile data.</p>}
              </div>
            )}

            {activeTab === 'family' && (
              <div style={{ display: 'grid', gap: '24px' }}>
                <div className="card" style={{ background: '#f8f6f3', border: '1px dashed #ddd' }}>
                  <label style={{ display: 'block', fontWeight: 800, marginBottom: '8px', fontSize: '13px' }}>Link to Household</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select className="input-field" disabled={isReadOnly} style={{flex: 1}} value={editingMember.familyId || ""} onChange={e => updateField('familyId', e.target.value)}>
                      <option value="">— Not Linked —</option>
                      {(families || []).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    {!isReadOnly && <button className="btn-secondary" onClick={createNewFamily}>+ New Household</button>}
                  </div>
                </div>

                {currentFamily && (
                  <div>
                    <h4 style={{ color: '#1e3a5f', marginBottom: '12px' }}>Members of {currentFamily.name}</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {householdMembers.map(m => (
                        <div key={m.id} className="service-badge" style={{ background: '#fff', border: '1px solid #eee' }}>
                          👤 {m.firstName} {m.lastName}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'speaker' && (
              <div>
                <label style={{ display: 'flex', gap: '12px', fontWeight: 'bold', marginBottom: '24px', alignItems: 'center' }}>
                  <input type="checkbox" disabled={isReadOnly} style={{width: '18px', height: '18px'}} checked={editingMember.isSpeaker} onChange={e => updateField('isSpeaker', e.target.checked)} /> 
                  Enable for Schedule Generator
                </label>
                {editingMember.isSpeaker && (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <strong>Weekly Availability</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {Object.keys(serviceSettings).map(k => (
                        <label key={k} className="service-badge" style={{ background: editingMember.availability?.[k] ? '#dbeafe' : '#f3f4f6', cursor: isReadOnly ? 'default' : 'pointer' }}>
                          <input type="checkbox" disabled={isReadOnly} style={{marginRight: '8px'}} checked={editingMember.availability?.[k] || false} onChange={e => {
                            const currentAvail = editingMember.availability || {};
                            updateField('availability', { ...currentAvail, [k]: e.target.checked });
                          }} /> {serviceSettings[k].label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'service' && (
              <div>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>Service duties this member is qualified for.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {["Song Leading", "Opening Prayer", "Closing Prayer", "Table", "Scripture Reading", "Usher"].map(skill => (
                    <label key={skill} className="service-badge" style={{ background: (editingMember.serviceSkills || []).includes(skill) ? '#d1fae5' : '#f3f4f6', cursor: isReadOnly ? 'default' : 'pointer' }}>
                      <input type="checkbox" disabled={isReadOnly} style={{marginRight: '8px'}} checked={(editingMember.serviceSkills || []).includes(skill)} onChange={e => {
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
            {!isReadOnly && <button className="btn-primary" onClick={handleSave}>Save Profile</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
