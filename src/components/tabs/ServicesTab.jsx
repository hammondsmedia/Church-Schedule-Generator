import React, { useMemo, useState } from "react";

/**
 * ServicesTab
 * - Uses existing "speakers" list from App.jsx (same people you already manage)
 * - Lets you assign people to Wednesday/Sunday service roles
 * - Saves plans in localStorage per date + service type (no Firebase changes yet)
 *
 * Later we can store it in Firestore, but this gets you working fast.
 */

const STORAGE_KEY = "services_plans_v1";

const TEMPLATES = {
  WED_NIGHT: {
    id: "WED_NIGHT",
    name: "Wednesday Night",
    slots: [
      { id: "opening", label: "Opening announcements and Prayer" },
      { id: "song1", label: "1st Song" },
      { id: "song2", label: "2nd Song" },
      { id: "song3", label: "3rd Song" },
      { id: "song4", label: "4th Song" },
      { id: "main_prayer", label: "Main Prayer" },
      { id: "song_after_prayer", label: "Song after Prayer" },
      { id: "teacher", label: "Teacher (choose from Speakers)" },
      { id: "invitation", label: "Invitation Song" },
      { id: "announcements2", label: "Announcements" },
      { id: "closing_song", label: "Closing Song" },
      { id: "closing_prayer", label: "Closing Prayer" },
    ],
  },
  SUN_MORNING: {
    id: "SUN_MORNING",
    name: "Sunday Morning",
    slots: [
      { id: "opening", label: "Opening Announcements and Prayer" },
      { id: "song1", label: "1st Song" },
      { id: "song2", label: "2nd Song" },
      { id: "song3", label: "3rd Song" },
      { id: "main_prayer", label: "Main Prayer" },
      { id: "song_before_communion", label: "Song before Communion" },
      { id: "communion", label: "Communion (choose from Speakers)" },
      { id: "song_after_communion", label: "Song after Communion" },
      { id: "teacher", label: "Teacher (choose from Speakers)" },
      { id: "invitation", label: "Invitation Song" },
      { id: "contribution", label: "Contribution" },
      { id: "announcements2", label: "Announcements" },
      { id: "closing_song", label: "Closing Song" },
      { id: "closing_prayer", label: "Closing Prayer" },
    ],
  },
  SUN_AFTERNOON: {
    id: "SUN_AFTERNOON",
    name: "Sunday Afternoon",
    // same as Wed Night
    slots: [],
  },
};

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function loadPlans() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePlans(plans) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

