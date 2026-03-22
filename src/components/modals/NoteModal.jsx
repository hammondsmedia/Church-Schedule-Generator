// src/components/modals/NoteModal.jsx
import React from 'react';

export default function NoteModal({
  isOpen, onClose, editingNote, setEditingNote, getSpeakerName, handleSaveNote, handleDeleteSlot, userRole, setAssigningSlot
}) {
  if (!isOpen || !editingNote) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h3 style={{ margin: '0 0 10px 0' }}>Manage Schedule Slot</h3>
        <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '14px' }}>
          Speaker: <strong>{getSpeakerName(editingNote.speakerId)}</strong>
        </p>
        
        <label style={{ fontSize: '12px', fontWeight: '800', display: 'block', marginBottom: '8px', color: '#999' }}>LESSON TOPIC / NOTE</label>
        <textarea 
          className="input-field" 
          style={{ height: '80px', resize: 'none', marginBottom: '20px' }} 
          value={editingNote.note || ''}
          onChange={(e) => setEditingNote({ ...editingNote, note: e.target.value })}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button className="btn-primary" onClick={() => handleSaveNote(editingNote.slotKey, editingNote.note)}>Save Changes</button>
          
          {['owner', 'admin'].includes(userRole) && (
            <>
              <button className="btn-secondary" onClick={() => { setAssigningSlot({ slotKey: editingNote.slotKey, date: editingNote.date, serviceType: editingNote.serviceType }); onClose(); }}>Swap Speaker</button>
              {/* RESTORED INDIVIDUAL DELETE BUTTON */}
              <button 
                onClick={() => handleDeleteSlot(editingNote.slotKey)} 
                style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🗑️ Remove Assignment
              </button>
            </>
          )}
          
          <button className="btn-secondary" style={{ border: 'none', color: '#666' }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
