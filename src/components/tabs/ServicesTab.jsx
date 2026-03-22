// src/components/tabs/ServicesTab.jsx
import React, { useMemo, useState, useEffect } from "react";

const STORAGE_KEY = "services_plans_v2";

const TEMPLATES = {
  WED_NIGHT: {
    id: "WED_NIGHT",
    name: "Wednesday Night",
    slots: [
      { id: "ann_open", label: "Opening Announcements", skill: "Opening Announcements" },
      { id: "opening_prayer", label: "Opening Prayer", skill: "Prayers" },
      { id: "song1", label: "Songs", skill: "Songs" },
      { id: "teacher", label: "Teacher", skill: "Teacher" },
      { id: "ann_close", label: "Closing Announcements", skill: "Closing Announcements" },
      { id: "closing_prayer", label: "Closing Prayer", skill: "Prayers" },
    ],
  },
  SUN_MORNING: {
    id: "SUN_MORNING",
    name: "Sunday Morning",
    slots: [
      { id: "ann_open", label: "Opening Announcements", skill: "Opening Announcements" },
      { id: "opening_prayer", label: "Opening Prayer", skill: "Prayers" },
      { id: "songs", label: "Songs", skill: "Songs" },
      { id: "communion", label: "Communion", skill: "Communion" },
      { id: "contribution", label: "Contribution/Collection", skill: "Contribution/Collection" },
      { id: "teacher", label: "Teacher", skill: "Teacher" },
      { id: "ann_close", label: "Closing Announcements", skill: "Closing Announcements" },
      { id: "closing_prayer", label: "Closing Prayer", skill: "Prayers" },
    ],
  }
};

function todayISO() { return new Date().toISOString().split('T')[0]; }

function loadPlans() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}

export default function ServicesTab({ members = [], schedule = {} }) {
  const [templateId, setTemplateId] = useState("SUN_MORNING");
  const [date, setDate] = useState(todayISO());
  const [plans, setPlans] = useState(() => loadPlans());
  const [assignments, setAssignments] = useState({});

  const template = useMemo(() => TEMPLATES[templateId] || TEMPLATES.SUN_MORNING, [templateId]);
  const planId = useMemo(() => `${date}__${templateId}`, [date, templateId]);
  const currentPlan = useMemo(() => (plans || []).find((p) => p.id === planId) || null, [plans, planId]);

  useEffect(() => { setAssignments(currentPlan?.assignments || {}); }, [planId, currentPlan]);

  const saveCurrentPlan = () => {
    const plan = { id: planId, date, templateId, templateName: template.name, assignments, updatedAt: new Date().toISOString() };
    const next = [plan, ...(plans || []).filter(p => p.id !== planId)].sort((a, b) => b.date.localeCompare(a.date));
    setPlans(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    alert("Saved!");
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <select className="input-field" style={{flex: 1}} value={templateId} onChange={e => setTemplateId(e.target.value)}>
          <option value="SUN_MORNING">Sunday Morning</option>
          <option value="WED_NIGHT">Wednesday Night</option>
        </select>
        <input className="input-field" style={{flex: 1}} type="date" value={date} onChange={e => setDate(e.target.value)} />
        <button className="btn-primary" onClick={saveCurrentPlan}>💾 Save Plan</button>
      </div>

      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
        {(template.slots || []).map(slot => {
          const options = (members || []).filter(m => (m.serviceSkills || []).includes(slot.skill));
          return (
            <div key={slot.id} className="card" style={{ padding: '16px', background: '#fbfbfc', border: '1px solid #eee' }}>
              <div style={{ fontWeight: 700, marginBottom: '8px', color: '#1e3a5f' }}>{slot.label}</div>
              <select className="input-field" value={assignments[slot.id] || ""} onChange={e => setAssignments({...assignments, [slot.id]: e.target.value})}>
                <option value="">— Unassigned —</option>
                {options.map(m => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
