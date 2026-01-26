// src/components/tabs/SpeakersTab.jsx
import React from 'react';

export default function SpeakersTab({ 
  speakers, 
  userRole, 
  setEditingSpeaker, 
  setShowAddSpeaker, 
  setSpeakers 
}) {
  const handleRemove = (id) => {
    if (window.confirm("Are you sure you want to remove this speaker?")) {
      setSpeakers(speakers.filter(sp => sp.id !== id));
    }
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
          <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 8px 0', color: '#1e3a5f' }}>{s.firstName} {s.lastName}</h3>
              <div style={{ marginBottom: '8px' }}>
                {s.priority > 0 && <span className="service-badge badge-priority">★ Priority {s.priority}</span>}
                {s.availability?.sundayMorning && <span className="service-badge" style={{ background: '#dbeafe', color: '#1e40af' }}>Sunday Morning</span>}
                {s.availability?.sundayEvening && <span className="service-badge" style={{ background: '#ede9fe', color: '#5b21b6' }}>Sunday Evening</span>}
                {s.availability?.wednesdayEvening && <span className="service-badge" style={{ background: '#d1fae5', color: '#065f46' }}>Wednesday Evening</span>}
                {s.availability?.communion && <span className="service-badge" style={{ background: '#fce7f3', color: '#be185d' }}>Communion</span>}
              </div>
              {s.repeatRules?.length > 0 && (
                <div style={{ fontSize: '13px', color: '#666' }}>
                  <strong>Repeat Rules:</strong> {s.repeatRules.map((r, i) => (
                    <span key={i} style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px', marginRight: '4px' }}>
                      {r.serviceType} ({r.pattern})
                    </span>
                  ))}
                </div>
              )}
            </div>
            {['owner', 'admin'].includes(userRole) && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn-secondary" 
                  style={{ padding: '8px 12px' }} 
                  onClick={() => { setEditingSpeaker({...s}); setShowAddSpeaker(true); }}
                >
                  Edit
                </button>
                <button 
                  style={{ padding: '8px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer' }} 
                  onClick={() => handleRemove(s.id)}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
