// src/utils/exportUtils.js

/**
 * Exports the current month's schedule to a CSV file.
 */
export const exportToCSV = (selectedMonth, schedule, speakers, serviceSettings, getSpeakerName) => {
  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  
  // Headers
  const headers = [
    "Date", 
    "Sunday Morning Speaker", "Sunday Morning Note",
    "Communion Speaker", "Communion Note",
    "Sunday Evening Speaker", "Sunday Evening Note",
    "Wednesday Evening Speaker", "Wednesday Evening Note"
  ];
  
  const rows = [headers];
  const lastDay = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const sm = schedule[`${dateStr}-sundayMorning`];
    const c = schedule[`${dateStr}-communion`];
    const se = schedule[`${dateStr}-sundayEvening`];
    const we = schedule[`${dateStr}-wednesdayEvening`];

    const row = [
      dateStr,
      sm ? getSpeakerName(sm.speakerId) : "", sm?.note || "",
      c ? getSpeakerName(c.speakerId) : "", c?.note || "",
      se ? getSpeakerName(se.speakerId) : "", se?.note || "",
      we ? getSpeakerName(we.speakerId) : "", we?.note || ""
    ];
    rows.push(row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`));
  }

  const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Schedule_${year}_${month + 1}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Parses a CSV file and updates the schedule state.
 * Matches speaker names to their IDs from the database.
 */
export const importFromCSV = async (file, speakers, existingSchedule) => {
  const text = await file.text();
  const rows = text.split('\n').map(row => row.split(',').map(cell => cell.replace(/^"|"$/g, '').trim()));
  const newSchedule = { ...existingSchedule };
  
  // Create name-to-id map for faster lookup
  const speakerMap = {};
  speakers.forEach(s => {
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    speakerMap[fullName] = s.id;
  });

  const headers = rows[0];
  const dataRows = rows.slice(1);

  dataRows.forEach(row => {
    const dateStr = row[0];
    if (!dateStr || dateStr === "Date") return;

    const services = [
      { speaker: row[1], note: row[2], type: 'sundayMorning' },
      { speaker: row[3], note: row[4], type: 'communion' },
      { speaker: row[5], note: row[6], type: 'sundayEvening' },
      { speaker: row[7], note: row[8], type: 'wednesdayEvening' }
    ];

    services.forEach(svc => {
      const speakerId = speakerMap[svc.speaker.toLowerCase()];
      if (speakerId) {
        newSchedule[`${dateStr}-${svc.type}`] = {
          speakerId,
          date: dateStr,
          serviceType: svc.type,
          note: svc.note || ""
        };
      }
    });
  });

  return newSchedule;
};

/**
 * Restored PDF Export logic.
 */
export const exportToPDF = (selectedMonth, schedule, serviceSettings, getMonthDays, getSpeakerName) => {
    const printWindow = window.open('', '_blank');
    const monthName = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const days = getMonthDays(selectedMonth);
    const sundays = days.filter(({ date, isCurrentMonth }) => isCurrentMonth && date.getDay() === 0);
    const wednesdays = days.filter(({ date, isCurrentMonth }) => isCurrentMonth && date.getDay() === 3);
    
    let sundaysHTML = '';
    sundays.forEach(({ date }) => {
      const dk = date.toISOString().split('T')[0];
      const sm = schedule[dk + '-sundayMorning'], c = schedule[dk + '-communion'], se = schedule[dk + '-sundayEvening'];
      let sv = '';
      if (serviceSettings.sundayMorning.enabled) sv += `<div><strong>${serviceSettings.sundayMorning.time}:</strong> ${sm ? getSpeakerName(sm.speakerId) : '—'}</div>`;
      if (serviceSettings.communion.enabled) sv += `<div><strong>Communion:</strong> ${c ? getSpeakerName(c.speakerId) : '—'}</div>`;
      if (serviceSettings.sundayEvening.enabled) sv += `<div><strong>${serviceSettings.sundayEvening.time}:</strong> ${se ? getSpeakerName(se.speakerId) : '—'}</div>`;
      sundaysHTML += `<div style="padding:10px;border-bottom:1px solid #eee;"><strong>${date.getDate()}</strong>${sv}</div>`;
    });

    let wedsHTML = '';
    wednesdays.forEach(({ date }) => {
        const dk = date.toISOString().split('T')[0], w = schedule[dk + '-wednesdayEvening'];
        wedsHTML += `<div style="padding:10px;border-bottom:1px solid #eee;"><strong>${date.getDate()}</strong><div><strong>${serviceSettings.wednesdayEvening.time}:</strong> ${w ? getSpeakerName(w.speakerId) : '—'}</div></div>`;
    });

    printWindow.document.write(`<html><head><title>Schedule</title><style>body{font-family:sans-serif;padding:20px;} .grid{display:flex;gap:40px;}</style></head><body><h1>${monthName} Schedule</h1><div class="grid"><div><h3>Sundays</h3>${sundaysHTML}</div><div><h3>Wednesdays</h3>${wedsHTML}</div></div><script>window.print();</script></body></html>`);
    printWindow.document.close();
};
