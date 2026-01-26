import React, { useMemo, useState } from "react";

/**
 * ServicesTab
 * - Uses existing "speakers" list from App.jsx (same people you already manage)
 * - Lets you assign people to Wednesday/Sunday service roles
 * - Auto-fills Teacher / Communion from the Calendar schedule when available
 * - Saves plans in localStorage per date + service type (no Firebase changes yet)
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
      { id: "teacher", label: "Teacher (auto from Calendar if set)" },
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
      { id: "communion", label: "Communion (auto from Calendar if set)" },
      { id: "song_after_communion", label: "Song after Communion" },
      { id: "teacher", label: "Teacher (auto from Calendar if set)" },
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
    // same layout as Wed Night
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

/**
 * IMPORTANT:
 * This component now expects `schedule` from App.jsx
 * because the Calendar schedule lives there.
 */
export default function ServicesTab({ servicePeople, setServicePeople, speakers, schedule }) {
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
  const [showSavedPlans, setShowSavedPlans] = useState(false);

  const template = useMemo(() => {
    if (templateId === "SUN_AFTERNOON") return TEMPLATES.WED_NIGHT;
    return TEMPLATES[templateId];
  }, [templateId]);

  const planId = useMemo(() => `${date}__${templateId}`, [date, templateId]);

  const currentPlan = useMemo(() => {
    return plans.find((p) => p.id === planId) || null;
  }, [plans, planId]);

  const [assignments, setAssignments] = useState(() => currentPlan?.assignments || {});

  // --- Calendar auto-fill helpers ---
  function calendarKeyForSlot(dateISO, templateId, slotId) {
    // Which Calendar serviceType should populate which Services slot
    if (slotId === "teacher") {
      if (templateId === "WED_NIGHT") return `${dateISO}-wednesdayEvening`;
      if (templateId === "SUN_MORNING") return `${dateISO}-sundayMorning`;
      if (templateId === "SUN_AFTERNOON") return `${dateISO}-sundayEvening`;
    }

    if (slotId === "communion") {
      if (templateId === "SUN_MORNING") return `${dateISO}-communion`;
    }

    return null;
  }

  function scheduledSpeakerIdFromCalendar(dateISO, templateId, slotId) {
    const key = calendarKeyForSlot(dateISO, templateId, slotId);
    if (!key) return null;
    const entry = schedule?.[key];
    return entry?.speakerId ?? null;
  }

  function isValidSpeakerId(id) {
    return speakerOptions.some((x) => String(x.id) === String(id));
  }

  // Keep assignments updated when user switches date/template
  // + Auto-fill Teacher / Communion from Calendar (only if blank)
  React.useEffect(() => {
    const base = currentPlan?.assignments || {};

    setAssignments(() => {
      const next = { ...base };

      // Auto-fill teacher / communion only if empty
      const teacherFromCal = scheduledSpeakerIdFromCalendar(date, templateId, "teacher");
      if (!next.teacher && teacherFromCal && isValidSpeakerId(teacherFromCal)) {
        next.teacher = String(teacherFromCal);
      }

      const communionFromCal = scheduledSpeakerIdFromCalendar(date, templateId, "communion");
      if (!next.communion && communionFromCal && isValidSpeakerId(communionFromCal)) {
        next.communion = String(communionFromCal);
      }

      return next;
    });
  }, [planId, currentPlan, date, templateId, schedule, speakerOptions]);

  function isSpeakerSlot(slotId) {
    return slotId === "teacher" || slotId === "communion";
  }

  function setSlot(slotId, personId) {
    setAssignments((prev) => ({ ...prev, [slotId]: personId }));
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
      <style>{`
        .services-controls {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: flex-end;
          margin-bottom: 12px;
        }

        .services-block {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 12px;
          background: white;
        }

        .slots-grid {
          display: grid;
          gap: 8px;
          grid-template-columns: 1fr;
        }

        @media (min-width: 860px) {
          .slots-grid { grid-template-columns: 1fr 1fr; }
        }

        @media (min-width: 1200px) {
          .slots-grid { grid-template-columns: 1fr 1fr 1fr; }
        }

        .slot-row {
          display: grid;
          grid-template-columns: 1fr minmax(180px, 240px);
          gap: 8px;
          align-items: center;
          padding: 8px;
          border: 1px solid #eef2f7;
          border-radius: 10px;
          background: #fbfbfc;
        }

        .slot-label {
          font-weight: 800;
          color: #1e3a5f;
          font-size: 13px;
          line-height: 1.2;
        }

        .slot-select {
          padding: 8px !important;
          height: 36px;
        }

        .services-footer {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          margin-top: 10px;
        }

        .pill {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          background: #f8f6f3;
        }
      `}</style>

      <h2 style={{ marginTop: 0, color: "#1e3a5f" }}>Arrange Services</h2>
      <p style={{ marginTop: 0, color: "#666" }}>
        Pick a service type + date, then assign people to each role.
      </p>

      {/* Controls */}
      <div className="services-controls">
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

        <button className="btn-primary" type="button" onClick={saveCurrentPlan}>💾 Save</button>
        <button className="btn-secondary" type="button" onClick={copyMostRecentSameType}>📋 Copy Most Recent</button>

        <div style={{ marginLeft: "auto", color: "#666", fontWeight: 800 }}>
          Unfilled:{" "}
          <span style={{ color: unfilledCount ? "#dc2626" : "#065f46" }}>
            {unfilledCount}
          </span>
        </div>
      </div>

      {/* Service People manager */}
      <div className="services-block" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontWeight: 900, color: "#1e3a5f" }}>Service People</div>
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

        {servicePeopleOptions.length === 0 ? (
          <div style={{ color: "#666" }}>
            No Service People yet — add some names above.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {servicePeopleOptions.map((p) => (
              <div key={p.id} className="pill">
                <span style={{ fontWeight: 800, color: "#1e3a5f" }}>{p.name}</span>
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

      {/* Assignments - compact single block */}
      <div className="services-block">
        <div className="slots-grid">
          {template.slots.map((slot) => {
            const useSpeakers = isSpeakerSlot(slot.id);
            const options = useSpeakers ? speakerOptions : servicePeopleOptions;
            const disabled = options.length === 0;

            return (
              <div key={slot.id} className="slot-row">
                <div className="slot-label" title={slot.label}>
                  {slot.label}
                </div>

                <select
                  className="input-field slot-select"
                  value={assignments[slot.id] || ""}
                  onChange={(e) => setSlot(slot.id, e.target.value)}
                  disabled={disabled}
                >
                  <option value="">
                    {disabled ? "— None —" : "—"}
                  </option>
                  {options.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        <div className="services-footer">
          <div style={{ color: "#666", fontWeight: 800 }}>
            Unfilled slots:{" "}
            <span style={{ color: unfilledCount ? "#dc2626" : "#065f46" }}>
              {unfilledCount}
            </span>
          </div>
          <div style={{ color: "#666", fontSize: 12 }}>
            Teacher + Communion auto-fill from <strong>Calendar</strong> when available.
          </div>
        </div>
      </div>

      {/* Saved Plans toggle (reduces scrolling) */}
      <div style={{ marginTop: 14 }}>
        <button
          className="btn-secondary"
          type="button"
          onClick={() => setShowSavedPlans((v) => !v)}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {showSavedPlans ? "▼ Hide Saved Plans" : "▶ Show Saved Plans"}
        </button>

        {showSavedPlans && (
          <div style={{ marginTop: 12 }}>
            <h3 style={{ marginBottom: 10, color: "#1e3a5f" }}>Saved Plans</h3>
            {plans.length === 0 ? (
              <div style={{ color: "#666" }}>No saved plans yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {plans.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: 12,
                      background: "white",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, color: "#1e3a5f" }}>
                        {p.templateName} — {p.date}
                      </div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        Updated: {new Date(p.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <button className="btn-secondary" type="button" onClick={() => loadPlan(p)}>Load</button>
                    <button
                      className="btn-secondary"
                      type="button"
                      style={{ color: "#dc2626", borderColor: "#dc2626" }}
                      onClick={() => deletePlan(p)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
