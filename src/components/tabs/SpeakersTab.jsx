// src/components/tabs/SpeakersTab.jsx
import React from 'react';

export default function SpeakersTab({ 
  speakers, 
  userRole, 
  setEditingSpeaker, 
  setShowAddSpeaker, 
  setSpeakers,
  serviceSettings 
}) {
  const handleRemove = (id) => {
    if (window.confirm("Are you sure you want to remove this speaker?")) {
      setSpeakers(speakers.filter(sp => sp.id !== id));
    }
  };

  const getTimeLabel = (type) => {
    const setting = serviceSettings[type];
    return setting && setting.enabled && setting.time ? ` (${setting.time})` : '';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: '#1e3a5f', margin: 0 }}>Manage Speakers ({speakers.length})</h2>
        {['owner', 'admin'].includes(userRole) && (
          <button 
            className="btn-primary" 
            onClick={() => { 
              setEditingSpeaker({ id: Date.now(), firstName: '', lastName: '', availability: {}, blockOffDates: [], repeatRules: [] }); 
              setShowAddSpeaker(true); 
            }}
          >
            + Add Speaker
          </button>
        )}
      </div>

      {speakers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#666' }}>
          No speakers added yet. Click "+ Add Speaker" to get started.
        </div>
      ) : (
        speakers.map(s => (
          <div key={s.id} className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#1e3a5f' }}>{s.firstName} {s.lastName}</h3>
                {s.priority > 0 && <span className="service-badge badge-priority" style={{ marginTop: '4px' }}>★ Priority {s.priority}</span>}
              </div>
              
              {['owner', 'admin'].includes(userRole) && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* Edit Indicator: Visual cue that info can be modified */}
                  <button 
                    className="btn-secondary" 
                    style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }} 
                    onClick={() => { setEditingSpeaker({...s}); setShowAddSpeaker(true); }}
                  >
                    ✏️ Edit Info
                  </button>
                  <button 
                    style={{ padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }} 
                    onClick={() => handleRemove(s.id)}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div>
              <strong style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Availability & Times</strong>
              <div style={{ marginBottom: '12px' }}>
                {s.availability?.sundayMorning && (
                  <span className="service-badge" style={{ background: '#dbeafe', color: '#1e40af' }}>
                    Sunday Morning{getTimeLabel('sundayMorning')}
                  </span>
                )}
                {s.availability?.sundayEvening && (
                  <span className="service-badge" style={{ background: '#ede9fe', color: '#5b21b6' }}>
                    Sunday Evening{getTimeLabel('sundayEvening')}
                  </span>
                )}
                {s.availability?.wednesdayEvening && (
                  <span className="service-badge" style={{ background: '#d1fae5', color: '#065f46' }}>
                    Wednesday Evening{getTimeLabel('wednesdayEvening')}
                  </span>
                )}
                {s.availability?.communion && (
                  <span className="service-badge" style={{ background: '#fce7f3', color: '#be185d' }}>
                    Communion
                  </span>
                )}
              </div>
              
              {s.repeatRules?.length > 0 && (
                <div style={{ fontSize: '13px', color: '#666', background: '#f9fafb', padding: '8px', borderRadius: '8px' }}>
                  <strong>Repeat Rules:</strong> {s.repeatRules.map((r, i) => (
                    <span key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '2px 8px', borderRadius: '4px', marginRight: '4px', display: 'inline-block', marginTop: '2px' }}>
                      {r.serviceType} ({r.pattern})
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
