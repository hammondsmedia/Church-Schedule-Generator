// src/utils/scheduleLogic.js

/**
 * Calculates all days for a given month view (including padding days)
 */
export const getMonthDays = (date) => {
  const y = date.getFullYear(), m = date.getMonth();
  const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
  const d = [];
  for (let i = first.getDay() - 1; i >= 0; i--) d.push({ date: new Date(y, m, -i), isCurrentMonth: false });
  for (let i = 1; i <= last.getDate(); i++) d.push({ date: new Date(y, m, i), isCurrentMonth: true });
  while (d.length < 42) d.push({ date: new Date(y, m + 1, d.length - last.getDate() - (first.getDay() - 1)), isCurrentMonth: false });
  return d;
};

/**
 * Checks if a specific speaker is available for a date and service type
 */
export const isSpeakerAvailable = (speaker, date, type) => {
  if (!speaker.availability[type]) return false;
  const ds = date.toISOString().split('T')[0];
  for (const b of (speaker.blockOffDates || [])) if (ds >= b.start && ds <= b.end) return false;
  return true;
};

/**
 * Seeded shuffle to ensure consistent results for the same month/seed
 */
export const shuffleArray = (array, seed) => {
  const shuffled = [...array];
  let currentIndex = shuffled.length;
  const seededRandom = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  while (currentIndex > 0) {
    const randomIndex = Math.floor(seededRandom() * currentIndex);
    currentIndex--;
    [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
  }
  return shuffled;
};

/**
 * The core engine that builds the schedule based on rules and priorities
 */
export const generateScheduleLogic = (selectedMonth, speakers, serviceSettings, existingSchedule) => {
  const days = getMonthDays(selectedMonth);
  const newSchedule = { ...existingSchedule };
  const seed = selectedMonth.getFullYear() * 12 + selectedMonth.getMonth();
  const counts = {}; 
  
  speakers.forEach(s => counts[s.id] = { sundayMorning: 0, sundayEvening: 0, wednesdayEvening: 0, communion: 0 });
  
  const slots = { sundayMorning: [], sundayEvening: [], wednesdayEvening: [], communion: [] };
  let sc = 0;

  days.forEach(({ date, isCurrentMonth }) => {
    if (!isCurrentMonth) return;
    const dw = date.getDay(), dk = date.toISOString().split('T')[0];
    if (dw === 0) {
      sc++;
      if (serviceSettings.sundayMorning.enabled) slots.sundayMorning.push({ dk, date, week: sc });
      if (serviceSettings.sundayEvening.enabled) slots.sundayEvening.push({ dk, date, week: sc });
      if (serviceSettings.communion.enabled && serviceSettings.sundayMorning.enabled) slots.communion.push({ dk, date, week: sc });
    }
    if (dw === 3 && serviceSettings.wednesdayEvening.enabled) slots.wednesdayEvening.push({ dk, date, week: Math.ceil(date.getDate() / 7) });
  });

  const getAvailable = (d, type, exId = null) => {
    let av = speakers.filter(s => isSpeakerAvailable(s, d, type) && s.id !== exId);
    const p1 = av.filter(s => s.priority === 1), p2 = av.filter(s => s.priority === 2), def = av.filter(s => !s.priority);
    const off = type === 'sundayMorning' ? 0 : type === 'sundayEvening' ? 1000 : type === 'wednesdayEvening' ? 2000 : 3000;
    const sort = (a, b) => counts[a.id][type] - counts[b.id][type];
    const sortedDefault = shuffleArray(def, seed + off).sort(sort);
    return [...p1.sort(sort), ...p2.sort(sort), ...sortedDefault];
  };

  const applyRepeat = (type, list) => {
    speakers.forEach(s => {
      (s.repeatRules || []).filter(r => r.serviceType === type).forEach(r => {
        list.forEach(sl => {
          const sk = sl.dk + '-' + type;
          if (!newSchedule[sk] && isSpeakerAvailable(s, sl.date, type)) {
            if ((r.pattern === 'everyOther' && ((r.startWeek === 'odd') ? (sl.week % 2 !== 0) : (sl.week % 2 === 0))) || (r.pattern === 'nthWeek' && sl.week === r.nthWeek)) {
              newSchedule[sk] = { speakerId: s.id, date: sl.dk, serviceType: type }; 
              counts[s.id][type]++;
            }
          }
        });
      });
    });
  };

  ['sundayMorning', 'sundayEvening', 'wednesdayEvening'].forEach(t => applyRepeat(t, slots[t]));
  
  const fill = (t, list, ex) => list.forEach(sl => {
    const sk = sl.dk + '-' + t;
    if (!newSchedule[sk]) {
      const sel = getAvailable(sl.date, t, ex ? newSchedule[sl.dk + '-' + ex]?.speakerId : null)[0];
      if (sel) { 
        newSchedule[sk] = { speakerId: sel.id, date: sl.dk, serviceType: t }; 
        counts[sel.id][t]++; 
      }
    }
  });

  fill('sundayMorning', slots.sundayMorning); 
  fill('communion', slots.communion, 'sundayMorning'); 
  fill('sundayEvening', slots.sundayEvening); 
  fill('wednesdayEvening', slots.wednesdayEvening);
  
  return newSchedule;
};
