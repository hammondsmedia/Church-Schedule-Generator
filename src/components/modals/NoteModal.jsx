// src/components/modals/NoteModal.jsx
import React from 'react';

const SERVICE_LABELS = {
  sundayMorning:    { label: 'Sunday Morning',    color: '#1e40af', bg: '#dbeafe', emoji: '☀️' },
  communion:        { label: 'Communion',          color: '#be185d', bg: '#fce7f3', emoji: '🍞' },
  sundayEvening:    { label: 'Sunday Evening',     color: '#5b21b6', bg: '#ede9fe', emoji: '🌆' },
  wednesdayEvening: { label: 'Wednesday Evening',  color: '#065f46', bg: '#d1fae5', emoji: '🌙' },
};

export default function NoteModal({
  isOpen, onClose, editingNote, setEditingNote,
  getSpeakerName, handleSaveNote, handleDeleteSlot,
  userRole, setAssigningSlot
}) {
  if (!isOpen || !editingNote) return null;

  const isAdmin = ['owner', 'admin'].includes(userRole);
  const serviceInfo = SERVICE_LABELS[editingNote.serviceType] || { label: editingNote.serviceType, color: 'var(--text)', bg: 'var(--border-light)', emoji: '📋' };

  // Parse date for display
  let dateDisplay = editingNote.date || '';
  try {
    const d = new Date(editingNote.date + 'T12:00:00');
    dateDisplay = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  } catch {}

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 99,
                background: serviceInfo.bg, color: serviceInfo.color,
                fontSize: 12, fontWeight: 700,
              }}>
                {serviceInfo.emoji} {serviceInfo.label}
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}>
              {getSpeakerName(editingNote.speakerId)}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)' }}>
              📅 {dateDisplay}
            </p>
          </div>
          <button
            className="btn-ghost"
            onClick={onClose}
            style={{ padding: '4px 7px', borderRadius: 'var(--radius-sm)', lineHeight: 1, fontSize: 16, flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Note */}
        <div style={{ marginBottom: 20 }}>
          <label className="form-label">Lesson Topic / Note</label>
          <textarea
            className="input-field"
            style={{ height: 88, resize: 'none', lineHeight: 1.5 }}
            value={editingNote.note || ''}
            onChange={e => setEditingNote({ ...editingNote, note: e.target.value })}
            placeholder="Add a topic or note for this slot…"
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="btn-primary"
            style={{ justifyContent: 'center' }}
            onClick={() => handleSaveNote(editingNote.slotKey, editingNote.note)}
          >
            Save Changes
          </button>

          {isAdmin && (
            <>
              <button
                className="btn-secondary"
                style={{ justifyContent: 'center' }}
                onClick={() => {
                  setAssigningSlot({ slotKey: editingNote.slotKey, date: editingNote.date, serviceType: editingNote.serviceType });
                  onClose();
                }}
              >
                🔄 Swap Speaker
              </button>
              <button
                className="btn-danger"
                style={{ justifyContent: 'center' }}
                onClick={() => handleDeleteSlot(editingNote.slotKey)}
              >
                🗑️ Remove Assignment
              </button>
            </>
          )}

          <button
            className="btn-ghost"
            style={{ justifyContent: 'center', color: 'var(--text-3)' }}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