export default function ServicesTab({ servicePeople, setServicePeople, speakers }) {
  const speakerOptions = useMemo(() => {
    return (speakers || [])
      .map((s) => ({
        id: s.id,
        name: `${s.firstName || ""} ${s.lastName || ""}`.trim(),
      }))
      .filter((x) => x.name.length > 0);
  }, [speakers]);

    // --- Service People (managed in this tab) ---

  const servicePeopleOptions = useMemo(() => {
    return (servicePeople || [])
      .map((p) => ({
        id: p.id,
        name: `${p.firstName || ""} ${p.lastName || ""}`.trim(),
      }))
      .filter((x) => x.name.length > 0);
  }, [servicePeople]);

function addServicePerson() {
  const fullName = prompt("Enter full name (First Last):");
  if (!fullName) return;

  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return;

  const firstName = parts.shift();
  const lastName = parts.join(" ");

  const person = {
    id: Date.now(),
    firstName,
    lastName,
  };

  setServicePeople([...(servicePeople || []), person]);
}


  function removeServicePerson(id) {
    if (!confirm("Remove this person from Service People?")) return;
    setServicePeople((servicePeople || []).filter((p) => p.id !== id));
  }

  const [templateId, setTemplateId] = useState("WED_NIGHT");
  const [date, setDate] = useState(todayISO());
  const [plans, setPlans] = useState(() => loadPlans());

  const template = useMemo(() => {
    if (templateId === "SUN_AFTERNOON") return TEMPLATES.WED_NIGHT;
    return TEMPLATES[templateId];
  }, [templateId]);

  const planId = useMemo(() => `${date}__${templateId}`, [date, templateId]);

  const currentPlan = useMemo(() => {
    return plans.find((p) => p.id === planId) || null;
  }, [plans, planId]);

  const [assignments, setAssignments] = useState(() => currentPlan?.assignments || {});

  // Keep assignments updated when user switches date/template
  React.useEffect(() => {
    setAssignments(currentPlan?.assignments || {});
  }, [planId]);

    function isSpeakerSlot(slotId) {
    return slotId === "teacher" || slotId === "communion";
  }

  function setSlot(slotId, speakerId) {
    setAssignments((prev) => ({ ...prev, [slotId]: speakerId }));
  }

  function clearSlot(slotId) {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  }

function speakerNameById(id) {
  const foundSpeaker = speakerOptions.find((x) => String(x.id) === String(id));
  if (foundSpeaker) return foundSpeaker.name;

  const foundServicePerson = servicePeopleOptions.find((x) => String(x.id) === String(id));
  return foundServicePerson ? foundServicePerson.name : "";
}


  function saveCurrentPlan() {
    const plan = {
      id: planId,
      date,
      templateId,
      templateName: TEMPLATES[templateId]?.name || template.name,
      assignments,
      updatedAt: new Date().toISOString(),
    };

    const without = plans.filter((p) => p.id !== planId);
    const next = [plan, ...without].sort((a, b) => (a.date < b.date ? 1 : -1));
    setPlans(next);
    savePlans(next);
    alert("Saved service plan!");
  }

  function loadPlan(plan) {
    setTemplateId(plan.templateId);
    setDate(plan.date);
    setAssignments(plan.assignments || {});
  }

  function deletePlan(plan) {
    if (!confirm("Delete this plan?")) return;
    const next = plans.filter((p) => p.id !== plan.id);
    setPlans(next);
    savePlans(next);
  }

  function copyMostRecentSameType() {
    const same = plans
      .filter((p) => p.templateId === templateId)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    if (same.length === 0) {
      alert("No saved plans for this service type yet.");
      return;
    }
    setAssignments(same[0].assignments || {});
  }

  const unfilledCount = template.slots.filter((s) => !assignments[s.id]).length;

  return (
    <div className="card">
      <h2 style={{ marginTop: 0, color: "#1e3a5f" }}>Arrange Services</h2>
      <p style={{ marginTop: 0, color: "#666" }}>
        Pick a service type + date, then assign people to each role.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#666", fontWeight: 600 }}>Service Type</span>
          <select className="input-field" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="WED_NIGHT">Wednesday Night</option>
            <option value="SUN_MORNING">Sunday Morning</option>
            <option value="SUN_AFTERNOON">Sunday Afternoon (same as Wed)</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#666", fontWeight: 600 }}>Date</span>
          <input className="input-field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <button className="btn-primary" onClick={saveCurrentPlan}>💾 Save</button>
        <button className="btn-secondary" onClick={copyMostRecentSameType}>📋 Copy Most Recent</button>

        <div style={{ marginLeft: "auto", color: "#666", fontWeight: 600 }}>
          Unfilled slots: <span style={{ color: unfilledCount ? "#dc2626" : "#065f46" }}>{unfilledCount}</span>
        </div>
      </div>

            {/* Service People manager */}
      <div style={{ marginBottom: 16, padding: 12, border: "1px solid #e5e7eb", borderRadius: 12, background: "white" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
  <div style={{ fontWeight: 800, color: "#1e3a5f" }}>Service People</div>
  <button
    type="button"
    onClick={addServicePerson}
    className="btn-secondary"
    title="Add person"
    style={{ fontSize: 18, padding: "6px 12px", lineHeight: 1 }}
  >
    +
  </button>
</div>


        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>

        </div>

        {servicePeopleOptions.length === 0 ? (
          <div style={{ marginTop: 10, color: "#666" }}>
            No Service People yet — add some names above.
          </div>
        ) : (
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {servicePeopleOptions.map((p) => (
              <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 10px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#f8f6f3" }}>
                <span style={{ fontWeight: 700, color: "#1e3a5f" }}>{p.name}</span>
                <button
                  type="button"
                  onClick={() => removeServicePerson(p.id)}
                  style={{ border: "none", background: "none", cursor: "pointer", color: "#dc2626", fontWeight: 900 }}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {speakerOptions.length === 0 && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412" }}>
            Note: Teacher + Communion dropdowns pull from the <strong>Speakers</strong> list. Add speakers in the Speakers tab if you want those filled.
          </div>
        )}
      </div>

      {/* Slots */}
      <div style={{ display: "grid", gap: 12 }}>
        {template.slots.map((slot) => {
          const useSpeakers = isSpeakerSlot(slot.id);
          const options = useSpeakers ? speakerOptions : servicePeopleOptions;

          return (
            <div key={slot.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 700, color: "#1e3a5f", marginBottom: 8 }}>
                {slot.label}
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <select
                  className="input-field"
                  style={{ flex: "1 1 240px" }}
                  value={assignments[slot.id] || ""}
                  onChange={(e) => setSlot(slot.id, e.target.value)}
                  disabled={options.length === 0}
                >
                  <option value="">
                    {options.length === 0 ? "— No people available —" : "— Unassigned —"}
                  </option>

                  {options.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                <button className="btn-secondary" type="button" onClick={() => clearSlot(slot.id)}>Clear</button>
              </div>

              <div style={{ marginTop: 8, color: "#666", fontSize: 13 }}>
                {assignments[slot.id] ? (
                  <>Assigned: <strong>{speakerNameById(assignments[slot.id])}</strong></>
                ) : (
                  <>Not assigned</>
                )}
              </div>

              {!useSpeakers && options.length === 0 && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#9a3412" }}>
                  Add names in <strong>Service People</strong> above to fill this slot.
                </div>
              )}

              {useSpeakers && speakerOptions.length === 0 && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#9a3412" }}>
                  This slot pulls from <strong>Speakers</strong>. Add speakers in the Speakers tab.
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 10, color: "#1e3a5f" }}>Saved Plans</h3>
        {plans.length === 0 ? (
          <div style={{ color: "#666" }}>No saved plans yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {plans.map((p) => (
              <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: "#1e3a5f" }}>{p.templateName} — {p.date}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    Updated: {new Date(p.updatedAt).toLocaleString()}
                  </div>
                </div>
                <button className="btn-secondary" onClick={() => loadPlan(p)}>Load</button>
                <button className="btn-secondary" style={{ color: "#dc2626", borderColor: "#dc2626" }} onClick={() => deletePlan(p)}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
