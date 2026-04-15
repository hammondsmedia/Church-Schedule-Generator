// src/components/tabs/ServicesTab.jsx
import React, { useMemo, useState, useEffect } from 'react';

const STORAGE_KEY = 'services_plans_v2';

const TEMPLATES = {
  WED_NIGHT: {
    id: 'WED_NIGHT',
    name: 'Wednesday Night',
    slots: [
      { id: 'ann_open',       label: 'Opening Announcements',  skill: 'Opening Announcements' },
      { id: 'opening_prayer', label: 'Opening Prayer',          skill: 'Prayers' },
      { id: 'song1',          label: 'Songs',                   skill: 'Songs' },
      { id: 'teacher',        label: 'Teacher',                 skill: 'Teacher' },
      { id: 'ann_close',      label: 'Closing Announcements',   skill: 'Closing Announcements' },
      { id: 'closing_prayer', label: 'Closing Prayer',          skill: 'Prayers' },
    ],
  },
  SUN_MORNING: {
    id: 'SUN_MORNING',
    name: 'Sunday Morning',
    slots: [
      { id: 'ann_open',       label: 'Opening Announcements',    skill: 'Opening Announcements' },
      { id: 'opening_prayer', label: 'Opening Prayer',            skill: 'Prayers' },
      { id: 'songs',          label: 'Songs',                     skill: 'Songs' },
      { id: 'communion',      label: 'Communion',                 skill: 'Communion' },
      { id: 'contribution',   label: 'Contribution/Collection',   skill: 'Contribution/Collection' },
      { id: 'teacher',        label: 'Teacher',                   skill: 'Teacher' },
      { id: 'ann_close',      label: 'Closing Announcements',     skill: 'Closing Announcements' },
      { id: 'closing_prayer', label: 'Closing Prayer',            skill: 'Prayers' },
    ],
  },
};

const WRITE_IN_PREFIX = 'visitor:';
const WRITE_IN_VALUE  = '__WRITE_IN__';

function todayISO() { return new Date().toISOString().split('T')[0]; }
function loadPlans() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function extractWriteIns(assignments) {
  const writeIns = {};
  Object.entries(assignments || {}).forEach(([slotId, value]) => {
    if (typeof value === 'string' && value.startsWith(WRITE_IN_PREFIX)) {
      writeIns[slotId] = value.slice(WRITE_IN_PREFIX.length);
    }
  });
  return writeIns;
}


export default function ServicesTab({ members = [], schedule = {} }) {
  const [templateId, setTemplateId] = useState('SUN_MORNING');
  const [date, setDate]             = useState(todayISO());
  const [plans, setPlans]           = useState(() => loadPlans());
  const [assignments, setAssignments] = useState({});
  const [writeIns, setWriteIns]       = useState({});

  const template    = useMemo(() => TEMPLATES[templateId] || TEMPLATES.SUN_MORNING, [templateId]);
  const planId      = useMemo(() => `${date}__${templateId}`, [date, templateId]);
  const currentPlan = useMemo(() => (plans || []).find(p => p.id === planId) || null, [plans, planId]);

  useEffect(() => {
    const saved = currentPlan?.assignments || {};
    setAssignments(saved);
    setWriteIns(extractWriteIns(saved));
  }, [planId, currentPlan]);

  const handleAssignmentChange = (slotId, value) => {
    if (value === WRITE_IN_VALUE) {
      setAssignments(prev => ({ ...prev, [slotId]: WRITE_IN_VALUE }));
      setWriteIns(prev => ({ ...prev, [slotId]: '' }));
    } else {
      setAssignments(prev => ({ ...prev, [slotId]: value }));
      setWriteIns(prev => { const next = { ...prev }; delete next[slotId]; return next; });
    }
  };

  const handleWriteInChange = (slotId, text) => {
    setWriteIns(prev => ({ ...prev, [slotId]: text }));
    setAssignments(prev => ({ ...prev, [slotId]: `${WRITE_IN_PREFIX}${text}` }));
  };

  const saveCurrentPlan = () => {
    const plan = { id: planId, date, templateId, templateName: template.name, assignments, updatedAt: new Date().toISOString() };
    const next = [plan, ...(plans || []).filter(p => p.id !== planId)].sort((a, b) => b.date.localeCompare(a.date));
    setPlans(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    alert('Saved!');
  };

  const assignedCount = Object.values(assignments).filter(v => v && v !== WRITE_IN_VALUE).length;
  const totalSlots = template.slots.length;

  return (
    <div>
      {/* Controls */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Template selector as pill tabs */}
          <div className="nav-tabs-container" style={{ flex: '0 0 auto' }}>
            {Object.values(TEMPLATES).map(t => (
              <button
                key={t.id}
                className={`nav-tab${templateId === t.id ? ' active' : ''}`}
                onClick={() => setTemplateId(t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>

          {/* Date picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 180px' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>Date</label>
            <input
              className="input-field"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ maxWidth: 180 }}
            />
          </div>

          {/* Progress + save */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
            <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}>
              <span style={{ color: assignedCount === totalSlots ? 'var(--success)' : 'var(--text)' }}>{assignedCount}</span>/{totalSlots} assigned
            </div>
            <button className="btn-primary" onClick={saveCurrentPlan}>
              Save Plan
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 14, height: 4, background: 'var(--border-light)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(assignedCount / totalSlots) * 100}%`,
            background: assignedCount === totalSlots
              ? 'var(--success)'
              : 'linear-gradient(135deg, var(--primary), var(--accent))',
            borderRadius: 99,
            transition: 'width 300ms ease',
          }} />
        </div>
      </div>

      {/* Slot cards */}
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {(template.slots || []).map((slot, index) => {
          const options = (members || []).filter(m => (m.serviceSkills || []).includes(slot.skill));
          const currentValue = assignments[slot.id] || '';
          const isWriteIn = currentValue === WRITE_IN_VALUE || currentValue.startsWith(WRITE_IN_PREFIX);
          const selectValue = isWriteIn ? WRITE_IN_VALUE : currentValue;
          const isAssigned = !!currentValue && currentValue !== WRITE_IN_VALUE;

          return (
            <div
              key={slot.id}
              style={{
                background: 'var(--surface)',
                border: `1.5px solid ${isAssigned ? 'var(--primary-light)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                transition: 'all 150ms ease',
                boxShadow: isAssigned ? '0 0 0 3px rgba(99,102,241,0.06)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>{slot.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>Slot {index + 1}</div>
                </div>
                {isAssigned && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
                )}
              </div>

              <select
                className="input-field"
                style={{ fontSize: 13 }}
                value={selectValue}
                onChange={e => handleAssignmentChange(slot.id, e.target.value)}
              >
                <option value="">— Unassigned —</option>
                {options.map(m => (
                  <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                ))}
                <option value={WRITE_IN_VALUE}>Write In / Visitor…</option>
              </select>

              {isWriteIn && (
                <input
                  className="input-field"
                  style={{ marginTop: 8, fontSize: 13 }}
                  placeholder="Enter visitor or guest name…"
                  value={writeIns[slot.id] ?? ''}
                  onChange={e => handleWriteInChange(slot.id, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
