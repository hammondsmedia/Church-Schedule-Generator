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

  const currentUserMember = (members || []).find(m => m.id === user?.uid);
  const currentUserCanEditFamily = ['parent', 'spouse'].includes(currentUserMember?.familyRole);
  const isSameFamilyMember = !isOwnProfile
    && currentUserMember?.familyId
    && currentUserMember.familyId === editingMember.familyId;
  const canEdit = isAdmin || isOwnProfile || (currentUserCanEditFamily && !!isSameFamilyMember);
  const isReadOnly = !canEdit;

  const canManageFamily = isAdmin
    || (isOwnProfile && ['parent', 'spouse'].includes(editingMember.familyRole))
    || (currentUserCanEditFamily && !!currentUserMember?.familyId);

  const isNewMember = !members.find(m => m.id === editingMember.id);

  const handleSave = async () => {
    if (!canEdit) return;
    const updatedMembers = isNewMember
      ? [...members, editingMember]
      : members.map(m => m.id === editingMember.id ? editingMember : m);
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
    if (!file || !storage) return alert('Storage not available.');
    setUploading(true);
    try {
      const ref = storage.ref(`profile_pics/${editingMember.id}`);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      setEditingMember({ ...editingMember, photoURL: url });
    } catch (err) { alert('Upload failed.'); }
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
      id: Date.now(), firstName: '', lastName: '',
      isSpeaker: false, serviceSkills: [], leadershipRole: '',
      familyId: editingMember.familyId,
      availability: {}, repeatRules: [], hasAccount: false,
    });
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteSending(true);
    try {
      await generateInviteLink(inviteEmail.trim(), 'member');
      setInviteEmail('');
    } catch (err) { alert('Failed to send invite.'); }
    setInviteSending(false);
  };

  const currentFamily = (families || []).find(f => f.id === editingMember.familyId);
  const householdMembers = (members || []).filter(m => m.familyId === editingMember.familyId && m.id !== editingMember.id);

  const skillOptions = [
    'Teacher', 'Prayers', 'Songs', 'Contribution/Collection',
    'Communion', 'Opening Announcements', 'Closing Announcements',
  ];

  const initials = `${editingMember.firstName?.charAt(0) || ''}${editingMember.lastName?.charAt(0) || ''}`.toUpperCase();
  const hiddenFields = editingMember.hiddenFields || {};

  const tabs = [
    { id: 'about',   label: 'Overview' },
    { id: 'speaker', label: 'Speaker Logic' },
    { id: 'service', label: 'Service Skills' },
    { id: 'family',  label: 'Family' },
  ];

  return (
    <div className="member-modal-overlay">
      <div className="card member-modal-wrap">

        {/* ── SIDEBAR ── */}
        <div className="member-modal-sidebar">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>
              Member Profile
            </h3>
            <button className="btn-ghost" onClick={onClose} style={{ padding: '4px 7px', borderRadius: 'var(--radius-sm)', fontSize: 16, lineHeight: 1 }}>✕</button>
          </div>

          {/* Photo */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {editingMember.photoURL ? (
                <img src={editingMember.photoURL} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border)' }} alt="Profile" />
              ) : (
                <div className="avatar-circle" style={{ width: 72, height: 72, fontSize: 24 }}>
                  {initials || '?'}
                </div>
              )}
              {canEdit && (
                <label htmlFor="member-photo-upload" style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'var(--text)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', border: '2px solid var(--surface)',
                  fontSize: 11,
                }}>
                  {uploading ? '…' : '+'}
                </label>
              )}
            </div>
            <input type="file" id="member-photo-upload" ref={photoInputRef} style={{ display: 'none' }} onChange={handlePhotoUpload} accept="image/*" />
          </div>

          {/* Fields */}
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              { label: 'First Name', field: 'firstName', type: 'text' },
              { label: 'Last Name',  field: 'lastName',  type: 'text' },
            ].map(({ label, field, type }) => (
              <div key={field}>
                <label className="form-label">{label}</label>
                <input className="input-field" type={type} disabled={isReadOnly} value={editingMember[field] || ''} onChange={e => updateField(field, e.target.value)} />
              </div>
            ))}

            <div>
              <label className="form-label">Leadership Role</label>
              <select className="input-field" disabled={!isAdmin} value={editingMember.leadershipRole || ''} onChange={e => updateField('leadershipRole', e.target.value)}>
                <option value="">None</option>
                <option value="Elder">Elder</option>
                <option value="Deacon">Deacon</option>
                <option value="Evangelist">Evangelist</option>
                <option value="Teacher">Teacher</option>
              </select>
            </div>

            <div>
              <label className="form-label">Gender</label>
              <select className="input-field" disabled={isReadOnly} value={editingMember.gender || ''} onChange={e => updateField('gender', e.target.value)}>
                <option value="">— Not Set —</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div>
              <label className="form-label">Birthday</label>
              <input className="input-field" type="date" disabled={isReadOnly} value={editingMember.birthday || ''} onChange={e => updateField('birthday', e.target.value)} />
            </div>

            <div>
              <label className="form-label">Wedding Anniversary</label>
              <input className="input-field" type="date" disabled={isReadOnly} value={editingMember.anniversary || ''} onChange={e => updateField('anniversary', e.target.value)} />
            </div>

            <div>
              <label className="form-label">Phone</label>
              <input className="input-field" disabled={isReadOnly} value={editingMember.phone || ''} onChange={e => updateField('phone', e.target.value)} />
            </div>

            <div>
              <label className="form-label">Email</label>
              <input className="input-field" type="email" disabled={isReadOnly} value={editingMember.email || ''} onChange={e => updateField('email', e.target.value)} />
            </div>

            <div>
              <label className="form-label">Address</label>
              <input className="input-field" disabled={isReadOnly} value={editingMember.address1 || ''} onChange={e => updateField('address1', e.target.value)} placeholder="Street address" />
            </div>
            <div>
              <input className="input-field" disabled={isReadOnly} value={editingMember.address2 || ''} onChange={e => updateField('address2', e.target.value)} placeholder="Apt, suite, unit…" />
            </div>
            <div>
              <input className="input-field" disabled={isReadOnly} value={editingMember.city || ''} onChange={e => updateField('city', e.target.value)} placeholder="City" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <select className="input-field" style={{ fontSize: 12 }} disabled={isReadOnly} value={editingMember.state || ''} onChange={e => updateField('state', e.target.value)}>
                  <option value="">State</option>
                  {['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','AS','GU','MP','PR','VI'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <input className="input-field" disabled={isReadOnly} value={editingMember.zip || ''} onChange={e => updateField('zip', e.target.value)} placeholder="Zip" />
              </div>
            </div>

            {/* Privacy controls */}
            {(isOwnProfile || isAdmin) && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <label className="form-label" style={{ marginBottom: 8 }}>Hide from Directory</label>
                <div style={{ display: 'grid', gap: 6 }}>
                  {[
                    { key: 'phone',   label: 'Phone number' },
                    { key: 'email',   label: 'Email address' },
                    { key: 'address', label: 'Home address' },
                  ].map(({ key, label }) => (
                    <label key={key} className="toggle-label" style={{ fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!hiddenFields[key]} onChange={() => toggleHiddenField(key)} />
                      {label}
                    </label>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '6px 0 0' }}>
                  Hidden fields are only visible to admins.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="member-modal-content">
          {/* Tabs */}
          <div className="member-modal-tabs">
            {tabs.map(t => (
              <button
                key={t.id}
                className={`member-modal-tab${activeTab === t.id ? ' active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="member-modal-body">

            {/* ── OVERVIEW ── */}
            {activeTab === 'about' && (
              <div>
                <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text)' }}>
                  {editingMember.firstName || 'New'} {editingMember.lastName || 'Member'}
                </h2>
                <p style={{ color: 'var(--text-3)', margin: 0, fontSize: 14 }}>
                  Use the sidebar to edit personal information. Switch tabs to configure scheduling, skills, and family.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
                  {editingMember.isSpeaker && (
                    <span className="chip chip-purple">Speaker</span>
                  )}
                  {editingMember.leadershipRole && (
                    <span className="chip chip-blue">{editingMember.leadershipRole}</span>
                  )}
                  {(editingMember.serviceSkills || []).map(skill => (
                    <span key={skill} className="chip chip-green">{skill}</span>
                  ))}
                  {currentFamily && (
                    <span className="chip chip-gray">{currentFamily.name}</span>
                  )}
                </div>

                {isReadOnly && (
                  <div className="info-box info" style={{ marginTop: 20 }}>
                    You're viewing this profile in read-only mode.
                  </div>
                )}
              </div>
            )}

            {/* ── SPEAKER LOGIC ── */}
            {activeTab === 'speaker' && (
              <div>
                {!isAdmin && (
                  <div className="info-box info" style={{ marginBottom: 20, fontSize: 13 }}>
                    Speaker scheduling settings are managed by your congregation's administrators.
                  </div>
                )}

                <label className="toggle-label" style={{ marginBottom: 20 }}>
                  <input type="checkbox" disabled={!isAdmin} checked={editingMember.isSpeaker || false} onChange={e => updateField('isSpeaker', e.target.checked)} />
                  <span style={{ fontWeight: 700 }}>Enable for Schedule Generator</span>
                </label>

                {editingMember.isSpeaker && (
                  <div style={{ display: 'grid', gap: 24 }}>
                    {/* Availability */}
                    <div>
                      <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 14, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                        Weekly Availability
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {Object.keys(serviceSettings).map(k => (
                          <label key={k} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 14px', borderRadius: 'var(--radius-full)',
                            border: `1.5px solid ${editingMember.availability?.[k] ? 'var(--primary-light)' : 'var(--border)'}`,
                            background: editingMember.availability?.[k] ? 'var(--primary-xlight)' : 'var(--surface-2)',
                            cursor: !isAdmin ? 'default' : 'pointer',
                            fontSize: 13, fontWeight: 600,
                            color: editingMember.availability?.[k] ? 'var(--primary-dark)' : 'var(--text-2)',
                            transition: 'all 150ms ease',
                          }}>
                            <input
                              type="checkbox" disabled={!isAdmin}
                              checked={editingMember.availability?.[k] || false}
                              onChange={e => {
                                const avail = editingMember.availability || {};
                                updateField('availability', { ...avail, [k]: e.target.checked });
                              }}
                            />
                            {serviceSettings[k].label}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Repeat rules */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                          Repeat Rules
                        </p>
                        {isAdmin && (
                          <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }} onClick={addRepeatRule}>
                            + Add Rule
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'grid', gap: 10 }}>
                        {(editingMember.repeatRules || []).length === 0 && (
                          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>No rules set — speaker is available every applicable week.</p>
                        )}
                        {(editingMember.repeatRules || []).map((rule, idx) => (
                          <div key={idx} style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            <select className="input-field" disabled={!isAdmin} style={{ flex: '1 1 120px', fontSize: 13 }} value={rule.serviceType} onChange={e => updateRule(idx, 'serviceType', e.target.value)}>
                              {Object.keys(serviceSettings).map(k => <option key={k} value={k}>{serviceSettings[k].label}</option>)}
                            </select>
                            <select className="input-field" disabled={!isAdmin} style={{ flex: '1 1 140px', fontSize: 13 }} value={rule.pattern} onChange={e => updateRule(idx, 'pattern', e.target.value)}>
                              <option value="everyOther">Every Other Week</option>
                              <option value="nthWeek">Specific Sunday</option>
                            </select>
                            {rule.pattern === 'everyOther' ? (
                              <select className="input-field" disabled={!isAdmin} style={{ flex: '1 1 100px', fontSize: 13 }} value={rule.startWeek} onChange={e => updateRule(idx, 'startWeek', e.target.value)}>
                                <option value="odd">Odd Weeks</option>
                                <option value="even">Even Weeks</option>
                              </select>
                            ) : (
                              <select className="input-field" disabled={!isAdmin} style={{ flex: '1 1 100px', fontSize: 13 }} value={rule.nthWeek} onChange={e => updateRule(idx, 'nthWeek', parseInt(e.target.value))}>
                                <option value="1">1st Sunday</option>
                                <option value="2">2nd Sunday</option>
                                <option value="3">3rd Sunday</option>
                                <option value="4">4th Sunday</option>
                                <option value="5">5th Sunday</option>
                              </select>
                            )}
                            {isAdmin && (
                              <button onClick={() => removeRule(idx)} className="btn-ghost" style={{ color: 'var(--error)', padding: '4px 8px', fontSize: 16 }}>
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── SERVICE SKILLS ── */}
            {activeTab === 'service' && (
              <div>
                <p style={{ color: 'var(--text-3)', fontSize: 14, margin: '0 0 16px', lineHeight: 1.6 }}>
                  Select categories this member can fill in the Service Plans tool.
                </p>
                {!isAdmin && (
                  <div className="info-box info" style={{ marginBottom: 16, fontSize: 13 }}>
                    Service skill assignments are managed by your congregation's administrators.
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {skillOptions.map(skill => {
                    const isChecked = (editingMember.serviceSkills || []).includes(skill);
                    return (
                      <label key={skill} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '9px 16px', borderRadius: 'var(--radius-full)',
                        border: `1.5px solid ${isChecked ? 'var(--success-border)' : 'var(--border)'}`,
                        background: isChecked ? 'var(--success-bg)' : 'var(--surface-2)',
                        cursor: !isAdmin ? 'default' : 'pointer',
                        fontSize: 13, fontWeight: 600,
                        color: isChecked ? '#065f46' : 'var(--text-2)',
                        transition: 'all 150ms ease',
                      }}>
                        <input
                          type="checkbox" disabled={!isAdmin}
                          checked={isChecked}
                          onChange={e => {
                            const skills = editingMember.serviceSkills || [];
                            updateField('serviceSkills', e.target.checked ? [...skills, skill] : skills.filter(s => s !== skill));
                          }}
                        />
                        {skill}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── FAMILY ── */}
            {activeTab === 'family' && (
              <div style={{ display: 'grid', gap: 16 }}>
                {/* Family role */}
                <div className="card-flat">
                  <label className="form-label" style={{ marginBottom: 8 }}>Family Role</label>
                  <select className="input-field" disabled={isReadOnly} value={editingMember.familyRole || ''} onChange={e => updateField('familyRole', e.target.value)}>
                    <option value="">— Not Set —</option>
                    <option value="parent">Parent</option>
                    <option value="spouse">Spouse</option>
                    <option value="child">Child</option>
                    <option value="independent">Independent</option>
                  </select>
                  {editingMember.familyRole && (
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '6px 0 0' }}>
                      {editingMember.familyRole === 'parent' && 'Parents can edit their own profile and any family member\'s profile.'}
                      {editingMember.familyRole === 'spouse' && 'Spouses can edit their own profile and their partner\'s profile.'}
                      {editingMember.familyRole === 'child' && 'Children can only edit their own profile.'}
                      {editingMember.familyRole === 'independent' && 'Independent members manage their own profile.'}
                    </p>
                  )}
                </div>

                {/* Household link */}
                <div className="card-flat">
                  <label className="form-label" style={{ marginBottom: 8 }}>Household Link</label>
                  <select className="input-field" disabled={isReadOnly} value={editingMember.familyId || ''} onChange={e => updateField('familyId', e.target.value)}>
                    <option value="">— Not Linked —</option>
                    {(families || []).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>

                {/* Create new family (admins) */}
                {isAdmin && (
                  <div className="card-flat" style={{ background: 'var(--primary-xlight)', border: '1px dashed var(--primary-light)' }}>
                    <label className="form-label" style={{ marginBottom: 8, color: 'var(--primary-dark)' }}>Create New Family</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input
                        className="input-field"
                        placeholder="e.g. The Smith Family"
                        value={newFamilyName}
                        onChange={e => setNewFamilyName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreateFamily()}
                      />
                      <button className="btn-primary" style={{ flexShrink: 0 }} onClick={handleCreateFamily}>+ Create</button>
                    </div>
                  </div>
                )}

                {/* Household members */}
                {currentFamily && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                        {currentFamily.name}
                      </h4>
                      <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>
                        {householdMembers.length + 1} members
                      </span>
                    </div>
                    {householdMembers.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                        {householdMembers.map(m => (
                          canManageFamily ? (
                            <button key={m.id} className="btn-secondary" style={{ fontSize: 13, padding: '6px 12px', borderRadius: 'var(--radius-full)' }} onClick={() => setEditingMember(m)}>
                              {m.firstName} {m.lastName}
                            </button>
                          ) : (
                            <span key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-full)', background: 'var(--border-light)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
                              {m.firstName} {m.lastName}
                            </span>
                          )
                        ))}
                      </div>
                    )}

                    {canManageFamily && (
                      <div style={{ display: 'grid', gap: 10 }}>
                        <button className="btn-secondary" style={{ justifyContent: 'center' }} onClick={handleAddFamilyMember}>
                          + Add Family Member
                        </button>
                        {generateInviteLink && (
                          <div style={{ background: 'var(--success-bg)', border: '1px dashed var(--success-border)', borderRadius: 'var(--radius-md)', padding: 14 }}>
                            <label className="form-label" style={{ color: '#065f46', marginBottom: 8 }}>Invite Family Member</label>
                            <div style={{ display: 'flex', gap: 8 }}>
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
                                style={{ whiteSpace: 'nowrap', background: '#16a34a', boxShadow: '0 4px 14px rgba(22,163,74,0.25)' }}
                                onClick={handleSendInvite}
                                disabled={inviteSending}
                              >
                                {inviteSending ? '…' : 'Send Invite'}
                              </button>
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '6px 0 0' }}>
                              They'll receive a link to join this family in the directory.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* No family yet — parent can create */}
                {!currentFamily && canManageFamily && !isAdmin && (
                  <div className="card-flat" style={{ background: 'var(--primary-xlight)', border: '1px dashed var(--primary-light)' }}>
                    <label className="form-label" style={{ marginBottom: 8, color: 'var(--primary-dark)' }}>Create New Family</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input
                        className="input-field"
                        placeholder="e.g. The Smith Family"
                        value={newFamilyName}
                        onChange={e => setNewFamilyName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreateFamily()}
                      />
                      <button className="btn-primary" style={{ flexShrink: 0 }} onClick={handleCreateFamily}>+ Create</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="member-modal-footer">
            {isAdmin && !isNewMember ? (
              <button
                onClick={handleDelete}
                className="btn-ghost"
                style={{ color: 'var(--error)', fontWeight: 700, fontSize: 14 }}
              >
                Delete Member
              </button>
            ) : <div />}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              {canEdit && <button className="btn-primary" onClick={handleSave}>Save Profile</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
