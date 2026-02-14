// src/utils/exportUtils.js

export const exportToCSV = (selectedMonth, schedule, members, serviceSettings, getSpeakerName) => {
  const year = selectedMonth.getFullYear(), month = selectedMonth.getMonth();
  const headers = ["Date", "Sunday Morning Speaker", "Sunday Morning Note", "Communion Speaker", "Communion Note", "Sunday Evening Speaker", "Sunday Evening Note", "Wednesday Evening Speaker", "Wednesday Evening Note"];
  const rows = [headers];
  const lastDay = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const row = [dateStr, 
      getSpeakerName(schedule[`${dateStr}-sundayMorning`]?.speakerId), schedule[`${dateStr}-sundayMorning`]?.note || "",
      getSpeakerName(schedule[`${dateStr}-communion`]?.speakerId), schedule[`${dateStr}-communion`]?.note || "",
      getSpeakerName(schedule[`${dateStr}-sundayEvening`]?.speakerId), schedule[`${dateStr}-sundayEvening`]?.note || "",
      getSpeakerName(schedule[`${dateStr}-wednesdayEvening`]?.speakerId), schedule[`${dateStr}-wednesdayEvening`]?.note || ""
    ];
    rows.push(row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`));
  }

  const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", `Schedule_${year}_${month + 1}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const importFromCSV = async (file, members, existingSchedule) => {
  const text = await file.text();
  const rows = text.split('\n').map(row => row.split(',').map(cell => cell.replace(/^"|"$/g, '').trim()));
  const newSchedule = { ...existingSchedule };
  const memberMap = {};
  members.forEach(m => { memberMap[`${m.firstName} ${m.lastName}`.toLowerCase()] = m.id; });

  rows.slice(1).forEach(row => {
    const dateStr = row[0];
    if (!dateStr || dateStr === "Date") return;
    const services = [
      { speaker: row[1], note: row[2], type: 'sundayMorning' },
      { speaker: row[3], note: row[4], type: 'communion' },
      { speaker: row[5], note: row[6], type: 'sundayEvening' },
      { speaker: row[7], note: row[8], type: 'wednesdayEvening' }
    ];
    services.forEach(svc => {
      const memberId = memberMap[svc.speaker.toLowerCase()];
      if (memberId) newSchedule[`${dateStr}-${svc.type}`] = { speakerId: memberId, date: dateStr, serviceType: svc.type, note: svc.note || "" };
    });
  });
  return newSchedule;
};

export const exportToPDF = (selectedMonth, schedule, serviceSettings, getMonthDays, getSpeakerName) => {
    const printWindow = window.open('', '_blank');
    const monthName = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const days = getMonthDays(selectedMonth);
    const sundays = days.filter(({ date, isCurrentMonth }) => isCurrentMonth && date.getDay() === 0);
    const wednesdays = days.filter(({ date, isCurrentMonth }) => isCurrentMonth && date.getDay() === 3);
    
    let sundaysHTML = '';
    sundays.forEach(({ date }) => {
      const dk = date.toISOString().split('T')[0];
      const sv = `
        <div><strong>${serviceSettings.sundayMorning.time}:</strong> ${getSpeakerName(schedule[dk + '-sundayMorning']?.speakerId) || '—'}</div>
        <div><strong>Communion:</strong> ${getSpeakerName(schedule[dk + '-communion']?.speakerId) || '—'}</div>
        <div><strong>${serviceSettings.sundayEvening.time}:</strong> ${getSpeakerName(schedule[dk + '-sundayEvening']?.speakerId) || '—'}</div>
      `;
      sundaysHTML += `<div style="padding:10px;border-bottom:1px solid #eee;"><strong>${date.getDate()}</strong>${sv}</div>`;
    });

    let wedsHTML = '';
    wednesdays.forEach(({ date }) => {
        const dk = date.toISOString().split('T')[0];
        wedsHTML += `<div style="padding:10px;border-bottom:1px solid #eee;"><strong>${date.getDate()}</strong><div><strong>${serviceSettings.wednesdayEvening.time}:</strong> ${getSpeakerName(schedule[dk + '-wednesdayEvening']?.speakerId) || '—'}</div></div>`;
    });

    printWindow.document.write(`<html><head><title>Schedule</title><style>body{font-family:sans-serif;padding:20px;} .grid{display:flex;gap:40px;} h3{color:#1e3a5f;}</style></head><body><h1>${monthName} Schedule</h1><div class="grid"><div><h3>Sundays</h3>${sundaysHTML}</div><div><h3>Wednesdays</h3>${wedsHTML}</div></div><script>window.print();</script></body></html>`);
    printWindow.document.close();
};
