// src/components/modals/SpeakerModal.jsx
import React from 'react';

export default function SpeakerModal({ 
  isOpen, 
  onClose, 
  editingSpeaker, 
  setEditingSpeaker, 
  speakers, 
  setSpeakers 
}) {
  if (!isOpen || !editingSpeaker) return null;

  const handleSave = () => {
    if (speakers.find(s => s.id === editingSpeaker.id)) {
      setSpeakers(speakers.map(s => s.id === editingSpeaker.id ? editingSpeaker : s));
    } else {
      setSpeakers([...speakers, editingSpeaker]);
    }
    onClose();
  };

  const addRepeatRule = () => {
    const newRule = { serviceType: '', pattern: 'everyOther', startWeek: 'odd', nthWeek: 1 };
    setEditingSpeaker({ 
      ...editingSpeaker, 
      repeatRules: [...(editingSpeaker.repeatRules || []), newRule] 
    });
  };

  const removeRepeatRule = (index) => {
    setEditingSpeaker({ 
      ...editingSpeaker, 
      repeatRules: editingSpeaker.repeatRules.filter((_, idx) => idx !== index) 
    });
  };

  const updateRule = (index, field, value) => {
    const nr = [...editingSpeaker.repeatRules];
    nr[index][field] = value;
    setEditingSpeaker({ ...editingSpeaker, repeatRules: nr });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3>{speakers.find(s => s.id === editingSpeaker.id) ? 'Edit' : 'Add'} Speaker</h3>
        
        {/* NAMES */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <input className="input-field" style={{flex: '1 1 180px'}} placeholder="First Name" value={editingSpeaker.firstName} onChange={e => setEditingSpeaker({ ...editingSpeaker, firstName: e.target.value })} />
          <input className="input-field" style={{flex: '1 1 180px'}} placeholder="Last Name" value={editingSpeaker.lastName} onChange={e => setEditingSpeaker({ ...editingSpeaker, lastName: e.target.value })} />
        </div>

        {/* PRIORITY */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600' }}>Rotation Priority</label>
          <select className="input-field" value={editingSpeaker.priority || 0} onChange={e => setEditingSpeaker({ ...editingSpeaker, priority: parseInt(e.target.value) })}>
            <option value={0}>None (Rotated)</option>
            <option value={1}>Priority 1 (High)</option>
            <option value={2}>Priority 2 (Medium)</option>
          </select>
        </div>

        {/* AVAILABILITY */}
        <div style={{ marginBottom: '12px' }}>
          <strong style={{ fontSize: '13px' }}>Availability</strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', marginTop: '8px' }}>
            <label><input type="checkbox" checked={editingSpeaker.availability.sundayMorning} onChange={e => setEditingSpeaker({ ...editingSpeaker, availability: { ...editingSpeaker.availability, sundayMorning: e.target.checked } })} /> Sun Morning</label>
            <label><input type="checkbox" checked={editingSpeaker.availability.sundayEvening} onChange={e => setEditingSpeaker({ ...editingSpeaker, availability: { ...editingSpeaker.availability, sundayEvening: e.target.checked } })} /> Sun Evening</label>
            <label><input type="checkbox" checked={editingSpeaker.availability.wednesdayEvening} onChange={e => setEditingSpeaker({ ...editingSpeaker, availability: { ...editingSpeaker.availability, wednesdayEvening: e.target.checked } })} /> Wednesday</label>
            <label><input type="checkbox" checked={editingSpeaker.availability.communion} onChange={e => setEditingSpeaker({ ...editingSpeaker, availability: { ...editingSpeaker.availability, communion: e.target.checked } })} /> Communion</label>
          </div>
        </div>

        {/* REPEAT RULES */}
        <div style={{ marginBottom: '16px' }}>
          <strong style={{ fontSize: '13px' }}>Repeat Speaking Rules</strong>
          {(editingSpeaker.repeatRules || []).map((r, i) => (
            <div key={i} style={{ background: '#f8f6f3', padding: '10px', borderRadius: '8px', marginTop: '8px', border: '1px solid #eee' }}>
              <select className="input-field" value={r.serviceType} onChange={e => updateRule(i, 'serviceType', e.target.value)}>
                <option value="">Select Service...</option>
                <option value="sundayMorning">Sun AM</option>
                <option value="sundayEvening">Sun PM</option>
                <option value="wednesdayEvening">Wed</option>
              </select>
              <select className="input-field" style={{ marginTop: '4px' }} value={r.pattern} onChange={e => updateRule(i, 'pattern', e.target.value)}>
                <option value="everyOther">Every Other Week</option>
                <option value="nthWeek">Specific Week of Month</option>
              </select>
              {r.pattern === 'everyOther' ? (
                <select className="input-field" style={{ marginTop: '4px' }} value={r.startWeek} onChange={e => updateRule(i, 'startWeek', e.target.value)}>
                  <option value="odd">1st, 3rd, 5th weeks</option>
                  <option value="even">2nd, 4th weeks</option>
                </select>
              ) : (
                <select className="input-field" style={{ marginTop: '4px' }} value={r.nthWeek} onChange={e => updateRule(i, 'nthWeek', parseInt(e.target.value))}>
                  <option value={1}>1st Week</option>
                  <option value={2}>2nd Week</option>
                  <option value={3}>3rd Week</option>
                  <option value={4}>4th Week</option>
                  <option value={5}>5th Week</option>
                </select>
              )}
              <button onClick={() => removeRepeatRule(i)} style={{ width: '100%', marginTop: '4px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Remove Rule</button>
            </div>
          ))}
          <button className="btn-secondary" style={{ width: '100%', marginTop: '8px', padding: '8px', fontSize: '13px' }} onClick={addRepeatRule}>+ Add Repeat Rule</button>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Speaker</button>
        </div>
      </div>
    </div>
  );
}
