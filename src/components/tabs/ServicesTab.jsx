// src/components/tabs/ServicesTab.jsx
import React, { useMemo, useState, useEffect } from "react";

const STORAGE_KEY = "services_plans_v2";

const TEMPLATES = {
  WED_NIGHT: {
    id: "WED_NIGHT",
    name: "Wednesday Night",
    slots: [
      { id: "opening", label: "Opening announcements and Prayer", skill: "Opening Prayer" },
      { id: "song1", label: "1st Song", skill: "Song Leading" },
      { id: "song2", label: "2nd Song", skill: "Song Leading" },
      { id: "song3", label: "3rd Song", skill: "Song Leading" },
      { id: "song4", label: "4th Song", skill: "Song Leading" },
      { id: "main_prayer", label: "Main Prayer", skill: "Opening Prayer" },
      { id: "song_after_prayer", label: "Song after Prayer", skill: "Song Leading" },
      { id: "teacher", label: "Teacher (auto from Calendar)", skill: "Teacher" },
      { id: "invitation", label: "Invitation Song", skill: "Song Leading" },
      { id: "announcements2", label: "Announcements", skill: "Usher" },
      { id: "closing_song", label: "Closing Song", skill: "Song Leading" },
      { id: "closing_prayer", label: "Closing Prayer", skill: "Closing Prayer" },
    ],
  },
  SUN_MORNING: {
    id: "SUN_MORNING",
    name: "Sunday Morning",
    slots: [
      { id: "opening", label: "Opening Announcements and Prayer", skill: "Opening Prayer" },
      { id: "song1", label: "1st Song", skill: "Song Leading" },
      { id: "song2", label: "2nd Song", skill: "Song Leading" },
      { id: "song3", label: "3rd Song", skill: "Song Leading" },
      { id: "main_prayer", label: "Main Prayer", skill: "Opening Prayer" },
      { id: "song_before_communion", label: "Song before Communion", skill: "Song Leading" },
      { id: "communion", label: "Communion (auto from Calendar)", skill: "Table" },
      { id: "song_after_communion", label: "Song after Communion", skill: "Song Leading" },
      { id: "teacher", label: "Teacher (auto from Calendar)", skill: "Teacher" },
      { id: "invitation", label: "Invitation Song", skill: "Song Leading" },
      { id: "contribution", label: "Contribution", skill: "Usher" },
      { id: "announcements2", label: "Announcements", skill: "Usher" },
      { id: "closing_song", label: "Closing Song", skill: "Song Leading" },
      { id: "closing_prayer", label: "Closing Prayer", skill: "Closing Prayer" },
    ],
  }
};

function todayISO() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function loadPlans() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export default function ServicesTab({ members = [], schedule = {} }) {
  const [templateId, setTemplateId] = useState("WED_NIGHT");
  const [date, setDate] = useState(todayISO());
  const [plans, setPlans] = useState(() => loadPlans());
  const [assignments, setAssignments] = useState({});

  const template = useMemo(() => TEMPLATES[templateId] || TEMPLATES.WED_NIGHT, [templateId]);
  const planId = useMemo(() => `${date}__${templateId}`, [date, templateId]);
  const currentPlan = useMemo(() => (plans || []).find((p) => p.id === planId) || null, [plans, planId]);

  // Update assignments when the date or template changes
  useEffect(() => {
    setAssignments(currentPlan?.assignments || {});
  }, [planId, currentPlan]);

  const setSlot = (slotId, memberId) => setAssignments(prev => ({ ...prev, [slotId]: memberId }));

  const saveCurrentPlan = () => {
    const plan = { id: planId, date, templateId, templateName: template.name, assignments, updatedAt: new Date().toISOString() };
    const next = [plan, ...(plans || []).filter(p => p.id !== planId)].sort((a, b) => b.date.localeCompare(a.date));
    setPlans(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    alert("Plan saved successfully!");
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <select className="input-field" style={{flex: 1}} value={templateId} onChange={e => setTemplateId(e.target.value)}>
          <option value="WED_NIGHT">Wednesday Night</option>
          <option value="SUN_MORNING">Sunday Morning</option>
        </select>
        <input className="input-field" style={{flex: 1}} type="date" value={date} onChange={e => setDate(e.target.value)} />
        <button className="btn-primary" onClick={saveCurrentPlan}>💾 Save Plan</button>
      </div>

      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
        {(template.slots || []).map(slot => {
          // SAFETY FIX: Guard against missing serviceSkills array
          const options = (members || []).filter(m => 
            (m.serviceSkills && m.serviceSkills.includes(slot.skill)) || 
            m.leadershipRole === slot.skill
          );
          
          return (
            <div key={slot.id} className="card" style={{ padding: '16px', background: '#fbfbfc', border: '1px solid #eee' }}>
              <div style={{ fontWeight: 700, marginBottom: '8px', color: '#1e3a5f' }}>{slot.label}</div>
              <select 
                className="input-field" 
                value={assignments[slot.id] || ""} 
                onChange={e => setSlot(slot.id, e.target.value)}
              >
                <option value="">— Unassigned —</option>
                {options.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.firstName || 'Unknown'} {m.lastName || ''}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
