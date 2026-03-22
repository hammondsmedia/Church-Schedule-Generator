// src/components/modals/MemberProfileModal.jsx
import React, { useState, useRef } from 'react';

export default function MemberProfileModal({
  isOpen, onClose, editingMember, setEditingMember,
  members, setMembers, families, setFamilies,
  serviceSettings, userRole, storage, removeMember, user,
  onSaveProfile, generateInviteLink
}) {
  const [activeTab, setActiveTab] = useState('about');
  const [uploading, setUploading] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const photoInputRef = useRef(null);

  if (!isOpen || !editingMember) return null;

  const isAdmin = ['owner', 'admin'].includes(userRole);
  const isOwnProfile = user?.uid === editingMember.id;

  // Determine if the current logged-in user is a parent in the same family as the profile being viewed
  const currentUserMember = (members || []).find(m => m.id === user?.uid);
  const currentUserIsParent = currentUserMember?.familyRole === 'parent';
  const isSameFamilyMember = !isOwnProfile &&
    currentUserMember?.familyId &&
    currentUserMember.familyId === editingMember.familyId;
  const canEdit = isAdmin || isOwnProfile || (currentUserIsParent && !!isSameFamilyMember);
  const isReadOnly = !canEdit;

  // Parents and admins can manage family (add members, send invites)
  const canManageFamily = isAdmin || (isOwnProfile && editingMember.familyRole === 'parent') ||
    (currentUserIsParent && !!currentUserMember?.familyId);

  const isNewMember = !members.find(m => m.id === editingMember.id);

  const handleSave = async () => {
    if (!canEdit) return;
    let updatedMembers;
    if (!isNewMember) {
      updatedMembers = members.map(m => m.id === editingMember.id ? editingMember : m);
    } else {
      updatedMembers = [...members, editingMember];
    }
    setMembers(updatedMembers);
    if (onSaveProfile) await onSaveProfile(updatedMembers);
    onClose();
  };

  const handleDelete = () => {
    if (!window.confirm(`Remove ${editingMember.firstName} ${editingMember.lastName} from the directory?`)) return;
    if (editingMember.hasAccount !== false && removeMember) {
      removeMember(editingMember.id, editingMember.firstName);
    } else {
      setMembers(members.filter(m => m.id !== editingMember.id));
    }
    onClose();
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !storage) return alert("Storage not available.");
    setUploading(true);
    try {
      const ref = storage.ref(`profile_pics/${editingMember.id}`);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      setEditingMember({ ...editingMember, photoURL: url });
    } catch (err) { alert("Upload failed."); }
    setUploading(false);
  };

  const updateField = (field, value) => {
    if (!canEdit) return;
    setEditingMember({ ...editingMember, [field]: value });
  };

  const toggleHiddenField = (field) => {
    const hidden = editingMember.hiddenFields || {};
    setEditingMember({ ...editingMember, hiddenFields: { ...hidden, [field]: !hidden[field] } });
  };

  const addRepeatRule = () => {
    const rules = editingMember.repeatRules || [];
    updateField('repeatRules', [...rules, { serviceType: 'sundayMorning', pattern: 'everyOther', startWeek: 'odd' }]);
  };

  const removeRule = (index) => {
    const rules = [...(editingMember.repeatRules || [])];
    rules.splice(index, 1);
    updateField('repeatRules', rules);
  };

  const updateRule = (index, field, value) => {
    const rules = [...(editingMember.repeatRules || [])];
    rules[index] = { ...rules[index], [field]: value };
    updateField('repeatRules', rules);
  };

  const handleCreateFamily = () => {
    if (!newFamilyName.trim()) return;
    const newFamily = { id: 'fam_' + Date.now(), name: newFamilyName.trim() };
    setFamilies([...(families || []), newFamily]);
    updateField('familyId', newFamily.id);
    setNewFamilyName('');
  };

  const handleAddFamilyMember = () => {
    setEditingMember({
      id: Date.now(),
      firstName: '', lastName: '',
      isSpeaker: false, serviceSkills: [], leadershipRole: '',
      familyId: editingMember.familyId,
      availability: {}, repeatRules: [], hasAccount: false
    });
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteSending(true);
    try {
      await generateInviteLink(inviteEmail.trim(), 'member');
      setInviteEmail('');
    } catch (err) { alert("Failed to send invite."); }
    setInviteSending(false);
  };

  const currentFamily = (families || []).find(f => f.id === editingMember.familyId);
  const householdMembers = (members || []).filter(m => m.familyId === editingMember.familyId && m.id !== editingMember.id);

  const skillOptions = [
    "Teacher", "Prayers", "Songs", "Contribution/Collection",
    "Communion", "Opening Announcements", "Closing Announcements"
  ];

  const initials = `${editingMember.firstName?.charAt(0) || ''}${editingMember.lastName?.charAt(0) || ''}`.toUpperCase();
  const hiddenFields = editingMember.hiddenFields || {};

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', padding: 0, overflow: 'hidden' }}>

        {/* SIDEBAR */}
        <div style={{ width: '300px', borderRight: '1px solid #eee', padding: '24px', background: '#fbfbfc', overflowY: 'auto' }}>
          <h3 style={{ margin: '0 0 20px 0' }}>About Person</h3>

          {/* Photo Upload */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {editingMember.photoURL ? (
                <img src={editingMember.photoURL} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #e5e7eb' }} alt="Profile" />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#1e3a5f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800' }}>
                  {initials || '?'}
                </div>
              )}
              {canEdit && (
                <label htmlFor="member-photo-upload" style={{ position: 'absolute', bottom: '0px', right: '0px', background: '#4b5563', color: 'white', width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #fff', fontSize: '12px' }}>
                  {uploading ? '…' : '📷'}
                </label>
              )}
            </div>
            <input type="file" id="member-photo-upload" ref={photoInputRef} style={{ display: 'none' }} onChange={handlePhotoUpload} accept="image/*" />
            {uploading && <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Uploading...</div>}
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#999', textTransform: 'uppercase' }}>First Name</label>
              <input className="input-field" disabled={isReadOnly} value={editingMember.firstName || ''} onChange={e => updateField('firstName', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#999', textTransform: 'uppercase' }}>Last Name</label>
              <input className="input-field" disabled={isReadOnly} value={editingMember.lastName || ''} onChange={e => updateField('lastName', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#999', textTransform: 'uppercase' }}>Leadership Role</label>
              <select className="input-field" disabled={!isAdmin} value={editingMember.leadershipRole || ''} onChange={e => updateField('leadershipRole', e.target.value)}>
                <option value="">None</option>
                <option value="Elder">Elder</option>
                <option value="Deacon">Deacon</option>
                <option value="Evangelist">Evangelist</option>
                <option value="Teacher">Teacher</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#999', textTransform: 'uppercase' }}>Phone</label>
              <input className="input-field" disabled={isReadOnly} value={editingMember.phone || ''} onChange={e => updateField('phone', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#999', textTransform: 'uppercase' }}>Email</label>
              <input className="input-field" type="email" disabled={isReadOnly} value={editingMember.email || ''} onChange={e => updateField('email', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#999', textTransform: 'uppercase' }}>Address</label>
              <textarea className="input-field" disabled={isReadOnly} value={editingMember.address || ''} onChange={e => updateField('address', e.target.value)} rows={2} style={{ resize: 'vertical' }} placeholder="Street, City, State ZIP" />
            </div>

            {/* Privacy Controls — only shown to the profile owner or admins */}
            {(isOwnProfile || isAdmin) && (
              <div style={{ borderTop: '1px solid #eee', paddingTop: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#999', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Hide from Directory
                </label>
                <div style={{ display: 'grid', gap: '6px' }}>
                  {[
                    { key: 'phone', label: 'Phone number' },
                    { key: 'email', label: 'Email address' },
                    { key: 'address', label: 'Home address' },
                  ].map(({ key, label }) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#4b5563', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!!hiddenFields[key]}
                        onChange={() => toggleHiddenField(key)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px', marginBottom: 0 }}>
                  Hidden fields are only visible to admins.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* CONTENT */}
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
                <h2>{editingMember.firstName} {editingMember.lastName}</h2>
                <p style={{color: '#666'}}>Manage scheduling rules and qualifications.</p>
              </div>
            )}

            {activeTab === 'speaker' && (
              <div>
                {!isAdmin && (
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#0369a1', marginBottom: '20px' }}>
                    Speaker scheduling settings are managed by your congregation's administrators.
                  </div>
                )}
                <label style={{ display: 'flex', gap: '12px', fontWeight: 'bold', marginBottom: '24px', alignItems: 'center' }}>
                  <input type="checkbox" disabled={!isAdmin} checked={editingMember.isSpeaker} onChange={e => updateField('isSpeaker', e.target.checked)} />
                  Enable for Schedule Generator
                </label>

                {editingMember.isSpeaker && (
                  <div style={{ display: 'grid', gap: '24px' }}>
                    <div>
                      <strong style={{ display: 'block', marginBottom: '12px' }}>Weekly Availability</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {Object.keys(serviceSettings).map(k => (
                          <label key={k} className="service-badge" style={{ background: editingMember.availability?.[k] ? '#dbeafe' : '#f3f4f6', cursor: !isAdmin ? 'default' : 'pointer' }}>
                            <input type="checkbox" disabled={!isAdmin} checked={editingMember.availability?.[k] || false} onChange={e => {
                              const avail = editingMember.availability || {};
                              updateField('availability', { ...avail, [k]: e.target.checked });
                            }} /> {serviceSettings[k].label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <strong>Repeat Rules</strong>
                        {isAdmin && <button className="btn-secondary" style={{fontSize: '11px', padding: '4px 8px'}} onClick={addRepeatRule}>+ Add Rule</button>}
                      </div>
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {(editingMember.repeatRules || []).map((rule, idx) => (
                          <div key={idx} style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #eee', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <select className="input-field" disabled={!isAdmin} style={{flex: '1 1 120px', padding: '4px'}} value={rule.serviceType} onChange={e => updateRule(idx, 'serviceType', e.target.value)}>
                              {Object.keys(serviceSettings).map(k => <option key={k} value={k}>{serviceSettings[k].label}</option>)}
                            </select>
                            <select className="input-field" disabled={!isAdmin} style={{flex: '1 1 120px', padding: '4px'}} value={rule.pattern} onChange={e => updateRule(idx, 'pattern', e.target.value)}>
                              <option value="everyOther">Every Other Week</option>
                              <option value="nthWeek">Specific Sunday</option>
                            </select>
                            {rule.pattern === 'everyOther' ? (
                              <select className="input-field" disabled={!isAdmin} style={{flex: '1 1 100px', padding: '4px'}} value={rule.startWeek} onChange={e => updateRule(idx, 'startWeek', e.target.value)}>
                                <option value="odd">Odd Weeks</option>
                                <option value="even">Even Weeks</option>
                              </select>
                            ) : (
                              <select className="input-field" disabled={!isAdmin} style={{flex: '1 1 100px', padding: '4px'}} value={rule.nthWeek} onChange={e => updateRule(idx, 'nthWeek', parseInt(e.target.value))}>
                                <option value="1">1st Sunday</option>
                                <option value="2">2nd Sunday</option>
                                <option value="3">3rd Sunday</option>
                                <option value="4">4th Sunday</option>
                                <option value="5">5th Sunday</option>
                              </select>
                            )}
                            {isAdmin && <button onClick={() => removeRule(idx)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>✕</button>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'service' && (
              <div>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>Select categories for the Arranging Services tool.</p>
                {!isAdmin && (
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#0369a1', marginBottom: '16px' }}>
                    Service skill assignments are managed by your congregation's administrators.
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {skillOptions.map(skill => (
                    <label key={skill} className="service-badge" style={{ background: (editingMember.serviceSkills || []).includes(skill) ? '#d1fae5' : '#f3f4f6', cursor: !isAdmin ? 'default' : 'pointer', padding: '8px 16px' }}>
                      <input type="checkbox" disabled={!isAdmin} checked={(editingMember.serviceSkills || []).includes(skill)} onChange={e => {
                        const skills = editingMember.serviceSkills || [];
                        updateField('serviceSkills', e.target.checked ? [...skills, skill] : skills.filter(s => s !== skill));
                      }} /> {skill}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'family' && (
              <div style={{ display: 'grid', gap: '20px' }}>

                {/* Family Role */}
                <div className="card" style={{ background: '#f8f6f3', border: '1px dashed #ddd', padding: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 800, marginBottom: '8px', fontSize: '12px' }}>FAMILY ROLE</label>
                  <select
                    className="input-field"
                    disabled={isReadOnly}
                    value={editingMember.familyRole || ''}
                    onChange={e => updateField('familyRole', e.target.value)}
                  >
                    <option value="">— Not Set —</option>
                    <option value="parent">Parent</option>
                    <option value="child">Child</option>
                  </select>
                  {editingMember.familyRole === 'parent' && (
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '6px 0 0 0' }}>
                      Parents can edit their own profile and any family member's profile.
                    </p>
                  )}
                  {editingMember.familyRole === 'child' && (
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '6px 0 0 0' }}>
                      Children can only edit their own profile.
                    </p>
                  )}
                </div>

                {/* Household Link */}
                <div className="card" style={{ background: '#f8f6f3', border: '1px dashed #ddd', padding: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 800, marginBottom: '8px', fontSize: '12px' }}>HOUSEHOLD LINK</label>
                  <select className="input-field" disabled={isReadOnly} value={editingMember.familyId || ""} onChange={e => updateField('familyId', e.target.value)}>
                    <option value="">— Not Linked —</option>
                    {(families || []).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>

                {/* Create New Family — only admins or parents without a family */}
                {isAdmin && (
                  <div className="card" style={{ background: '#f0f9ff', border: '1px dashed #bae6fd', padding: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 800, marginBottom: '8px', fontSize: '12px' }}>CREATE NEW FAMILY</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        className="input-field"
                        placeholder="e.g. The Smith Family"
                        value={newFamilyName}
                        onChange={e => setNewFamilyName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreateFamily()}
                      />
                      <button className="btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={handleCreateFamily}>+ Create</button>
                    </div>
                  </div>
                )}

                {/* Household Members */}
                {currentFamily && (
                  <div>
                    <h4 style={{ color: '#1e3a5f', marginBottom: '12px' }}>
                      {currentFamily.name}
                      {householdMembers.length > 0 ? ` · ${householdMembers.length + 1} member${householdMembers.length > 0 ? 's' : ''}` : ''}
                    </h4>
                    {householdMembers.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                        {householdMembers.map(m => (
                          canManageFamily ? (
                            <button
                              key={m.id}
                              className="service-badge"
                              style={{ background: '#fff', border: '1px solid #e5e7eb', cursor: 'pointer' }}
                              onClick={() => setEditingMember(m)}
                            >
                              ✏️ {m.firstName} {m.lastName}
                            </button>
                          ) : (
                            <div key={m.id} className="service-badge" style={{ background: '#fff', border: '1px solid #eee' }}>
                              👤 {m.firstName} {m.lastName}
                            </div>
                          )
                        ))}
                      </div>
                    )}

                    {/* Family management actions for parents and admins */}
                    {canManageFamily && (
                      <div style={{ display: 'grid', gap: '12px' }}>
                        <button
                          className="btn-secondary"
                          style={{ justifyContent: 'center' }}
                          onClick={handleAddFamilyMember}
                        >
                          + Add Family Member
                        </button>

                        {generateInviteLink && (
                          <div style={{ background: '#f0fdf4', border: '1px dashed #86efac', borderRadius: '10px', padding: '14px' }}>
                            <label style={{ display: 'block', fontWeight: 800, marginBottom: '8px', fontSize: '12px', color: '#166534' }}>
                              INVITE FAMILY MEMBER
                            </label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input
                                className="input-field"
                                type="email"
                                placeholder="their@email.com"
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendInvite()}
                              />
                              <button
                                className="btn-primary"
                                style={{ whiteSpace: 'nowrap', background: '#16a34a' }}
                                onClick={handleSendInvite}
                                disabled={inviteSending}
                              >
                                {inviteSending ? '…' : 'Send Invite'}
                              </button>
                            </div>
                            <p style={{ fontSize: '11px', color: '#6b7280', margin: '6px 0 0 0' }}>
                              They'll receive a link to join this family in the directory.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* No family linked yet, but parent can create one */}
                {!currentFamily && canManageFamily && !isAdmin && (
                  <div className="card" style={{ background: '#f0f9ff', border: '1px dashed #bae6fd', padding: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 800, marginBottom: '8px', fontSize: '12px' }}>CREATE NEW FAMILY</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        className="input-field"
                        placeholder="e.g. The Smith Family"
                        value={newFamilyName}
                        onChange={e => setNewFamilyName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreateFamily()}
                      />
                      <button className="btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={handleCreateFamily}>+ Create</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ padding: '20px 32px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
            {isAdmin && !isNewMember ? (
              <button onClick={handleDelete} style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: '700', fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Delete
              </button>
            ) : <div />}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              {canEdit && <button className="btn-primary" onClick={handleSave}>Save Profile</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
