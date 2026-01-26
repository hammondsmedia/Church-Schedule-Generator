// src/components/modals/NoteModal.jsx
import React from 'react';

export default function NoteModal({
  isOpen,
  onClose,
  editingNote,
  setEditingNote,
  getSpeakerName,
  handleSaveNote,
  userRole,
  setAssigningSlot
}) {
  if (!isOpen || !editingNote) return null;

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      background: 'rgba(0,0,0,0.5)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 1000, 
      padding: '20px' 
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h3 style={{ margin: '0 0 10px 0' }}>Manage Schedule Slot</h3>
        <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '14px' }}>
          Speaker: <strong>{getSpeakerName(editingNote.speakerId)}</strong>
        </p>
        
        <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
          Lesson Topic / Note
        </label>
        <textarea 
          className="input-field" 
          style={{ height: '100px', resize: 'none', marginBottom: '20px' }} 
          placeholder="Enter lesson topic or additional details..."
          value={editingNote.note || ''}
          onChange={(e) => setEditingNote({ ...editingNote, note: e.target.value })}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            className="btn-primary" 
            onClick={() => handleSaveNote(editingNote.slotKey, editingNote.note)}
          >
            Save Note
          </button>
          
          {/* Workflow Toggle: Re-open assignment modal if user needs to swap speakers */}
          {['owner', 'admin', 'standard'].includes(userRole) && (
            <button 
              className="btn-secondary" 
              onClick={() => { 
                setAssigningSlot({ 
                  slotKey: editingNote.slotKey, 
                  date: editingNote.date, 
                  serviceType: editingNote.serviceType 
                }); 
                onClose(); 
              }}
            >
              Change Speaker
            </button>
          )}
          
          <button 
            className="btn-secondary" 
            style={{ border: 'none', color: '#666' }} 
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
